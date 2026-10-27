#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
export const projectRoot = path.resolve(path.dirname(scriptPath), '..')
const sha256 = content => createHash('sha256').update(content).digest('hex')
const canonicalText = data => Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
const isWithin = (root, candidate) => {
  const relative = path.relative(root, candidate)
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep))
}
const samePath = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
const errorCode = error => error?.code || error?.message || String(error)

function projectFile(root, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) || /^[a-z]:/i.test(relative)) throw new Error('Invalid relative project path')
  const absolute = path.resolve(root, relative)
  if (!isWithin(root, absolute)) throw new Error('Project path escapes workspace')
  const real = fs.realpathSync(absolute)
  if (!isWithin(fs.realpathSync(root), real) || !fs.statSync(real).isFile()) throw new Error('Project file escapes workspace or is not a file')
  return absolute
}

function localMarkdownLinks(file, root) {
  const text = fs.readFileSync(file, 'utf8')
  const issues = []
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const href = match[1].replace(/^<|>$/g, '').split('#')[0]
    if (!href || /^[a-z][a-z\d+.-]*:/i.test(href)) continue
    const target = path.resolve(path.dirname(file), href)
    if (!isWithin(root, target) || !fs.existsSync(target)) issues.push('LOCAL_REF_INVALID: ' + href)
  }
  return issues
}

function inspectProject(lock, root) {
  const issues = []
  let bytes = 0, lineEndingVariants = 0
  const names = new Set()
  const known = new Set()
  if (!/^[a-f\d]{40}$/.test(lock.ecc?.commit || '') || !Array.isArray(lock.ecc?.files) || lock.ecc.textNormalization !== 'crlf-to-lf') {
    return { status: 'fail', files: 0, skills: 0, bytes: 0, issues: ['ECC_LOCK_INVALID'] }
  }
  for (const entry of lock.ecc.files) {
    if (!entry || typeof entry !== 'object') { issues.push('ECC_LOCK_ENTRY_INVALID'); continue }
    try {
      if (!/^\.agents\/skills\/ecc-[a-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(entry.path || '') ||
          !/^[a-f\d]{64}$/.test(entry.sha256 || '') || !/^[a-f\d]{64}$/.test(entry.canonicalSha256 || '') ||
          !Number.isSafeInteger(entry.canonicalBytes) || entry.canonicalBytes < 1 ||
          known.has(entry.path)) throw new Error('ECC file entry invalid or duplicated')
      known.add(entry.path)
      const file = projectFile(root, entry.path)
      const data = fs.readFileSync(file)
      bytes += data.length
      const normalized = canonicalText(data)
      if (sha256(normalized) !== entry.canonicalSha256 || normalized.length !== entry.canonicalBytes) issues.push('ECC_HASH_MISMATCH: ' + entry.path)
      else if (sha256(data) !== entry.sha256) lineEndingVariants++
      if (entry.path.endsWith('.md')) issues.push(...localMarkdownLinks(file, root).map(issue => entry.path + ': ' + issue))
      if (entry.name) {
        if (names.has(entry.name) || !/^ecc-[a-z0-9-]+$/.test(entry.name)) issues.push('ECC_NAME_INVALID: ' + entry.name)
        names.add(entry.name)
        const text = data.toString('utf8')
        const front = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1] || ''
        const name = /^name:\s*([^\r\n]+)$/m.exec(front)?.[1]?.trim()
        if (name !== entry.name || path.basename(path.dirname(file)) !== entry.name || !/^description:\s*\S/m.test(front)) {
          issues.push('ECC_FRONTMATTER_INVALID: ' + entry.path)
        }
      }
    } catch (error) {
      issues.push('ECC_FILE_INVALID: ' + entry.path + ' (' + errorCode(error) + ')')
    }
  }
  if (names.size !== 6) issues.push('ECC_EXPECTED_SIX_SKILLS')
  // Detect untracked additions inside this deliberately small installation.
  const skillsRoot = path.join(root, '.agents', 'skills')
  try {
    for (const dir of fs.readdirSync(skillsRoot, { withFileTypes: true }).filter(item => item.name.startsWith('ecc-'))) {
      const directory = path.join(skillsRoot, dir.name)
      if (!dir.isDirectory() || dir.isSymbolicLink()) { issues.push('ECC_DIRECTORY_INVALID: ' + dir.name); continue }
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const relative = ['.agents', 'skills', dir.name, entry.name].join('/')
        if (!entry.isFile() || !known.has(relative)) issues.push('ECC_UNEXPECTED_FILE: ' + relative)
      }
    }
  } catch (error) { issues.push('ECC_DIRECTORY_UNREADABLE: ' + errorCode(error)) }
  return { status: issues.length ? 'fail' : 'pass', files: known.size, skills: names.size, bytes, lineEndingVariants, issues }
}

function gitRead(target, args) {
  return execFileSync('git', ['-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', '-C', target, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000, maxBuffer: 256 * 1024,
    windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).trim()
}

function treeSize(root) {
  let bytes = 0, files = 0, complete = true
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (files >= 10000) { complete = false; return }
      const target = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) visit(target)
      else if (entry.isFile()) { bytes += fs.statSync(target).size; files++ }
    }
  }
  visit(root)
  return { bytes, files, complete }
}

export function inspectImg2threejs(config, home = os.homedir()) {
  const issues = [], warnings = []
  const expectedHost = ['.codex', 'skills', 'img2threejs']
  const expectedRelease = ['.img2threejs', 'releases', config?.commit, 'img2threejs']
  if (!/^[a-f\d]{40}$/.test(config?.commit || '') ||
      !/^[a-f\d]{64}$/.test(config?.skillSha256 || '') || !/^[a-f\d]{64}$/.test(config?.skillCanonicalSha256 || '') ||
      config.skillTextNormalization !== 'crlf-to-lf' ||
      JSON.stringify(config.hostPathSegments) !== JSON.stringify(expectedHost) ||
      JSON.stringify(config.releasePathSegments) !== JSON.stringify(expectedRelease) ||
      config.repository !== 'https://github.com/img2threejs/img2threejs.git') {
    return { status: 'fail', issues: ['IMG_LOCK_INVALID'], release: { verified: false } }
  }
  const linkPath = path.join(home, ...expectedHost)
  const target = path.join(home, ...expectedRelease)
  const link = { path: linkPath, exists: false, managed: false }
  const release = { path: target, exists: false, verified: false }
  try {
    const stat = fs.lstatSync(linkPath)
    link.exists = true
    if (!stat.isSymbolicLink()) issues.push('IMG_LINK_UNMANAGED')
    else {
      link.target = fs.realpathSync(linkPath)
      link.managed = fs.existsSync(target) && samePath(link.target, fs.realpathSync(target))
      if (!link.managed) issues.push('IMG_LINK_TARGET_MISMATCH')
    }
  } catch (error) {
    issues.push(error.code === 'ENOENT' && !link.exists ? 'IMG_LINK_MISSING' : 'IMG_LINK_INVALID: ' + errorCode(error))
  }
  try {
    release.exists = fs.existsSync(target)
    if (!release.exists) throw new Error('release missing')
    const stat = fs.lstatSync(target)
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('release must be a real directory')
    release.commit = gitRead(target, ['rev-parse', 'HEAD'])
    const origin = gitRead(target, ['remote', 'get-url', 'origin'])
    release.origin = origin === config.repository ? origin : '[unexpected origin redacted]'
    release.clean = gitRead(target, ['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=all']) === ''
    const skillData = fs.readFileSync(path.join(target, 'SKILL.md'))
    release.skillHash = sha256(skillData)
    release.skillCanonicalHash = sha256(canonicalText(skillData))
    release.skillHashMode = config.skillTextNormalization
    release.verified = release.commit === config.commit && origin === config.repository &&
      release.clean && release.skillCanonicalHash === config.skillCanonicalSha256
    if (!release.verified) issues.push('IMG_RELEASE_INTEGRITY_MISMATCH')
    const size = treeSize(target)
    release.bytesIncludingGit = size.bytes
    release.fileCount = size.files
    release.sizeComplete = size.complete
    if (!size.complete) warnings.push('IMG_SIZE_SCAN_LIMIT: file count exceeded 10000; bytes are partial')
    if (size.bytes > config.recommendedMaxBytes) warnings.push('IMG_DISK_BUDGET: checkout exceeds recommended bytes')
  } catch (error) {
    issues.push('IMG_RELEASE_INVALID: ' + errorCode(error))
  }
  return { status: issues.length ? 'fail' : 'pass', link, release, issues, warnings }
}

export function runDoctor({ root = projectRoot, projectOnly = false, home = os.homedir() } = {}) {
  const report = { schemaVersion: 1, scope: projectOnly ? 'project-only' : 'project-and-authoring', status: 'fail' }
  let lock
  try {
    lock = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'skills-lock.json'), 'utf8'))
    if (lock.schemaVersion !== 1) throw new Error('Unsupported lock schema')
  } catch (error) {
    return { ...report, issues: ['LOCK_UNREADABLE: ' + errorCode(error)] }
  }
  report.ecc = inspectProject(lock, root)
  report.img2threejs = projectOnly
    ? { status: 'skipped', reason: 'CI/project-only: user authoring tool is not installed or verified by this run.' }
    : inspectImg2threejs(lock.img2threejs, home)
  const passed = report.ecc.status === 'pass' && (projectOnly || report.img2threejs.status === 'pass')
  report.status = passed ? (projectOnly ? 'project-pass' : 'pass') : 'fail'
  return report
}

function printReport(report, json) {
  if (json) { process.stdout.write(JSON.stringify(report, null, 2) + '\n'); return }
  process.stdout.write('Skills doctor: ' + report.status.toUpperCase() + ' [' + report.scope + ']\n')
  if (report.ecc) process.stdout.write('ECC: ' + report.ecc.status + ' — ' + report.ecc.skills + ' skills / ' + report.ecc.files + ' files / ' + report.ecc.bytes + ' bytes\n')
  if (report.img2threejs?.status === 'skipped') process.stdout.write('img2threejs: OMITIDO — ' + report.img2threejs.reason + '\n')
  else if (report.img2threejs) process.stdout.write('img2threejs: ' + report.img2threejs.status + ' — ' + (report.img2threejs.release?.bytesIncludingGit ?? 'unknown') + ' bytes including Git\n')
  for (const issue of [...(report.issues || []), ...(report.ecc?.issues || []), ...(report.img2threejs?.issues || [])]) process.stdout.write('FAIL: ' + issue + '\n')
  for (const warning of report.img2threejs?.warnings || []) process.stdout.write('WARN: ' + warning + '\n')
}

if (process.argv[1] && samePath(path.resolve(process.argv[1]), scriptPath)) {
  const args = process.argv.slice(2)
  const unknown = args.filter(arg => !['--project-only', '--json', '--help'].includes(arg))
  if (unknown.length) {
    process.stderr.write('Unknown option: ' + unknown.join(', ') + '\n')
    process.exitCode = 2
  } else if (args.includes('--help')) {
    process.stdout.write('Usage: node scripts/skills-doctor.mjs [--project-only] [--json]\nOffline integrity check. --project-only explicitly skips the user authoring tool.\n')
  } else {
    const report = runDoctor({ projectOnly: args.includes('--project-only') })
    printReport(report, args.includes('--json'))
    process.exitCode = report.status === 'fail' ? 1 : 0
  }
}

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lock = JSON.parse(fs.readFileSync(path.join(root, 'tools/hermes-skills-lock.json'), 'utf8'))
const issues = [], known = new Set()
let bytes = 0
if (lock.repository !== 'https://github.com/NousResearch/hermes-agent' || !/^[a-f0-9]{40}$/.test(lock.commit) || lock.scope !== 'project instructions only' || !Array.isArray(lock.files)) throw Error('Invalid Hermes skills lock')
for (const entry of lock.files) {
  try {
    if (!/^\.agents\/skills\/(creative-ideation|adversarial-ux-test|hermes-common)\/[A-Za-z0-9/_.-]+$/.test(entry.path) || entry.path.includes('..') || known.has(entry.path)) throw Error('Invalid or duplicate path')
    known.add(entry.path)
    const file = path.resolve(root, entry.path)
    const real = fs.realpathSync(file)
    const relative = path.relative(fs.realpathSync(root), real)
    if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.statSync(real).isFile()) throw Error('File outside project')
    const content = Buffer.from(fs.readFileSync(real, 'utf8').replace(/\r\n/g, '\n'))
    bytes += content.length
    const digest = createHash('sha256').update(content).digest('hex')
    if (digest !== entry.canonicalSha256 || content.length !== entry.canonicalBytes) throw Error('Reviewed content hash mismatch')
    if (entry.blobSha) {
      const blob = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex')
      if (blob !== entry.blobSha) throw Error('Upstream Git blob mismatch')
    }
  } catch (error) { issues.push(`${entry.path}: ${error.message}`) }
}
for (const skill of lock.skills) {
  try {
    const text = fs.readFileSync(path.join(root, skill.path), 'utf8')
    if (!new RegExp(`^name: ${skill.name}$`, 'm').test(text) || !new RegExp(`^version: ${skill.version.replaceAll('.', '\\.')}$`, 'm').test(text)) issues.push(`Skill metadata mismatch: ${skill.name}`)
  } catch { issues.push(`Missing skill: ${skill.name}`) }
}
const report = { status: issues.length ? 'fail' : 'pass', commit: lock.commit, skills: lock.skills.length, files: known.size, bytes, runtimeDependencies: 0, issues }
console.log(process.argv.includes('--json') ? JSON.stringify(report) : `Nous skills: ${report.status.toUpperCase()} — ${report.skills} skills / ${report.files} files / ${bytes} bytes; no runtime`)
if (issues.length) { for (const issue of issues) console.error(issue); process.exitCode = 1 }

import { defineConfig } from 'vite'
import type { Plugin, ResolvedConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { OutputChunk } from 'rollup'

/** Build one complete offline release from the mobility entry's actual graph. */
function mobilityOfflineRelease(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'mobility-offline-release', apply: 'build', enforce: 'post',
    configResolved(resolved) { config = resolved },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        if (!config.base.startsWith('/') || !config.base.endsWith('/') || config.base.startsWith('//')) this.error('Mobility offline requires an absolute same-origin base path ending in /.')
        const entry = Object.values(bundle).find((file): file is OutputChunk => file.type === 'chunk' && file.isEntry && Boolean(file.facadeModuleId?.replaceAll('\\', '/').endsWith('/movilidad/index.html')))
        const html = bundle['movilidad/index.html']
        if (!entry || !html || html.type !== 'asset' || typeof html.source !== 'string') this.error('Mobility entry and generated HTML are required for the offline release.')
        const graph = new Set<string>()
        const files = new Map<string, Buffer>()
        const visit = (name: string) => {
          if (graph.has(name)) return
          const file = bundle[name]
          if (!file) this.error(`Missing offline graph dependency: ${name}`)
          graph.add(name)
          const content = file.type === 'chunk' ? file.code : file.source
          files.set(name, typeof content === 'string' ? Buffer.from(content) : Buffer.from(content))
          if (file.type === 'chunk') {
            if (file.moduleIds.some(id => /(?:^|\/)node_modules\/three\//.test(id.replaceAll('\\', '/'))) || file.facadeModuleId?.replaceAll('\\', '/').endsWith('/src/App.tsx')) this.error('The mobility offline graph must not include Three.js or the tourism entry.')
            for (const imported of [...file.imports, ...file.dynamicImports, ...file.referencedFiles]) visit(imported)
            const metadata = (file as OutputChunk & { viteMetadata?: { importedCss: Set<string>; importedAssets: Set<string> } }).viteMetadata
            for (const imported of [...(metadata?.importedCss ?? []), ...(metadata?.importedAssets ?? [])]) visit(imported)
          }
          // Vite emits ?worker&url as an asset, not an import edge. Follow only
          // exact emitted filenames referenced by an already reachable text file.
          if (/\.(?:js|mjs|css)$/.test(name)) {
            const text = typeof content === 'string' ? content : Buffer.from(content).toString('utf8')
            for (const candidate of Object.keys(bundle)) {
              if (candidate !== name && /\.(?:js|mjs|css|woff2)$/.test(candidate) && text.includes(candidate)) visit(candidate)
            }
          }
        }
        visit(entry.fileName)
        if (![...graph].some(name => /maplibre-gl-worker[^/]*\.(?:js|mjs)$/.test(name))) this.error('The complete MapLibre worker must be present in the mobility offline graph.')
        files.set('movilidad/index.html', Buffer.from(html.source))
        for (const name of ['movilidad/icon.svg', 'movilidad/manifest.webmanifest', 'fonts/dm-sans-latin-variable.woff2', 'fonts/manrope-latin-variable.woff2']) files.set(name, readFileSync(resolve(config.publicDir, name)))
        const template = readFileSync(resolve(config.publicDir, 'movilidad/sw.js'), 'utf8')
        const marker = '/*__MOBILITY_PRECACHE__*/ null'
        if (template.split(marker).length !== 2) this.error('The service-worker template must contain exactly one build manifest marker.')
        const hash = createHash('sha256').update('valles-offline-release-1\0').update(config.base).update('\0').update(template)
        const sortedFiles = () => [...files.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        for (const [name, content] of sortedFiles()) hash.update(name).update('\0').update(content).update('\0')
        const version = hash.digest('hex').slice(0, 20)
        const meta = `<meta name="valles-offline-version" content="${version}" />`
        if (!html.source.includes('</head>')) this.error('Generated mobility HTML has no head for the offline version marker.')
        html.source = html.source.replace('</head>', `  ${meta}\n  </head>`)
        files.set('movilidad/index.html', Buffer.from(html.source))
        const totalBytes = [...files.values()].reduce((sum, content) => sum + content.byteLength, 0)
        const budgetBytes = 6_000_000
        if (totalBytes > budgetBytes) this.error(`Mobility offline release exceeds its 6 MB budget: ${totalBytes} bytes.`)
        const scopePath = `${config.base}movilidad/`
        const scopeKey = createHash('sha256').update(scopePath).digest('hex').slice(0, 8)
        const cachePrefix = `valles-mobility-${scopeKey}-`
        const manifest = {
          schemaVersion: 1, version, cachePrefix, cacheName: `${cachePrefix}${version}`,
          scopePath, shellPath: `${config.base}movilidad/index.html`, totalBytes, budgetBytes,
          legacyCacheNames: ['valles-mobility-v1'],
          files: sortedFiles().map(([name, content]) => ({
            path: `${config.base}${name}`, bytes: content.byteLength,
            integrity: `sha256-${createHash('sha256').update(content).digest('base64')}`,
          })),
        }
        this.emitFile({ type: 'asset', fileName: 'movilidad/sw.js', source: template.replace(marker, JSON.stringify(manifest)) })
        this.emitFile({ type: 'asset', fileName: 'movilidad/offline-manifest.json', source: `${JSON.stringify(manifest, null, 2)}\n` })
        this.info(`Mobility offline: ${manifest.files.length} files, ${totalBytes} bytes, release ${version}.`)
      },
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), mobilityOfflineRelease()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        movilidad: fileURLToPath(new URL('./movilidad/index.html', import.meta.url)),
      },
      output: {
        manualChunks: { three: ['three'], maplibre: ['maplibre-gl'] },
      },
    },
  },
})

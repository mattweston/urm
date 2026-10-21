import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

const here = import.meta.dirname

/**
 * In dev, the Foldkit host refuses requests that don't accept HTML (e.g.
 * `Accept: text/markdown`). This middleware makes markdown-preferring requests
 * look like they also accept HTML so the host forwards them to the SSR entry,
 * which then returns the Markdown representation directly. Production does the
 * same via the Cloudflare Worker; this keeps dev and prod behavior aligned.
 */
const markdownDevPlugin = (): Plugin => ({
  name: 'foldcn-markdown-dev',
  configureServer(server) {
    server.middlewares.use((nodeRequest, _nodeResponse, next) => {
      const accept = nodeRequest.headers.accept
      const headerValue = Array.isArray(accept) ? accept.join(', ') : accept
      if (headerValue !== undefined && /text\/markdown/i.test(headerValue)) {
        // Ensure the host's `acceptsHtml` check passes, but keep Markdown
        // weighted higher so the SSR entry still prefers it.
        if (!/text\/html/i.test(headerValue)) {
          const separator = headerValue !== '' ? ', ' : ''
          nodeRequest.headers.accept = `${headerValue}${separator}text/html;q=0.1`
        }
      }
      next()
    })
  },
})

export default defineConfig({
  plugins: [
    tailwindcss(),
    foldkit({
      devToolsMcpPort: 9988,
      ssr: { serverEntry: '/src/entry.server.ts' },
    }),
    markdownDevPlugin(),
  ],
  optimizeDeps: {
    entries: ['src/entry.ts'],
  },
  resolve: {
    alias: [
      {
        // Blocks compose components via the user-facing `@/components/ui`
        // alias (kept intact for shadcn installs). In the demo app these
        // resolve to the generated style shims — NOT a fixed tree — so a
        // block from the lyra tree composes lyra components and follows
        // live style switches like every other consumer.
        find: '@/components/ui',
        replacement: path.resolve(here, 'src/generated/registry/ui'),
      },
      {
        // Everything the demos render resolves through the shims: tree
        // modules import `@/lib/utils`, `@/lib/icons`, and `@/ui/*`; the
        // shims rebind on style switches so no fixed-tree code loads.
        find: '@/lib',
        replacement: path.resolve(here, 'src/generated/registry/lib'),
      },
      {
        find: '@/ui',
        replacement: path.resolve(here, 'src/generated/registry/ui'),
      },
      {
        // Fallback for any other `@/` import: the default resolved tree.
        find: '@/',
        replacement: `${path.resolve(here, '../registry/styles/default')}/`,
      },
    ],
  },
})

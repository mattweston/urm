import path from 'node:path'
import { defineConfig } from 'vitest/config'

const here = import.meta.dirname

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@/components/ui',
        replacement: path.resolve(here, '../registry/registry/default/ui'),
      },
      {
        find: '@/',
        replacement: `${path.resolve(here, '../registry/registry/default')}/`,
      },
    ],
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
})

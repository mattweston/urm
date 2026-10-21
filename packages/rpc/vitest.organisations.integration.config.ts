import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const package_root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    resolve: {
        alias: {
            "@urm/db/legacy-schema": resolve(
                package_root,
                "../db/src/legacy-schema"
            ),
        },
    },
    test: {
        include: ["integration/organisation-invitations.test.ts"],
        globals: true,
    },
})

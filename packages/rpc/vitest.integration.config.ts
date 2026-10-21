import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const package_root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    resolve: {
        alias: {
            "@urm/database/legacy-schema": resolve(
                package_root,
                "../db/src/legacy-schema"
            ),
        },
    },
    test: {
        include: ["integration/shop-domain-isolation.test.ts"],
        globals: true,
    },
})

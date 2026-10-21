import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["integration/demo-workspace-provisioning.test.ts"],
        globals: true,
    },
})

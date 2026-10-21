import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        include: ["integration/rpc-auth-session.test.ts"],
        globals: true,
    },
})

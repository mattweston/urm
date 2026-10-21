import { defaultExclude, defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        // Parked code lives in .todo/ and is not built or tested.
        include: ["src/**/*.test.ts", "test/**/*.test.ts"],
        exclude: [...defaultExclude, "**/.todo/**"],
    },
})

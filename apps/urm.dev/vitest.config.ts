import { defaultExclude, defineConfig } from "vitest/config"

export default defineConfig({
    plugins: [],
    test: {
        exclude: [...defaultExclude, "**/.todo/**"],
    },
})

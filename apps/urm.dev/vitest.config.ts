import { defaultExclude, defineConfig } from "vitest/config"
import { grep_preview } from "./grep-preview.plugin.ts"

export default defineConfig({
    plugins: [grep_preview()],
    test: {
        exclude: [...defaultExclude, "**/.todo/**"],
    },
})

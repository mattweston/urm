import {
    createCssVariablesTheme,
    createHighlighterCoreSync,
} from "@shikijs/core"
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript"
import typescript from "@shikijs/langs/typescript"

const highlighter = createHighlighterCoreSync({
    themes: [
        createCssVariablesTheme({
            name: "builder",
            variablePrefix: "--schema-shiki-",
        }),
    ],
    langs: [typescript],
    engine: createJavaScriptRegexEngine(),
})
export const highlight = (source: string) =>
    highlighter.codeToHtml(source, { lang: "typescript", theme: "builder" })

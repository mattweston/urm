import {
    createHighlighterCoreSync,
    createCssVariablesTheme,
} from "@shikijs/core"
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript"
import shellscript from "@shikijs/langs/shellscript"

const VARIABLE_PREFIX = "--terminal-shiki-"

const highlighter = createHighlighterCoreSync({
    themes: [
        createCssVariablesTheme({
            name: "terminal",
            variablePrefix: VARIABLE_PREFIX,
        }),
    ],
    langs: [shellscript],
    engine: createJavaScriptRegexEngine(),
})

export const highlightTerminalSource = (source: string): string =>
    highlighter.codeToHtml(source, {
        lang: "shellscript",
        theme: "terminal",
    })

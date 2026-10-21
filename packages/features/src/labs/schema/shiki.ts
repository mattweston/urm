import {
    createCssVariablesTheme,
    createHighlighterCoreSync,
} from "@shikijs/core"
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript"
import json from "@shikijs/langs/json"

const highlighter = createHighlighterCoreSync({
    themes: [
        createCssVariablesTheme({
            name: "schema",
            variablePrefix: "--schema-shiki-",
        }),
    ],
    langs: [json],
    engine: createJavaScriptRegexEngine(),
})

export const highlight_json = (value: unknown): string =>
    highlighter.codeToHtml(JSON.stringify(value, null, 2) ?? "null", {
        lang: "json",
        theme: "schema",
    })

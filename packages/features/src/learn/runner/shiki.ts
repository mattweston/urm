import { Schema as S } from "effect"

import type { SnippetLanguage } from "./snippet-highlights.ts"

// A token carries a CSS variable reference, not a hex colour: the highlighter
// is built with shiki's css-variables theme, so each token role resolves to a
// theme token and the code follows all 16 themes. The prefix is the app-wide
// one declared by `.documentation-shiki` in `@urm/ui/styles/documentation.css`,
// so highlighted code here is coloured by exactly the same rules as every other
// code block in the app rather than by a private copy of them.
export const VARIABLE_PREFIX = "--documentation-shiki-"

export const CodeToken = S.Struct({
    content: S.String,
    color: S.String,
    is_italic: S.Boolean,
})
export type CodeToken = typeof CodeToken.Type

export const CodeLine = S.Array(CodeToken)
export type CodeLine = typeof CodeLine.Type

// Grammars and the regex engine are megabytes; they load on first use and only
// on this route. `@shikijs/langs/typescript` rather than `shiki/langs`, which
// would drag in every language for the sake of one.
const make_highlighter = () =>
    Promise.all([
        import("@shikijs/core"),
        import("@shikijs/engine-javascript"),
        import("@shikijs/langs/typescript"),
        import("@shikijs/langs/javascript"),
    ]).then(
        ([
            { createHighlighterCore, createCssVariablesTheme },
            { createJavaScriptRegexEngine },
            typescript,
            javascript,
        ]) =>
            createHighlighterCore({
                themes: [
                    createCssVariablesTheme({
                        name: "effect-example",
                        variablePrefix: VARIABLE_PREFIX,
                    }),
                ],
                langs: [typescript, javascript],
                engine: createJavaScriptRegexEngine(),
            })
    )

// Shiki counts every `createHighlighterCore` globally and warns once several
// exist, because each one holds its own grammars and regex engine. One promise
// is cached here and every caller awaits it, so concurrent first calls share a
// single load rather than racing to build their own.
//
// A `const` box rather than a `let`: module-level mutable bindings are barred,
// and this is the same shape `labs/fold` uses for its AudioContext.
const highlighter_cache: {
    promise: ReturnType<typeof make_highlighter> | undefined
} = { promise: undefined }

const highlighter = (): ReturnType<typeof make_highlighter> => {
    highlighter_cache.promise ??= make_highlighter()
    return highlighter_cache.promise
}

const ITALIC = 1

export const tokenize = async (
    language: SnippetLanguage,
    source: string
): Promise<ReadonlyArray<CodeLine>> => {
    const instance = await highlighter()
    const lines = instance.codeToTokensBase(source, {
        lang: language,
        theme: "effect-example",
    })

    return lines.map((line) =>
        line.map((token) =>
            CodeToken.make({
                content: token.content,
                color: token.color ?? `var(${VARIABLE_PREFIX}foreground)`,
                is_italic: (token.fontStyle ?? 0) === ITALIC,
            })
        )
    )
}

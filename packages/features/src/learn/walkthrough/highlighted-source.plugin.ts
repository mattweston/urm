import { readFile } from "node:fs/promises"
import { codeToHtml } from "shiki"

import { shiki_theme } from "@urm/ui/shiki/theme.ts"

type HighlightedSourcePlugin = Readonly<{
    name: string
    enforce: "pre"
    transform: (code: string, id: string) => Promise<string | undefined>
}>

export const highlighted_source_plugin = (): HighlightedSourcePlugin => ({
    name: "foldkit-highlighted-source",
    enforce: "pre",
    async transform(_code, id) {
        if (!id.includes("?highlighted")) return undefined

        const file_path = id.slice(0, id.indexOf("?"))
        const source = (await readFile(file_path, "utf8")).trimEnd()
        const lines = source.split("\n")
        const html = await codeToHtml(source, {
            lang: "typescript",
            theme: shiki_theme,
            decorations: lines.map((line, index) => ({
                start: { line: index, character: 0 },
                end: { line: index, character: line.length },
                properties: { "data-line": index + 1 },
            })),
        })
        const numbered_html = html.replace(
            "<pre ",
            `<pre data-line-digits="${String(lines.length).length}" `
        )

        return `export default ${JSON.stringify(numbered_html)}`
    },
})

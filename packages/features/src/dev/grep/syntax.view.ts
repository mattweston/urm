import type { Html, HtmlBuilder } from "foldkit/html"
import type { SyntaxToken } from "./data.ts"

export const syntax_slice = <Message>(
    text: string,
    tokens: ReadonlyArray<SyntaxToken> | undefined,
    start: number,
    end: number,
    h: HtmlBuilder<Message>
): ReadonlyArray<Html> => {
    if (tokens === undefined) return [h.span([], [text.slice(start, end)])]
    const spans: Html[] = []
    let offset = 0
    for (const token of tokens) {
        const token_end = offset + token.text.length
        const from = Math.max(start, offset)
        const to = Math.min(end, token_end)
        if (from < to)
            spans.push(
                h.span(
                    [h.Style({ color: token.color })],
                    [token.text.slice(from - offset, to - offset)]
                )
            )
        offset = token_end
        if (offset >= end) break
    }
    return spans
}

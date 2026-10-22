import type { Preview } from "./data.ts"
import type { search_preview } from "./model.ts"

type SearchResult = ReturnType<typeof search_preview>

export const group_context = (preview: Preview, result: SearchResult) =>
    preview.files.flatMap((file) => {
        const matches = result.matches.filter(
            (match) => match.path === file.path
        )
        if (matches.length === 0) return []
        const lines = file.text.split(/\r?\n/)
        const ranges: { start: number; end: number }[] = []
        for (const match of matches) {
            const start = Math.max(1, match.line - 2)
            const end = Math.min(lines.length, match.line + 2)
            const previous = ranges.at(-1)
            if (previous !== undefined && start <= previous.end + 1)
                previous.end = Math.max(previous.end, end)
            else ranges.push({ start, end })
        }
        return [
            {
                path: file.path,
                occurrences: result.file_counts.get(file.path) ?? 0,
                shown_matches: matches.length,
                blocks: ranges.map((range) => ({
                    id: `${file.path}:${range.start}`,
                    lines: lines
                        .slice(range.start - 1, range.end)
                        .map((text, index) => ({
                            number: range.start + index,
                            ...(file.tokens?.[range.start + index - 1] ===
                            undefined
                                ? {}
                                : {
                                      tokens: file.tokens[
                                          range.start + index - 1
                                      ],
                                  }),
                            text,
                            matches: matches.filter(
                                (match) => match.line === range.start + index
                            ),
                        })),
                })),
            },
        ]
    })

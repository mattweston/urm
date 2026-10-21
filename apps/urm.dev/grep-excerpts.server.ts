import type { SearchResponse } from "@urm/features/dev/grep"

type Group = SearchResponse["groups"][number]

// Keep ordinary source intact. Very long lines get one bounded window per match,
// or a short opening excerpt when they are only neighboring context.
export const bounded_excerpts = (groups: SearchResponse["groups"]): Group[] =>
    groups.map((group) => ({
        ...group,
        blocks: group.blocks.flatMap((block) => {
            if (block.lines.every((line) => line.text.length <= 512))
                return [block]
            return block.lines.flatMap((line) => {
                if (line.text.length <= 512)
                    return [{ id: `${block.id}:${line.number}`, lines: [line] }]
                const windows =
                    line.matches.length === 0
                        ? [{ start: 0, end: 256, matches: [] }]
                        : line.matches.map((match) => ({
                              start: Math.max(0, match.start - 128),
                              end: Math.min(line.text.length, match.end + 128),
                              matches: [match],
                          }))
                return windows.map((window) => {
                    const prefix = window.start > 0 ? "… " : ""
                    const suffix = window.end < line.text.length ? " …" : ""
                    const text =
                        prefix +
                        line.text.slice(window.start, window.end) +
                        suffix
                    return {
                        id: `${block.id}:${line.number}:${window.start}:${window.matches[0]?.id ?? "context"}`,
                        lines: [
                            {
                                number: line.number,
                                text,
                                matches: window.matches.map((match) => ({
                                    ...match,
                                    text,
                                    start:
                                        match.start -
                                        window.start +
                                        prefix.length,
                                    end:
                                        match.end -
                                        window.start +
                                        prefix.length,
                                })),
                            },
                        ],
                    }
                })
            })
        }),
    }))

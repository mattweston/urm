import { describe, expect, test } from "vitest"
import { group_context } from "./context.ts"
import { search_preview } from "./model.ts"

describe("Grep file context", () => {
    test("merges adjacent context while retaining every occurrence and exact file counts", () => {
        const preview = {
            snapshot: "fixture",
            sections: [],
            diagnostics: [],
            files: [
                {
                    path: "first.ts",
                    text: "Effect Effect\r\ncontext\r\nEffect\r\ntail\r\nlast",
                },
                { path: "second.ts", text: "Effect" },
            ],
        }
        const result = search_preview(preview, {
            query: "Effect",
            selected: "",
        })
        const groups = group_context(preview, result)
        expect(result.occurrences).toBe(4)
        expect(groups.map((group) => group.occurrences)).toEqual([3, 1])
        expect(groups[0]?.blocks).toHaveLength(1)
        expect(groups[0]?.blocks[0]?.lines.map((line) => line.number)).toEqual([
            1, 2, 3, 4, 5,
        ])
        expect(
            groups[0]?.blocks[0]?.lines[0]?.matches.map((match) => match.column)
        ).toEqual([1, 8])
        expect(groups[1]?.blocks[0]?.lines).toHaveLength(1)
    })

    test("keeps distant excerpts separate and counts matches beyond the display limit", () => {
        const preview = {
            snapshot: "fixture",
            sections: [],
            diagnostics: [],
            files: [
                {
                    path: "distant.ts",
                    text: "Effect\n1\n2\n3\n4\n5\n6\nEffect",
                },
                { path: "many.ts", text: "Effect ".repeat(110) },
            ],
        }
        const result = search_preview(preview, {
            query: "Effect",
            selected: "",
        })
        const groups = group_context(preview, result)
        expect(result.matches).toHaveLength(22)
        expect(result.occurrences).toBe(112)
        expect(groups[0]?.blocks).toHaveLength(2)
        expect(groups[1]?.occurrences).toBe(110)
    })
})

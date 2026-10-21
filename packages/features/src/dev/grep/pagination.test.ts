import { describe, expect, test } from "vitest"
import {
    ChangedQuery,
    init,
    restore_query,
    search_preview,
    SelectedMatch,
    ShowMoreFiles,
    ShowMoreMatches,
    update,
} from "./model.ts"

describe("Grep progressive results", () => {
    test("exhausts files and occurrences independently without changing exact totals or selection", () => {
        const preview = {
            snapshot: "test",
            sections: [],
            diagnostics: [],
            files: Array.from({ length: 12 }, (_, index) => ({
                path: `${index}.ts`,
                text: "Effect\n".repeat(45),
            })),
        }
        let model = update(init(), ChangedQuery({ query: "Effect" }))
        let result = search_preview(preview, model)
        expect(result.files).toBe(12)
        expect(result.occurrences).toBe(540)
        expect(result.shown_files).toBe(10)
        expect(result.matches).toHaveLength(200)
        const selected = result.matches[0]?.id ?? ""
        model = update(model, SelectedMatch({ id: selected }))
        model = update(model, ShowMoreFiles())
        for (const file of preview.files) {
            model = update(model, ShowMoreMatches({ path: file.path }))
            model = update(model, ShowMoreMatches({ path: file.path }))
        }
        result = search_preview(preview, model)
        expect(result.matches).toHaveLength(540)
        expect(new Set(result.matches.map((match) => match.id)).size).toBe(540)
        expect(result.occurrences).toBe(540)
        expect(result.selected?.id).toBe(selected)
        expect(restore_query(model, "Effect")).toBe(model)
        expect(restore_query(model, "other")).toEqual(init("other"))
    })
})

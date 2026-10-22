import type { DocumentationSection } from "./data.ts"
import { describe, expect, test } from "vitest"
import {
    rank_documentation,
    search_preview,
    suggest_topics,
    init,
    update,
    ReceivedSuggestions,
} from "./model.ts"

const sections: ReadonlyArray<DocumentationSection> = [
    {
        id: "effect",
        path: "Effect.ts",
        title: "map",
        page_title: "Effect API",
        text: "Map an Effect.",
        aliases: ["Effect.map"],
        associations: [],
    },
    {
        id: "layer",
        path: "Layer.ts",
        title: "effect",
        page_title: "Layer API",
        text: "Create a Layer from an Effect.",
        aliases: ["Layer.effect", "effect"],
        associations: [
            {
                source_path: "Layer.ts",
                start_line: 1,
                end_line: 10,
                reason: "Documents this region",
            },
        ],
    },
    {
        id: "channel",
        path: "Channel.ts",
        title: "fromEffect",
        page_title: "Channel API",
        text: "Uses Effect and Layer.",
        aliases: ["Channel.fromEffect"],
        associations: [],
    },
    {
        id: "guide",
        path: "docs/effect.md",
        title: "Overview",
        text: "Effect overview.",
        associations: [],
    },
]

describe("documentation topic scope", () => {
    test.each(["effect", "Effect"])(
        "%s stays within the Effect pages even when Layer code is selected",
        (query) => {
            const preview = {
                snapshot: "test",
                diagnostics: [],
                sections,
                files: [
                    { path: "Layer.ts", text: "Effect effect" },
                    { path: "Channel.ts", text: "Effect effect" },
                ],
            }
            const result = search_preview(preview, {
                query,
                selected: "Layer.ts:1:0",
            })
            expect(result.files).toBe(2)
            expect(result.sections.map((item) => item.section.path)).toEqual([
                "Effect.ts",
                "docs/effect.md",
            ])
        }
    )
    test.each(["layer", "Layer"])("%s selects Layer documentation", (query) => {
        const result = rank_documentation(sections, query, undefined)
        expect(result.map((item) => item.section.path)).toEqual(["Layer.ts"])
    })
    test("qualified symbols select their own documentation without prose fallback", () => {
        const documents = sections.map((section) => ({
            ...section,
            associations: [],
        }))
        expect(
            rank_documentation(documents, "Layer.effect", undefined).map(
                (item) => item.section.path
            )
        ).toEqual(["Layer.ts"])
        expect(rank_documentation(documents, "Uses", undefined)).toEqual([])
        expect(rank_documentation(documents, "eff", undefined)).toEqual([])
    })
})

test("typeahead uses documentation identities and ignores stale responses", () => {
    expect(suggest_topics(sections, "Layer.eff")).toContain("Layer.effect")
    expect(suggest_topics(sections, "")).toEqual([])
    expect(suggest_topics(sections, "Create a Layer")).toEqual([])
    expect(suggest_topics(sections, "effect").length).toBeLessThanOrEqual(8)
    const model = { ...init(), query: "Layer" }
    expect(
        update(
            model,
            ReceivedSuggestions({
                query: "Effect",
                suggestions: ["Effect.map"],
            })
        )
    ).toBe(model)
    expect(
        update(
            model,
            ReceivedSuggestions({
                query: "Layer",
                suggestions: ["Layer.effect"],
            })
        ).suggestions
    ).toEqual(["Layer.effect"])
})

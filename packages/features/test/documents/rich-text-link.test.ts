import { Effect } from "effect"
import { Server } from "foldkit/experimental"
import type { HtmlBuilder } from "foldkit/html"
import type {
    RichTextEditorModel,
    RichTextEditorMessage,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"
import { Combobox } from "@foldkit/ui"
import { describe, expect, it } from "vitest"
import {
    ClickedRichTextEditorMark,
    InsertedRichTextEditorText,
    GotLinkBookmarksMessage,
    SubmittedLinkUrl,
    UpdatedLinkText,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"
import {
    RichTextEditor,
    initRichTextEditor,
    updateRichTextEditor,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"

describe("rich-text links", () => {
    it("opens model-owned link state and applies bookmark suggestions", () => {
        const [withText] = updateRichTextEditor(
            initRichTextEditor(),
            InsertedRichTextEditorText({ value: "URM" })
        )
        const [opened] = updateRichTextEditor(
            withText,
            ClickedRichTextEditorMark({ type: "link", start: 0, end: 3 })
        )

        expect(opened.linkDialog.dialog.isOpen).toBe(true)
        expect(opened.linkDialog.text).toBe("URM")
        expect(opened.linkDialog.selection).toEqual({ anchor: 0, focus: 3 })

        const [selected] = updateRichTextEditor(
            opened,
            GotLinkBookmarksMessage({
                title: "Example",
                message: Combobox.Message.SelectedItem({
                    item: "https://example.com",
                    displayText: "Example",
                    wasSelected: false,
                }),
            })
        )
        expect(selected.linkDialog.href).toBe("https://example.com")
        expect(selected.linkDialog.text).toBe("Example")

        const [cleared] = updateRichTextEditor(
            selected,
            UpdatedLinkText({ value: "" })
        )
        const [selectedWithoutText] = updateRichTextEditor(
            cleared,
            GotLinkBookmarksMessage({
                title: "Example",
                message: Combobox.Message.SelectedItem({
                    item: "https://example.com/docs",
                    displayText: "Example",
                    wasSelected: false,
                }),
            })
        )
        expect(selectedWithoutText.linkDialog.text).toBe("Example")
    })

    it("searches without changing the link and resets the picker on reopening", () => {
        const [opened] = updateRichTextEditor(
            initRichTextEditor("Original"),
            ClickedRichTextEditorMark({ type: "link", start: 0, end: 8 })
        )
        const [searched] = updateRichTextEditor(
            opened,
            GotLinkBookmarksMessage({
                title: "",
                message: Combobox.Message.UpdatedInputValue({ value: "docs" }),
            })
        )
        expect(searched.linkDialog.bookmarks.inputValue).toBe("docs")
        expect(searched.linkDialog.bookmarks.isOpen).toBe(true)
        expect(searched.linkDialog.text).toBe("Original")
        expect(searched.linkDialog.href).toBe("https://")
        const [closed] = updateRichTextEditor(
            searched,
            GotLinkBookmarksMessage({
                title: "",
                message: Combobox.Message.Closed({
                    restingInputValue: "",
                    isClearable: false,
                }),
            })
        )
        expect(closed.linkDialog.bookmarks.isOpen).toBe(false)
        expect(closed.linkDialog.dialog.isOpen).toBe(true)
        const [reopened] = updateRichTextEditor(
            closed,
            ClickedRichTextEditorMark({ type: "link" })
        )
        expect(reopened.linkDialog.bookmarks.inputValue).toBe("")
        expect(reopened.linkDialog.bookmarks.isOpen).toBe(false)
    })

    it("renders a labelled Foldkit combobox and filters bookmarks by tag", async () => {
        const [opened] = updateRichTextEditor(
            initRichTextEditor(),
            ClickedRichTextEditorMark({ type: "link" })
        )
        const [model] = updateRichTextEditor(
            opened,
            GotLinkBookmarksMessage({
                title: "",
                message: Combobox.Message.UpdatedInputValue({ value: "guide" }),
            })
        )
        const result = await Effect.runPromise(
            Server.renderToString(
                {
                    init: () => ({ model, commands: [] }),
                    view: (
                        current: RichTextEditorModel,
                        h: HtmlBuilder<RichTextEditorMessage>
                    ) => ({
                        title: "Editor",
                        body: RichTextEditor(
                            {
                                id: "test-editor",
                                model: current,
                                toParentMessage: (message) => message,
                                linkSuggestions: [
                                    {
                                        id: "docs",
                                        title: "Documentation",
                                        href: "https://example.com/docs",
                                        tags: ["guide"],
                                    },
                                    {
                                        id: "news",
                                        title: "News",
                                        href: "https://example.com/news",
                                        tags: [],
                                    },
                                ],
                            },
                            h
                        ),
                    }),
                },
                { buildId: "bookmark-picker-test" }
            )
        )
        expect(result.html).toContain('role="combobox"')
        expect(result.html).toContain('for="rich-text-editor-bookmarks-input"')
        expect(result.html).toContain('role="listbox"')
        expect(result.html).toContain('role="option"')
        expect(result.html).toContain("Documentation")
        expect(result.html).not.toContain("https://example.com/news")
    })

    it.each([undefined, []])(
        "keeps the bookmark picker visible when suggestions are %s",
        async (linkSuggestions) => {
            const [model] = updateRichTextEditor(
                initRichTextEditor(),
                ClickedRichTextEditorMark({ type: "link" })
            )
            const result = await Effect.runPromise(
                Server.renderToString(
                    {
                        init: () => ({ model, commands: [] }),
                        view: (
                            current: RichTextEditorModel,
                            h: HtmlBuilder<RichTextEditorMessage>
                        ) => ({
                            title: "Editor",
                            body: RichTextEditor(
                                {
                                    id: "empty-bookmarks",
                                    model: current,
                                    toParentMessage: (message) => message,
                                    ...(linkSuggestions === undefined
                                        ? {}
                                        : { linkSuggestions }),
                                },
                                h
                            ),
                        }),
                    },
                    { buildId: "empty-bookmarks-test" }
                )
            )
            expect(result.html).toContain('role="combobox"')
            expect(result.html).toContain(
                "No saved bookmarks are available in this editor."
            )
        }
    )

    it("inserts visible linked text for a collapsed selection", () => {
        const href = "https://example.com"
        const [model] = updateRichTextEditor(
            initRichTextEditor(),
            SubmittedLinkUrl({
                href,
                text: "Example",
                start: 0,
                end: 0,
            })
        )

        expect(model.document.children[0]).toMatchObject({
            type: "paragraph",
            children: [
                {
                    type: "text",
                    text: "Example",
                    marks: [{ type: "link", href }],
                },
                { type: "text", text: "" },
            ],
        })
        expect(model.selection).toEqual({
            anchor: 7,
            focus: 7,
        })
    })

    it("continues typing outside the inserted link", () => {
        const href = "https://example.com"
        const [linked] = updateRichTextEditor(
            initRichTextEditor(),
            SubmittedLinkUrl({
                href,
                text: "Example",
                start: 0,
                end: 0,
            })
        )
        const [typed] = updateRichTextEditor(
            linked,
            InsertedRichTextEditorText({ value: " next" })
        )

        expect(typed.document.children[0]).toMatchObject({
            type: "paragraph",
            children: [
                {
                    type: "text",
                    text: "Example",
                    marks: [{ type: "link", href }],
                },
                { type: "text", text: " next" },
            ],
        })
    })
})

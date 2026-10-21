import { Effect } from "effect"
import { Combobox } from "@foldkit/ui"
import { Server } from "foldkit/experimental"
import type { HtmlBuilder } from "foldkit/html"
import { expect, test } from "vitest"
import * as Blog from "../../src/blog/submodel.ts"
import {
    ClickedRichTextEditorMark,
    GotLinkBookmarksMessage,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"

test("passes saved bookmarks through the Blog view to the RTE combobox", async () => {
    const [opened] = Blog.update(
        Blog.init("/blog/new")[0],
        Blog.GotBlogRichTextEditorMessage({
            message: ClickedRichTextEditorMark({ type: "link" }),
        })
    )
    const [model] = Blog.update(
        opened,
        Blog.GotBlogRichTextEditorMessage({
            message: GotLinkBookmarksMessage({
                title: "",
                message: Combobox.Message.UpdatedInputValue({ value: "guide" }),
            }),
        })
    )
    const result = await Effect.runPromise(
        Server.renderToString(
            {
                init: () => ({ model, commands: [] }),
                view: (
                    current: Blog.ModelType,
                    h: HtmlBuilder<Blog.MessageType>
                ) => ({
                    title: "Blog",
                    body: h.submodel({
                        slotId: "blog",
                        model: current,
                        view: Blog.view,
                        viewInputs: {
                            link_suggestions: [
                                {
                                    id: "docs",
                                    title: "Documentation",
                                    href: "https://example.com/docs",
                                    tags: ["guide"],
                                },
                            ],
                        },
                        toParentMessage: (message) => message,
                    }),
                }),
            },
            { buildId: "blog-bookmarks-test" }
        )
    )
    expect(result.html).toContain('form="blog-post-form"')
    expect(result.html).toContain('role="combobox"')
    expect(result.html).toContain('role="option"')
    expect(result.html).toContain("Documentation")
    expect(result.html).toContain("https://example.com/docs")
})

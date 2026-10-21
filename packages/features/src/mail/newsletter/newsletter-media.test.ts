import { Effect } from "effect"
import { Server } from "foldkit/experimental"
import type { HtmlBuilder } from "foldkit/html"
import { expect, test, vi } from "vitest"
import {
    ClickedRichTextEditorImage,
    OpenedRichTextEditorSlashMenu,
    SelectedImageFile,
    SelectedRichTextEditorSlashCommand,
    UploadedImage,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"
import type { Model } from "./newsletter.model.ts"
import type { Message } from "./newsletter.message.ts"
import {
    GotNewsletterRichTextEditorMessage,
    NewsletterDraftsLoaded,
    RequestedNewsletterImageUpload,
    SelectedNewsletterMediaImage,
    ToggledNewsletterEditing,
} from "./newsletter.message.ts"
import { authoring_view, preview_email } from "./newsletter.view.ts"
import { initDeferred, update } from "./newsletter.update.ts"

const private_url =
    "/api/uploads/example/media/00000000-0000-4000-8000-000000000001"

test("offers workspace Media images and an upload choice in the newsletter editor", async () => {
    const [initial] = initDeferred()
    const result = await Effect.runPromise(
        Server.renderToString(
            {
                init: () => ({
                    model: {
                        ...initial,
                        editing: true,
                        image_picker_open: true,
                    },
                }),
                view: (model: Model, h: HtmlBuilder<Message>) => ({
                    title: "Email Media",
                    body: h.submodel({
                        slotId: "email-test",
                        model,
                        view: authoring_view,
                        viewInputs: {
                            link_suggestions: [],
                            media_images: [
                                {
                                    src: private_url,
                                    url: private_url,
                                    alt: "Library photo",
                                },
                            ],
                        },
                        toParentMessage: (message) => message,
                    }),
                }),
            },
            { buildId: "email-media-test" }
        )
    )
    expect(result.html).toContain(`value="${private_url}"`)
    expect(result.html).toContain("Library photo")
    expect(result.html).toContain("Upload new image")
    expect(result.html).toContain("Media Library")
})

test("a saved private image appears in preview without changing its draft URL", () => {
    const [initial] = initDeferred()
    const [choosing] = update(
        { ...initial, editing: true },
        GotNewsletterRichTextEditorMessage({
            message: ClickedRichTextEditorImage(),
        })
    )
    expect(choosing.image_picker_open).toBe(true)
    const [with_image] = update(
        choosing,
        SelectedNewsletterMediaImage({
            src: private_url,
            url: private_url,
            alt: "Library photo",
        })
    )
    expect(with_image.image_picker_open).toBe(false)
    expect(with_image.draft.body_text).toContain(private_url)

    const [saved] = update(
        initial,
        NewsletterDraftsLoaded({
            drafts: [
                {
                    id: "draft-1",
                    ...with_image.draft,
                    name: "Image newsletter",
                    subject: "Image",
                    headline: "Image",
                    template_source: null,
                    updated_at: 1,
                },
            ],
        })
    )
    const [editing] = update(saved, ToggledNewsletterEditing())
    const [preview] = update(editing, ToggledNewsletterEditing())
    expect(preview.editing).toBe(false)
    expect(preview_email(preview, "https://urm.test").html).toContain(
        `src="https://urm.test${private_url}"`
    )
    expect(preview.draft.body_text).toContain(private_url)
    expect(preview.draft.body_text).not.toContain("https://urm.test")
})

test("upload choice starts the existing file picker", () => {
    const [initial] = initDeferred()
    const [opened] = update(
        initial,
        GotNewsletterRichTextEditorMessage({
            message: ClickedRichTextEditorImage(),
        })
    )
    const [closed, commands] = update(opened, RequestedNewsletterImageUpload())
    expect(closed.image_picker_open).toBe(false)
    expect(commands.map((command) => command.name)).toEqual(["PickImage"])
})

test("closing the file chooser leaves the newsletter unchanged and error-free", async () => {
    const listeners = new Map<string, () => void>()
    const input = {
        type: "",
        accept: "",
        style: { display: "" },
        files: null,
        addEventListener: (name: string, listener: () => void) => {
            listeners.set(name, listener)
        },
        remove: () => {},
        click: () => listeners.get("cancel")?.(),
    }
    vi.stubGlobal("document", {
        createElement: () => input,
        body: { appendChild: () => {} },
    })
    try {
        const [initial] = initDeferred()
        const [opened] = update(
            initial,
            GotNewsletterRichTextEditorMessage({
                message: ClickedRichTextEditorImage(),
            })
        )
        const [choosing, commands] = update(
            opened,
            RequestedNewsletterImageUpload()
        )
        const command = commands[0]
        if (command === undefined) throw new Error("Expected file picker")
        const result = await Effect.runPromise(command.effect)
        const [cancelled, followups] = update(choosing, result)
        expect(cancelled.image_picker_open).toBe(false)
        expect(cancelled.uploading).toBe(false)
        expect(cancelled.error).toBeNull()
        expect(cancelled.draft).toEqual(initial.draft)
        expect(followups).toEqual([])
    } finally {
        vi.unstubAllGlobals()
    }
})

test("the slash-menu Image action offers the library and upload choices", () => {
    const [initial] = initDeferred()
    const [menu_open] = update(
        initial,
        GotNewsletterRichTextEditorMessage({
            message: OpenedRichTextEditorSlashMenu(),
        })
    )
    const [choosing, commands] = update(
        menu_open,
        GotNewsletterRichTextEditorMessage({
            message: SelectedRichTextEditorSlashCommand({ value: "image" }),
        })
    )
    expect(choosing.image_picker_open).toBe(true)
    expect(choosing.editor.slashMenu.isOpen).toBe(false)
    expect(commands).toEqual([])
})

test("an uploaded private image survives saving and appears in preview", () => {
    const [initial] = initDeferred()
    const file = new globalThis.File(["image"], "newsletter.jpg", {
        type: "image/jpeg",
    })
    const [uploading] = update(
        initial,
        GotNewsletterRichTextEditorMessage({
            message: SelectedImageFile({ file }),
        })
    )
    const [uploaded] = update(
        uploading,
        GotNewsletterRichTextEditorMessage({
            message: UploadedImage({
                src: private_url,
                alt: "Uploaded photo",
                resolved_src: private_url,
            }),
        })
    )
    const [saved] = update(
        initial,
        NewsletterDraftsLoaded({
            drafts: [
                {
                    id: "draft-1",
                    ...uploaded.draft,
                    name: "Uploaded image newsletter",
                    subject: "Image",
                    headline: "Image",
                    template_source: null,
                    updated_at: 1,
                },
            ],
        })
    )
    const [editing] = update(saved, ToggledNewsletterEditing())
    const [preview] = update(editing, ToggledNewsletterEditing())
    expect(preview_email(preview, "https://urm.test").html).toContain(
        `src="https://urm.test${private_url}"`
    )
    expect(preview.draft.body_text).toContain(private_url)
})

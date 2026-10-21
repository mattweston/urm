import { describe, expect, it } from "vitest"

import {
    ClickedEditImageAlt,
    ResolvedRichTextImageUrls,
    SelectedImageFile,
    UploadedImage,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.schema.ts"
import {
    initRichTextEditor,
    updateRichTextEditor,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"

describe("rich-text images", () => {
    it("requests an upload after an image file is selected", () => {
        const file = new File(["image"], "diagram.png", {
            type: "image/png",
        })
        const [, commands] = updateRichTextEditor(
            initRichTextEditor(),
            SelectedImageFile({ file })
        )

        expect(commands[0]?.name).toBe("UploadRichTextImage")
        expect(commands[0]?.args).toEqual({ file })
    })

    it("inserts the uploaded image into the document", () => {
        const src = "https://assets.example.com/private/image.png"
        const [model, commands] = updateRichTextEditor(
            initRichTextEditor(),
            UploadedImage({ src, alt: "Diagram" })
        )

        expect(model.document.children).toEqual([
            {
                type: "paragraph",
                children: [{ type: "text", text: "" }],
            },
            { type: "image", src, alt: "Diagram" },
            {
                type: "paragraph",
                children: [{ type: "text", text: "" }],
            },
        ])
        expect(commands[0]?.name).toBe("ResolveRichTextImageUrls")
        expect(commands[0]?.args).toEqual({ urls: [src] })
    })

    it("uses resolved image URLs without changing the stored document URL", () => {
        const stored_url = "https://assets.example.com/private/image.png"
        const url = "https://assets.example.com/signed/image.png"
        const [with_image] = updateRichTextEditor(
            initRichTextEditor(),
            UploadedImage({
                src: stored_url,
                resolved_src: url,
                alt: "Diagram",
            })
        )
        const [resolved] = updateRichTextEditor(
            with_image,
            ResolvedRichTextImageUrls({ images: [{ stored_url, url }] })
        )

        expect(resolved.resolved_image_urls).toEqual([{ stored_url, url }])
        expect(resolved.document.children[1]).toEqual({
            type: "image",
            src: stored_url,
            alt: "Diagram",
        })
    })

    it("opens alt editing with the current alt text", () => {
        const [with_image] = updateRichTextEditor(
            initRichTextEditor(),
            UploadedImage({
                src: "https://assets.example.com/image.png",
                resolved_src: "https://assets.example.com/signed.png",
                alt: "Current alt",
            })
        )
        const [, commands] = updateRichTextEditor(
            with_image,
            ClickedEditImageAlt({ blockIndex: 1 })
        )

        expect(commands[0]?.name).toBe("PromptForAltText")
        expect(commands[0]?.args).toEqual({
            blockIndex: 1,
            initialValue: "Current alt",
        })
    })
})

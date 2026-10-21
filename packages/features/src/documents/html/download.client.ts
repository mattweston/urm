import type { RichTextHtmlDocumentOptions } from "./renderer.ts"
import { renderRichTextHtmlDocument } from "./renderer.ts"

export type RichTextHtmlDownload = Readonly<{
    filename: string
    blob: Blob
}>

export const htmlFilenameForTitle = (title: string): string => {
    const basename = title
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-+|-+$/g, "")

    return `${basename.length === 0 ? "document" : basename}.html`
}

export const createRichTextHtmlDownload = (
    options: RichTextHtmlDocumentOptions
): RichTextHtmlDownload => ({
    filename: htmlFilenameForTitle(options.title),
    blob: new Blob([renderRichTextHtmlDocument(options)], {
        type: "text/html;charset=utf-8",
    }),
})

export const downloadRichTextHtml = (
    options: RichTextHtmlDocumentOptions
): void => {
    const download = createRichTextHtmlDownload(options)
    const objectUrl = URL.createObjectURL(download.blob)
    const anchor = document.createElement("a")

    anchor.href = objectUrl
    anchor.download = download.filename
    anchor.hidden = true
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    queueMicrotask(() => URL.revokeObjectURL(objectUrl))
}

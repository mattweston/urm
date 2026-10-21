import type {
    RichTextDocument,
    RichTextMark,
    RichTextTextNode,
} from "@urm/domain/schemas/rich-text"

export type RichTextHtmlDocumentOptions = Readonly<{
    title: string
    document: RichTextDocument
    language?: string
    direction?: "ltr" | "rtl" | "auto"
}>

const escapeHtml = (value: string): string =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")

const safeUrl = (value: string, kind: "link" | "image"): string | undefined => {
    const normalized = value.trim()

    if (normalized.length === 0) return undefined
    if (
        normalized.startsWith("/") ||
        normalized.startsWith("./") ||
        normalized.startsWith("../") ||
        normalized.startsWith("#")
    ) {
        return normalized
    }

    try {
        const url = new URL(normalized)

        if (url.protocol === "http:" || url.protocol === "https:") {
            return normalized
        }
        if (
            kind === "link" &&
            (url.protocol === "mailto:" || url.protocol === "tel:")
        ) {
            return normalized
        }
    } catch {
        return undefined
    }

    return undefined
}

const isExternalHttpLink = (href: string): boolean => {
    try {
        const url = new URL(href)
        return url.protocol === "http:" || url.protocol === "https:"
    } catch {
        return false
    }
}

const externalLinkIcon =
    '<svg class="external-link-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"></path><path d="m11 13 9-9"></path><path d="M15 4h5v5"></path></svg>'

const renderMark = (html: string, mark: RichTextMark): string => {
    switch (mark.type) {
        case "bold":
            return `<strong>${html}</strong>`
        case "italic":
            return `<em>${html}</em>`
        case "link": {
            const href = safeUrl(mark.href, "link")
            if (href === undefined) return html
            if (isExternalHttpLink(href)) {
                return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${html}${externalLinkIcon}</a>`
            }
            return `<a href="${escapeHtml(href)}">${html}</a>`
        }
    }
}

const renderTextNode = (node: RichTextTextNode): string =>
    (node.marks ?? []).reduce(renderMark, escapeHtml(node.text))

const renderTextNodes = (nodes: ReadonlyArray<RichTextTextNode>): string =>
    nodes.map(renderTextNode).join("")

export const renderRichTextHtmlFragment = (
    document: RichTextDocument
): string =>
    document.children
        .map((block) => {
            switch (block.type) {
                case "paragraph":
                    return `<p>${renderTextNodes(block.children)}</p>`
                case "heading":
                    return `<h${block.level}>${renderTextNodes(block.children)}</h${block.level}>`
                case "blockquote":
                    return `<blockquote>${renderTextNodes(block.children)}</blockquote>`
                case "image": {
                    const src = safeUrl(block.src, "image")
                    const srcAttribute =
                        src === undefined ? "" : ` src="${escapeHtml(src)}"`
                    return `<figure><img${srcAttribute} alt="${escapeHtml(block.alt)}"></figure>`
                }
            }
        })
        .join("\n")

const standaloneStyles = `
:root { color-scheme: light dark; font-family: system-ui, sans-serif; line-height: 1.6; }
body { margin: 0; }
main { box-sizing: border-box; max-width: 48rem; margin: 0 auto; padding: 3rem 1.5rem; }
p, blockquote { white-space: pre-wrap; }
blockquote { margin-inline: 0; padding-inline-start: 1rem; border-inline-start: 0.25rem solid currentColor; opacity: 0.8; }
img { display: block; max-width: 100%; height: auto; }
a { color: inherit; text-decoration: underline; }
.external-link-icon { display: inline; width: 0.8em; height: 0.8em; margin-inline-start: 0.2em; vertical-align: baseline; }
`

export const renderRichTextHtmlDocument = ({
    title,
    document,
    language = "en",
    direction = "auto",
}: RichTextHtmlDocumentOptions): string => {
    const fragment = renderRichTextHtmlFragment(document)

    return `<!doctype html>
<html lang="${escapeHtml(language)}" dir="${direction}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${standaloneStyles}</style>
</head>
<body>
<main>${fragment}</main>
</body>
</html>
`
}

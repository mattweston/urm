import type { Html } from "foldkit/html"
import type { EmailTemplateTheme } from "@urm/email/templates"

type VNodeData = Readonly<{
    class?: Record<string, boolean>
    style?: Record<string, unknown>
    props?: Record<string, unknown>
    attrs?: Record<string, string>
    on?: Record<string, unknown>
    [key: string]: unknown
}>

type VNodeLike = Readonly<{
    sel?: string
    data?: VNodeData
    children?: ReadonlyArray<VNodeLike | string>
    text?: string
    elm?: unknown
    key?: string | number
}>

type StyleMap = Record<string, string>

type ResolvedTheme = Readonly<{
    font_family: string
    text_color: string
    background_color: string
    content_background_color: string
    link_color: string
    muted_color: string
    muted_background_color: string
    border_color: string
    primary_color: string
    primary_text_color: string
    dark_background_color: string
    dark_text_color: string
    content_border_radius: number
    button_border_radius: number
}>

const resolveTheme = (theme: EmailTemplateTheme): ResolvedTheme => ({
    font_family: theme.font_family,
    text_color: theme.text_color,
    background_color: theme.background_color,
    content_background_color: theme.content_background_color,
    link_color: theme.link_color,
    muted_color: theme.muted_text_color,
    muted_background_color: theme.muted_background_color,
    border_color: theme.border_color,
    primary_color: theme.primary_color,
    primary_text_color: theme.primary_text_color,
    dark_background_color: theme.dark_background_color,
    dark_text_color: theme.dark_text_color,
    content_border_radius: theme.content_border_radius,
    button_border_radius: theme.button_border_radius,
})

const resolveTailwindClass = (
    className: string,
    theme: ResolvedTheme
): StyleMap => {
    switch (className) {
        case "bg-card":
            return { "background-color": theme.content_background_color }
        case "bg-background":
            return { "background-color": theme.background_color }
        case "bg-muted":
            return { "background-color": theme.muted_background_color }
        case "bg-primary":
            return { "background-color": theme.primary_color }
        case "bg-foreground":
            return { "background-color": theme.dark_background_color }
        case "text-foreground":
            return { color: theme.text_color }
        case "text-muted-foreground":
            return { color: theme.muted_color }
        case "text-primary":
            return { color: theme.link_color }
        case "text-primary-foreground":
            return { color: theme.primary_text_color }
        case "text-background":
            return { color: theme.dark_text_color }
        case "border-border":
            return { "border-color": theme.border_color }
        case "border-primary":
            return { "border-color": theme.primary_color }
        case "text-xs":
            return { "font-size": "12px" }
        case "text-sm":
            return { "font-size": "14px" }
        case "text-lg":
            return { "font-size": "18px" }
        case "text-xl":
            return { "font-size": "20px" }
        case "text-2xl":
            return { "font-size": "24px" }
        case "text-3xl":
            return { "font-size": "30px" }
        case "text-4xl":
            return { "font-size": "36px" }
        case "font-medium":
            return { "font-weight": "500" }
        case "font-semibold":
            return { "font-weight": "600" }
        case "font-bold":
            return { "font-weight": "700" }
        case "m-0":
            return { margin: "0" }
        case "p-3":
            return { padding: "12px" }
        case "px-4":
            return { "padding-left": "16px", "padding-right": "16px" }
        case "py-8":
            return { "padding-top": "32px", "padding-bottom": "32px" }
        case "block":
            return { display: "block" }
        case "inline-block":
            return { display: "inline-block" }
        case "inline":
            return { display: "inline" }
        case "w-full":
            return { width: "100%" }
        case "text-center":
            return { "text-align": "center" }
        case "no-underline":
            return { "text-decoration": "none" }
        case "underline":
            return { "text-decoration": "underline" }
        case "align-middle":
            return { "vertical-align": "middle" }
        case "rounded-lg":
            return { "border-radius": `${theme.content_border_radius}px` }
        case "rounded-full":
            return { "border-radius": `${theme.button_border_radius}px` }
        case "border":
            return { "border-width": "1px", "border-style": "solid" }
        case "border-(length:--surface-border-width)":
            return { "border-width": "2px", "border-style": "solid" }
        case "truncate":
            return {
                overflow: "hidden",
                "text-overflow": "ellipsis",
                "white-space": "nowrap",
            }
        case "overflow-auto":
            return { overflow: "auto" }
        case "object-cover":
            return { "object-fit": "cover" }
        default:
            return {}
    }
}

const resolveMaxWidth = (className: string): StyleMap => {
    const match = className.match(/^max-w-\[(\d+px)\]$/)
    if (match !== null) {
        return { "max-width": match[1] ?? "" }
    }
    return {}
}

const resolveTailwindClasses = (
    classList: ReadonlyArray<string>,
    theme: ResolvedTheme
): StyleMap => {
    const resolved: StyleMap = {}

    for (const className of classList) {
        const base = resolveTailwindClass(className, theme)
        const maxWidth = resolveMaxWidth(className)
        for (const [key, value] of Object.entries(base)) {
            resolved[key] = value
        }
        for (const [key, value] of Object.entries(maxWidth)) {
            resolved[key] = value
        }
    }

    return resolved
}

const mergeStyles = (
    tailwindStyle: StyleMap,
    inlineStyle: StyleMap
): StyleMap => ({
    ...tailwindStyle,
    ...inlineStyle,
})

const styleToString = (style: StyleMap): string =>
    Object.entries(style)
        .map(([key, value]) => `${key}: ${value}`)
        .join("; ")

const escapeHtmlText = (text: string): string =>
    text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")

const escapeAttribute = (value: string): string =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")

const VOID_TAGS = new Set([
    "img",
    "br",
    "hr",
    "meta",
    "input",
    "area",
    "base",
    "col",
    "embed",
    "param",
    "source",
    "track",
    "wbr",
])

const isVoidTag = (sel: string): boolean => VOID_TAGS.has(sel)

const classListFromData = (
    data: VNodeData | undefined
): ReadonlyArray<string> => {
    if (data?.class === undefined) {
        return []
    }
    return Object.entries(data.class)
        .filter(([, isActive]) => isActive === true)
        .map(([className]) => className)
}

const styleFromData = (data: VNodeData | undefined): StyleMap => {
    if (data?.style === undefined) {
        return {}
    }
    const style = data.style as Record<string, unknown>
    const result: StyleMap = {}
    for (const [key, value] of Object.entries(style)) {
        if (typeof value === "string") {
            result[key] = value
        }
    }
    return result
}

const propsToAttributes = (
    data: VNodeData | undefined
): ReadonlyArray<Readonly<{ key: string; value: string }>> => {
    if (data?.props === undefined) {
        return []
    }
    const props = data.props as Record<string, unknown>
    const attributes: Array<{ key: string; value: string }> = []
    const propToAttr: Readonly<Record<string, string>> = {
        href: "href",
        src: "src",
        alt: "alt",
        width: "width",
        height: "height",
        target: "target",
        rel: "rel",
        colSpan: "colspan",
        rowSpan: "rowspan",
        htmlFor: "for",
        id: "id",
        title: "title",
        lang: "lang",
        dir: "dir",
        type: "type",
        name: "name",
        value: "value",
        placeholder: "placeholder",
        download: "download",
    }
    for (const [propKey, attrKey] of Object.entries(propToAttr)) {
        const value = props[propKey]
        if (value !== undefined && value !== null) {
            attributes.push({ key: attrKey, value: String(value) })
        }
    }
    return attributes
}

const attrsFromData = (
    data: VNodeData | undefined
): ReadonlyArray<Readonly<{ key: string; value: string }>> => {
    if (data?.attrs === undefined) {
        return []
    }
    const attrs = data.attrs as Record<string, string>
    return Object.entries(attrs).map(([key, value]) => ({
        key,
        value: String(value),
    }))
}

const serializeNode = (
    node: VNodeLike | string,
    classResolver: (classList: ReadonlyArray<string>) => StyleMap
): string => {
    if (typeof node === "string") {
        return escapeHtmlText(node)
    }

    if (node.text !== undefined && node.text !== null) {
        return escapeHtmlText(node.text)
    }

    const sel = node.sel ?? "div"
    const tag = sel.split(/[#.]/)[0] ?? sel
    const data = node.data
    const classList = classListFromData(data)
    const inlineStyle = styleFromData(data)
    const tailwindStyle = classResolver(classList)
    const mergedStyle = mergeStyles(tailwindStyle, inlineStyle)
    const propAttrs = propsToAttributes(data)
    const dataAttrs = attrsFromData(data)

    const attributes: Array<string> = []

    if (classList.length > 0) {
        attributes.push(`class="${escapeAttribute(classList.join(" "))}"`)
    }

    const styleString = styleToString(mergedStyle)
    if (styleString.length > 0) {
        attributes.push(`style="${escapeAttribute(styleString)}"`)
    }

    for (const attr of [...propAttrs, ...dataAttrs]) {
        attributes.push(`${attr.key}="${escapeAttribute(attr.value)}"`)
    }

    const attributeString =
        attributes.length > 0 ? ` ${attributes.join(" ")}` : ""

    if (isVoidTag(tag)) {
        return `<${tag}${attributeString} />`
    }

    const children = node.children ?? []
    const childrenHtml = children
        .map((child: VNodeLike | string) => serializeNode(child, classResolver))
        .join("")

    return `<${tag}${attributeString}>${childrenHtml}</${tag}>`
}

export const renderHtmlToEmailString = (
    html: Html,
    theme: EmailTemplateTheme
): string => {
    if (html === null || html === undefined) {
        return ""
    }

    const resolvedTheme = resolveTheme(theme)
    const classResolver = (classList: ReadonlyArray<string>) =>
        resolveTailwindClasses(classList, resolvedTheme)

    return serializeNode(html as unknown as VNodeLike, classResolver)
}

export const renderHtmlToEmailDocument = (
    html: Html,
    theme: EmailTemplateTheme
): string => {
    const body = renderHtmlToEmailString(html, theme)
    const resolved = resolveTheme(theme)

    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;font-family:${escapeAttribute(resolved.font_family)};color:${escapeAttribute(resolved.text_color)};background:${escapeAttribute(resolved.background_color)};">${body}</body></html>`
}

import { taggedStruct } from "foldkit/schema"
import type { Url as UrlType } from "foldkit/url"

export const RichTextEditorRoute = taggedStruct("RichTextEditor")

const BASE = "/urm/rich-text-editor"

export const urlToRichTextEditorRoute = (_url: UrlType) => RichTextEditorRoute()

export const richTextEditorHref = () => `${BASE}/`

export const isRichTextEditorPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

const PATH = "/documents/rich-text-editor"

export const richTextEditorHref = (): string => `${PATH}/`

export const isRichTextEditorPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

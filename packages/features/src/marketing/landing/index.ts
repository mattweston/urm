export { Message } from "./message.ts"
export type { Message as MessageType } from "./message.ts"
export {
    ClickedEdit,
    HeroImageUploadFailed,
    FailedTemplateSave,
    LogoImageUploadFailed,
    UploadedHeroImage,
    UploadedLogoImage,
    SavedTemplate,
} from "./message.ts"
export { Model } from "./model.ts"
export type { Model as ModelType } from "./model.ts"
export {
    changed_preset,
    init,
    landing_page_document,
    loaded_page_content,
    template_tags_from_input,
    update,
} from "./update.ts"
export { view } from "./view.ts"
export { subscriptions } from "./subscription.ts"

const base_path = "/marketing/layouts/urm"
const blank_path = "/marketing/layouts/blank"
const legacy_path = "/labs/marketing/landing"

export const isLandingEditorPath = (pathname: string): boolean =>
    pathname === base_path ||
    pathname.startsWith(`${base_path}/`) ||
    pathname === blank_path ||
    pathname.startsWith(`${blank_path}/`) ||
    pathname === legacy_path ||
    pathname.startsWith(`${legacy_path}/`)

export const landingEditorHref = (): string =>
    "/web/pages/new?kind=urm_marketing"
export const blankLandingEditorHref = (page_id?: string): string =>
    page_id === undefined
        ? "/web/pages/new?kind=landing_blank"
        : `/content/web/${encodeURIComponent(page_id)}?mode=edit`

export const landingEditorPageId = (pathname: string): string | null => {
    const match =
        /^\/marketing\/layouts\/blank\/([^/]+)\/?$/.exec(pathname) ??
        /^\/content\/web\/([^/]+)\/?$/.exec(pathname)
    const encoded_page_id = match?.[1]
    if (encoded_page_id === undefined) return null
    try {
        return decodeURIComponent(encoded_page_id)
    } catch {
        return null
    }
}

export const editorPresetForPath = (pathname: string): "blank" | "urm" =>
    pathname === blank_path || pathname.startsWith(`${blank_path}/`)
        ? "blank"
        : "urm"

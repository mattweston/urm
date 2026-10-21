import { Option } from "effect"
import type { HtmlBuilder } from "foldkit/html"
import type { Image } from "@urm/domain/schemas/media"
import type {
    LandingImage,
    LandingPageDocument,
    PublishedLandingImage,
    PublishedLandingPageDocument,
} from "@urm/domain/schemas/landing-pages"
import type { SiteAppearanceSettings } from "@urm/domain/schemas/site-appearance"
import { init, loaded_page_content } from "./update.ts"
import { view } from "./view.ts"

const bundled_paths = {
    "urm.integration.bento": "/assets/urm-integrations/bento.svg",
    "urm.integration.instagram": "/assets/urm-integrations/instagram.svg",
    "urm.integration.polar": "/assets/urm-integrations/polar.svg",
    "urm.integration.stripe": "/assets/urm-integrations/stripe.svg",
}
const safe_url = (input: string) => {
    const value = input.trim()
    if (
        [...value].some(
            (character) =>
                character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
        )
    )
        return "#"
    if (
        (value.startsWith("/") &&
            !value.startsWith("//") &&
            !value.startsWith("/\\")) ||
        value.startsWith("#")
    )
        return value
    try {
        const url = new URL(value)
        return ["https:", "mailto:", "tel:"].includes(url.protocol) &&
            !url.username &&
            !url.password
            ? url.href
            : "#"
    } catch {
        return "#"
    }
}

// Use the editor's template and content projection, with resolved public images
// and semantic text/details instead of editable controls or hydrated disclosures.
export const publication_view = <Message>(
    landing: PublishedLandingPageDocument,
    appearance: SiteAppearanceSettings,
    h: HtmlBuilder<Message>,
    noop: Message
) => {
    const images: Image[] = []
    const image = (source: PublishedLandingImage): LandingImage => {
        const id = `published-landing-${images.length}`
        images.push({
            id,
            url:
                source._tag === "BundledAsset"
                    ? bundled_paths[source.asset_id]
                    : safe_url(source.src),
            alt: source.alt,
            text: "",
            order_position: images.length,
            updated_at: 0,
        })
        return { _tag: "DomainImage", image_id: id, alt: source.alt }
    }
    const document: LandingPageDocument = {
        ...landing,
        blocks: landing.blocks.map((block) => {
            if (block._tag === "Hero") {
                const { image: source, ...hero } = block
                return {
                    ...hero,
                    ...(source === undefined ? {} : { image: image(source) }),
                    actions: block.actions.map((action) => ({
                        ...action,
                        href: safe_url(action.href),
                    })),
                }
            }
            if (block._tag === "Cta")
                return {
                    ...block,
                    actions: block.actions.map((action) => ({
                        ...action,
                        href: safe_url(action.href),
                    })),
                }
            if (block._tag === "LogoGrid")
                return {
                    ...block,
                    logos: block.logos.map((logo) => ({
                        ...logo,
                        image: image(logo.image),
                    })),
                }
            if (block._tag === "RichText")
                return {
                    ...block,
                    document: {
                        ...block.document,
                        children: block.document.children.map((node) =>
                            node.type === "image"
                                ? { ...node, src: safe_url(node.src) }
                                : {
                                      ...node,
                                      children: node.children.map((child) => ({
                                          ...child,
                                          marks: child.marks?.map((mark) =>
                                              mark.type === "link"
                                                  ? {
                                                        ...mark,
                                                        href: safe_url(
                                                            mark.href
                                                        ),
                                                    }
                                                  : mark
                                          ),
                                      })),
                                  }
                        ),
                    },
                }
            return block
        }),
    }
    const model = loaded_page_content(
        init("blank")[0],
        "published",
        JSON.stringify(document)
    )
    return view(
        {
            ...model,
            publication_view: true,
            editor_state: { _tag: "Viewing" },
            page_id: Option.none(),
        },
        () => noop,
        h,
        images,
        appearance,
        true
    )
}

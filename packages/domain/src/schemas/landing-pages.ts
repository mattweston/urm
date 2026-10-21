import { Effect, Schema } from "effect"

import { RichTextDocument } from "./rich-text.ts"
import {
    ContentTemplateCategory,
    ContentTemplateDescription,
    ContentTemplateName,
    ContentTemplateTag,
    ContentTemplateTags,
} from "./content-templates.ts"

export const LandingPageContentType = Schema.Literal("landing_json")
export type LandingPageContentType = typeof LandingPageContentType.Type

export const LandingTemplateName = ContentTemplateName
export type LandingTemplateName = typeof LandingTemplateName.Type

export const LandingTemplateDescription = ContentTemplateDescription
export type LandingTemplateDescription = typeof LandingTemplateDescription.Type

export const LandingTemplateCategory = ContentTemplateCategory
export type LandingTemplateCategory = typeof LandingTemplateCategory.Type

export const LandingTemplateTag = ContentTemplateTag
export type LandingTemplateTag = typeof LandingTemplateTag.Type

export const LandingTemplateTags = ContentTemplateTags
export type LandingTemplateTags = typeof LandingTemplateTags.Type

export const LandingBlockId = Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(100),
    Schema.isPattern(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
)
export type LandingBlockId = typeof LandingBlockId.Type

export const LandingPresetId = Schema.Literals([
    "marketing_starter",
    "urm_marketing",
])
export type LandingPresetId = typeof LandingPresetId.Type

export const LandingMotion = Schema.Literals([
    "none",
    "fade",
    "rise",
    "stagger",
])
export type LandingMotion = typeof LandingMotion.Type

export const UrmBundledAssetId = Schema.Literals([
    "urm.integration.bento",
    "urm.integration.instagram",
    "urm.integration.polar",
    "urm.integration.stripe",
])
export type UrmBundledAssetId = typeof UrmBundledAssetId.Type

export const LandingDomainImage = Schema.Struct({
    _tag: Schema.Literal("DomainImage"),
    image_id: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(200)
    ),
    alt: Schema.String.check(Schema.isMaxLength(500)),
})
export type LandingDomainImage = typeof LandingDomainImage.Type

export const LandingBundledAsset = Schema.Struct({
    _tag: Schema.Literal("BundledAsset"),
    asset_id: UrmBundledAssetId,
    alt: Schema.String.check(Schema.isMaxLength(500)),
})
export type LandingBundledAsset = typeof LandingBundledAsset.Type

export const LandingResolvedImage = Schema.Struct({
    _tag: Schema.Literal("ResolvedImage"),
    src: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(2_000)),
    alt: Schema.String.check(Schema.isMaxLength(500)),
    width: Schema.optional(Schema.Number),
    height: Schema.optional(Schema.Number),
})
export type LandingResolvedImage = typeof LandingResolvedImage.Type

export const LandingImage = Schema.Union([
    LandingDomainImage,
    LandingBundledAsset,
])
export type LandingImage = typeof LandingImage.Type

export const PublishedLandingImage = Schema.Union([
    LandingResolvedImage,
    LandingBundledAsset,
])
export type PublishedLandingImage = typeof PublishedLandingImage.Type

export const LandingAction = Schema.Struct({
    label: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
    href: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(2_000)),
    style: Schema.Literals(["primary", "secondary", "link"]),
})
export type LandingAction = typeof LandingAction.Type

const LandingIntroBlock = Schema.Struct({
    _tag: Schema.Literal("Intro"),
    id: LandingBlockId,
    eyebrow: Schema.optional(Schema.String.check(Schema.isMaxLength(100))),
    heading: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(500)
    ),
    body: Schema.String.check(Schema.isMaxLength(5_000)),
})

const LandingRichTextBlock = Schema.Struct({
    _tag: Schema.Literal("RichText"),
    id: LandingBlockId,
    document: RichTextDocument,
})

const LandingFeatureGridBlock = Schema.Struct({
    _tag: Schema.Literal("FeatureGrid"),
    id: LandingBlockId,
    heading: Schema.optional(Schema.String.check(Schema.isMaxLength(500))),
    items: Schema.Array(
        Schema.Struct({
            heading: Schema.String.check(
                Schema.isMinLength(1),
                Schema.isMaxLength(200)
            ),
            body: Schema.String.check(Schema.isMaxLength(2_000)),
        })
    ).check(Schema.isMaxLength(12)),
})

const LandingFaqBlock = Schema.Struct({
    _tag: Schema.Literal("Faq"),
    id: LandingBlockId,
    heading: Schema.optional(Schema.String.check(Schema.isMaxLength(500))),
    items: Schema.Array(
        Schema.Struct({
            question: Schema.String.check(
                Schema.isMinLength(1),
                Schema.isMaxLength(500)
            ),
            answer: Schema.String.check(Schema.isMaxLength(5_000)),
        })
    ).check(Schema.isMaxLength(30)),
})

const LandingCtaBlock = Schema.Struct({
    _tag: Schema.Literal("Cta"),
    id: LandingBlockId,
    heading: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(500)
    ),
    body: Schema.String.check(Schema.isMaxLength(5_000)),
    actions: Schema.Array(LandingAction).check(Schema.isMaxLength(3)),
})

const landing_blocks = <A, E>(image: Schema.Codec<A, E, never, never>) => {
    const Hero = Schema.Struct({
        _tag: Schema.Literal("Hero"),
        id: LandingBlockId,
        eyebrow: Schema.optional(Schema.String.check(Schema.isMaxLength(100))),
        heading: Schema.String.check(
            Schema.isMinLength(1),
            Schema.isMaxLength(500)
        ),
        body: Schema.String.check(Schema.isMaxLength(5_000)),
        actions: Schema.Array(LandingAction).check(Schema.isMaxLength(3)),
        image: Schema.optional(image),
    })
    const LogoGrid = Schema.Struct({
        _tag: Schema.Literal("LogoGrid"),
        id: LandingBlockId,
        heading: Schema.optional(Schema.String.check(Schema.isMaxLength(500))),
        logos: Schema.Array(
            Schema.Struct({
                name: Schema.String.check(
                    Schema.isMinLength(1),
                    Schema.isMaxLength(100)
                ),
                image,
            })
        ).check(Schema.isMaxLength(24)),
    })
    return Schema.Union([
        Hero,
        LandingIntroBlock,
        LandingRichTextBlock,
        LandingFeatureGridBlock,
        LogoGrid,
        LandingFaqBlock,
        LandingCtaBlock,
    ])
}

export const LandingBlock = landing_blocks(LandingImage)
export type LandingBlock = typeof LandingBlock.Type

export const PublishedLandingBlock = landing_blocks(PublishedLandingImage)
export type PublishedLandingBlock = typeof PublishedLandingBlock.Type

export const LandingPageDocument = Schema.Struct({
    schema_version: Schema.Literal(1),
    preset_id: Schema.optional(LandingPresetId),
    motion: Schema.optional(LandingMotion),
    blocks: Schema.Array(LandingBlock).check(Schema.isMaxLength(40)),
}).check(
    Schema.makeFilter(
        (document) =>
            new Set(document.blocks.map((block) => block.id)).size ===
            document.blocks.length
    )
)
export type LandingPageDocument = typeof LandingPageDocument.Type

export const PublishedLandingPageDocument = Schema.Struct({
    schema_version: Schema.Literal(1),
    preset_id: Schema.optional(LandingPresetId),
    motion: Schema.optional(LandingMotion),
    blocks: Schema.Array(PublishedLandingBlock).check(Schema.isMaxLength(40)),
}).check(
    Schema.makeFilter(
        (document) =>
            new Set(document.blocks.map((block) => block.id)).size ===
            document.blocks.length
    )
)
export type PublishedLandingPageDocument =
    typeof PublishedLandingPageDocument.Type

export class LandingPageDecodeError extends Schema.TaggedError<LandingPageDecodeError>()(
    "LandingPageDecodeError",
    { message: Schema.String }
) {}

const decode_landing_json = <A, E>(schema: Schema.Codec<A, E, never, never>) =>
    Effect.fn("LandingPage.decode")(function* (content: string) {
        const parsed = yield* Effect.try({
            try: () => JSON.parse(content),
            catch: () =>
                new LandingPageDecodeError({
                    message: "Landing page content is not valid JSON",
                }),
        })
        return yield* Schema.decodeUnknownEffect(schema)(parsed).pipe(
            Effect.mapError(
                () =>
                    new LandingPageDecodeError({
                        message:
                            "Landing page content does not match schema version 1",
                    })
            )
        )
    })

export const decodeLandingPageContent = decode_landing_json(LandingPageDocument)
export const decodePublishedLandingPageContent = decode_landing_json(
    PublishedLandingPageDocument
)

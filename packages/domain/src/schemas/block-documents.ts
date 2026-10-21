import { Effect, Schema } from "effect"

import {
    EVENT_ACTION_FIELDS,
    EVENT_IMAGE_FIELDS,
    EVENT_LIST_FIELDS,
    EVENT_PLACE_FIELDS,
    EVENT_PROSE_FIELDS,
} from "../detail-layout.ts"
import { RequiredSafeHref } from "./links.ts"
import { RichTextDocument } from "./rich-text.ts"

/**
 * The `content_type` a page row carries when its body is a block document.
 *
 * **The literal is a stored value and the name is not.** `"landing_json"` sits
 * in `pages.content_type` on every composed row, so changing it is a data
 * migration rather than a rename; the identifier moved to say what the format
 * actually is — a document of blocks for any composed page, not a landing
 * page — and the string stayed where the rows left it.
 */
export const BlockDocumentContentType = Schema.Literal("landing_json")
export type BlockDocumentContentType = typeof BlockDocumentContentType.Type

export const PageBlockId = Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(100),
    Schema.isPattern(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
)
export type PageBlockId = typeof PageBlockId.Type

export const BlockPresetId = Schema.Literals([
    "marketing_starter",
    "urm_marketing",
])
export type BlockPresetId = typeof BlockPresetId.Type

export const BlockMotion = Schema.Literals(["none", "fade", "rise", "stagger"])
export type BlockMotion = typeof BlockMotion.Type

export const UrmBundledAssetId = Schema.Literals([
    "urm.integration.bento",
    "urm.integration.instagram",
    "urm.integration.polar",
    "urm.integration.stripe",
])
export type UrmBundledAssetId = typeof UrmBundledAssetId.Type

export const BlockDomainImage = Schema.Struct({
    _tag: Schema.Literal("DomainImage"),
    image_id: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(200)
    ),
    alt: Schema.String.check(Schema.isMaxLength(500)),
})
export type BlockDomainImage = typeof BlockDomainImage.Type

export const BlockBundledAsset = Schema.Struct({
    _tag: Schema.Literal("BundledAsset"),
    asset_id: UrmBundledAssetId,
    alt: Schema.String.check(Schema.isMaxLength(500)),
})
export type BlockBundledAsset = typeof BlockBundledAsset.Type

export const BlockResolvedImage = Schema.Struct({
    _tag: Schema.Literal("ResolvedImage"),
    src: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(2_000)),
    alt: Schema.String.check(Schema.isMaxLength(500)),
    width: Schema.optional(Schema.Number),
    height: Schema.optional(Schema.Number),
})
export type BlockResolvedImage = typeof BlockResolvedImage.Type

export const BlockImage = Schema.Union([BlockDomainImage, BlockBundledAsset])
export type BlockImage = typeof BlockImage.Type

export const PublishedBlockImage = Schema.Union([
    BlockResolvedImage,
    BlockBundledAsset,
])
export type PublishedBlockImage = typeof PublishedBlockImage.Type

/**
 * Call-to-action in a landing block. href is a RequiredSafeHref rather than a
 * plain string: landing_json is one of the two forms a published page may
 * hold, so a javascript: destination here would reach a public template with
 * no markup involved at all.
 */
export const BlockAction = Schema.Struct({
    label: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
    href: RequiredSafeHref,
    style: Schema.Literals(["primary", "secondary", "link"]),
})
export type BlockAction = typeof BlockAction.Type

const IntroBlock = Schema.Struct({
    _tag: Schema.Literal("Intro"),
    id: PageBlockId,
    eyebrow: Schema.optional(Schema.String.check(Schema.isMaxLength(100))),
    heading: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(500)
    ),
    body: Schema.String.check(Schema.isMaxLength(5_000)),
})

const RichTextBlock = Schema.Struct({
    _tag: Schema.Literal("RichText"),
    id: PageBlockId,
    document: RichTextDocument,
})

const FeatureGridBlock = Schema.Struct({
    _tag: Schema.Literal("FeatureGrid"),
    id: PageBlockId,
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

const FaqBlock = Schema.Struct({
    _tag: Schema.Literal("Faq"),
    id: PageBlockId,
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

const CtaBlock = Schema.Struct({
    _tag: Schema.Literal("Cta"),
    id: PageBlockId,
    heading: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(500)
    ),
    body: Schema.String.check(Schema.isMaxLength(5_000)),
    actions: Schema.Array(BlockAction).check(Schema.isMaxLength(3)),
})

/**
 * What a collection block pulls.
 *
 * A tagged union of one case rather than a bare literal, because the set is
 * going to grow and the shape of the growth is already known: a tag filter is
 * a field on a case, and another collection is another case.
 * `styleguide/content-composition.md` sets the rule that decides which cases
 * may ever exist — **a collection is publishable exactly when it has a
 * declared projection**, and the block picker offers precisely that set, so
 * nobody can compose their way into exposing a field. `PublicEventCard` in
 * `apps/web/src/siteData.ts` is the one projection there is.
 *
 * `SiteEvents` carries nothing. It means this site's published calendar, in
 * the order `events.publicEvents` returns it. Filtering by tag is deliberately
 * absent rather than stubbed: `EntityTag` is already entity-agnostic, so it
 * needs no storage and nothing has to be guessed now to allow it later.
 */
export const CollectionSource = Schema.Union([
    Schema.Struct({ _tag: Schema.Literal("SiteEvents") }),
])
export type CollectionSource = typeof CollectionSource.Type

/**
 * How a collection block shows what it pulled.
 *
 * Grouped under one field rather than spread across the block, which is the
 * one thing `styleguide/content-composition.md` asks of this half: "image
 * size" and "map zoom" are the first two of a long tail, and a block that
 * grows them one at a time has nowhere to put the twentieth. A content block's
 * fields are its words; a collection block's are a query and a presentation,
 * and keeping the second named is what stops the two running together.
 */
export const EventListOptions = Schema.Struct({
    /** How many to show, or absent for all of them.
     *
     *  Absent rather than a default, because a cap chosen here would be a
     *  number nobody picked: a venue with four events wants four, and a
     *  touring musician putting their next six on an About page wants to say
     *  six. The renderer takes the first `limit` of whatever the query
     *  returned — which ordering that is belongs to the query, not here. */
    limit: Schema.optional(
        Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 48 }))
    ),
    /** Whether a card draws the event's poster.
     *
     *  Required rather than optional: an events index is a list of posters and
     *  a three-line mention on an About page is not, so which one this is is a
     *  decision the author makes rather than one a default makes for them. */
    images: Schema.Boolean,
})
export type EventListOptions = typeof EventListOptions.Type

/**
 * The first collection block: a list of this site's events.
 *
 * The one block here that carries a query rather than its own words, which is
 * the split `styleguide/content-composition.md` draws — and it is why it is
 * shaped `{ _tag, id, source, options }` while its neighbours are flat. It
 * holds no event data at all: the Worker resolves `source` against the
 * projection and hands the renderer cards, so a page composed today shows
 * whatever the calendar says when it is requested.
 *
 * Declared out here with the other image-free blocks, so both the draft and
 * the published union get it from one definition.
 */
const EventListBlock = Schema.Struct({
    _tag: Schema.Literal("EventList"),
    id: PageBlockId,
    heading: Schema.optional(Schema.String.check(Schema.isMaxLength(500))),
    source: CollectionSource,
    options: EventListOptions,
})

const page_blocks = <A, E>(image: Schema.Codec<A, E, never, never>) => {
    const Hero = Schema.Struct({
        _tag: Schema.Literal("Hero"),
        id: PageBlockId,
        eyebrow: Schema.optional(Schema.String.check(Schema.isMaxLength(100))),
        heading: Schema.String.check(
            Schema.isMinLength(1),
            Schema.isMaxLength(500)
        ),
        body: Schema.String.check(Schema.isMaxLength(5_000)),
        actions: Schema.Array(BlockAction).check(Schema.isMaxLength(3)),
        image: Schema.optional(image),
    })
    const LogoGrid = Schema.Struct({
        _tag: Schema.Literal("LogoGrid"),
        id: PageBlockId,
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
        IntroBlock,
        RichTextBlock,
        FeatureGridBlock,
        LogoGrid,
        FaqBlock,
        CtaBlock,
        EventListBlock,
    ])
}

export const PageBlock = page_blocks(BlockImage)
export type PageBlock = typeof PageBlock.Type

export const PublishedPageBlock = page_blocks(PublishedBlockImage)
export type PublishedPageBlock = typeof PublishedPageBlock.Type

export const BlockDocument = Schema.Struct({
    schema_version: Schema.Literal(1),
    preset_id: Schema.optional(BlockPresetId),
    motion: Schema.optional(BlockMotion),
    blocks: Schema.Array(PageBlock).check(Schema.isMaxLength(40)),
}).check(
    Schema.makeFilter(
        (document) =>
            new Set(document.blocks.map((block) => block.id)).size ===
            document.blocks.length
    )
)
export type BlockDocument = typeof BlockDocument.Type

export const PublishedBlockDocument = Schema.Struct({
    schema_version: Schema.Literal(1),
    preset_id: Schema.optional(BlockPresetId),
    motion: Schema.optional(BlockMotion),
    blocks: Schema.Array(PublishedPageBlock).check(Schema.isMaxLength(40)),
}).check(
    Schema.makeFilter(
        (document) =>
            new Set(document.blocks.map((block) => block.id)).size ===
            document.blocks.length
    )
)
export type PublishedBlockDocument = typeof PublishedBlockDocument.Type

export class BlockDocumentDecodeError extends Schema.TaggedError<BlockDocumentDecodeError>()(
    "BlockDocumentDecodeError",
    { message: Schema.String }
) {}

const decode_block_document = <A, E>(
    schema: Schema.Codec<A, E, never, never>
) =>
    Effect.fn("BlockDocument.decode")(function* (content: string) {
        const parsed = yield* Effect.try({
            try: () => JSON.parse(content),
            catch: () =>
                new BlockDocumentDecodeError({
                    message: "Block document content is not valid JSON",
                }),
        })
        return yield* Schema.decodeUnknownEffect(schema)(parsed).pipe(
            Effect.mapError(
                () =>
                    new BlockDocumentDecodeError({
                        message:
                            "Block document content does not match schema version 1",
                    })
            )
        )
    })

export const decodeBlockDocumentContent = decode_block_document(BlockDocument)
export const decodePublishedBlockDocumentContent = decode_block_document(
    PublishedBlockDocument
)

/* ------------------------------------------------------------------------ *
 * Field blocks: a record's own page
 * ------------------------------------------------------------------------ */

/**
 * Which record a field block draws from.
 *
 * **A union of one, left open on purpose** — the same shape, for the same
 * reason, as {@link CollectionSource} one screen up. A collection block names
 * a query; a field block names a *field of the record the page is generated
 * for*, which `styleguide/content-composition.md` calls "a reference rather
 * than a value" and identifies as the thing a block cannot otherwise be.
 *
 * `SiteEvent` is the only member because `PublicEventPage` is the only
 * projection a detail page has. Tenant-defined entities are coming, and when
 * one arrives it is a second member here — `{ _tag: "Object", object, field }`
 * — and every block below binds to it without changing shape. That is the
 * whole reason the reference is a union rather than a bare field name.
 *
 * Generic over the field so each render kind takes only the fields it can
 * actually draw: a map bound to a title is a decode error rather than a block
 * that silently renders nothing. `page_blocks` is parameterised over its image
 * shape for the same reason, and this follows it.
 */
const field_ref = <F, E>(field: Schema.Codec<F, E, never, never>) =>
    Schema.Union([Schema.Struct({ _tag: Schema.Literal("SiteEvent"), field })])

/** A particular: one row of a field list. */
export const ListFieldRef = field_ref(Schema.Literals(EVENT_LIST_FIELDS))
export type ListFieldRef = typeof ListFieldRef.Type

/** A block of prose. */
export const ProseFieldRef = field_ref(Schema.Literals(EVENT_PROSE_FIELDS))
export type ProseFieldRef = typeof ProseFieldRef.Type

/** A picture. */
export const ImageFieldRef = field_ref(Schema.Literals(EVENT_IMAGE_FIELDS))
export type ImageFieldRef = typeof ImageFieldRef.Type

/** A place on Earth. */
export const PlaceFieldRef = field_ref(Schema.Literals(EVENT_PLACE_FIELDS))
export type PlaceFieldRef = typeof PlaceFieldRef.Type

/** Somewhere a visitor can be sent. */
export const ActionFieldRef = field_ref(Schema.Literals(EVENT_ACTION_FIELDS))
export type ActionFieldRef = typeof ActionFieldRef.Type

/** What the author calls a particular, where the default is not their word.
 *
 *  Capped shorter than a heading because it is a `dt` in a strip of them, and
 *  non-empty because an absent label means "use the default" — which is the
 *  field being left out rather than set to "". */
const FieldLabel = Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(100)
)

/** The page's own title, and the date under it.
 *
 *  Exactly one of these is required in a document — see {@link EventDetailDocument}
 *  — because an `h1` is what makes a page a page. It is the one block the
 *  composer does not offer and does not let go of. */
const FieldHeadingBlock = Schema.Struct({
    _tag: Schema.Literal("FieldHeading"),
    id: PageBlockId,
    field: ListFieldRef,
    /** The second line. Absent draws the title alone — a record with no date
     *  worth showing is an ordinary thing once this is not only events. */
    date: Schema.optional(ListFieldRef),
})

/** A field drawn as paragraphs. */
const FieldProseBlock = Schema.Struct({
    _tag: Schema.Literal("FieldProse"),
    id: PageBlockId,
    field: ProseFieldRef,
    /** Names the section for a screen reader without drawing a heading over
     *  one block of prose — `site-event/index.marko` argues for that, and the
     *  argument is why this is a label rather than a `heading`. */
    label: Schema.optional(FieldLabel),
})

/** Several fields drawn as a strip of label-and-value pairs. */
const FieldListBlock = Schema.Struct({
    _tag: Schema.Literal("FieldList"),
    id: PageBlockId,
    fields: Schema.Array(
        Schema.Struct({
            field: ListFieldRef,
            label: Schema.optional(FieldLabel),
        })
    ).check(Schema.isMinLength(1), Schema.isMaxLength(12)),
})

/** A field drawn as the page's primary action. */
const FieldActionBlock = Schema.Struct({
    _tag: Schema.Literal("FieldAction"),
    id: PageBlockId,
    field: ActionFieldRef,
    label: Schema.optional(FieldLabel),
})

/** A field drawn as a picture. */
const FieldImageBlock = Schema.Struct({
    _tag: Schema.Literal("FieldImage"),
    id: PageBlockId,
    field: ImageFieldRef,
})

/** A field drawn as a map of where it is. */
const FieldMapBlock = Schema.Struct({
    _tag: Schema.Literal("FieldMap"),
    id: PageBlockId,
    field: PlaceFieldRef,
    label: Schema.optional(FieldLabel),
})

/** A field drawn as the forecast where it is. */
const FieldForecastBlock = Schema.Struct({
    _tag: Schema.Literal("FieldForecast"),
    id: PageBlockId,
    field: PlaceFieldRef,
    label: Schema.optional(FieldLabel),
})

/**
 * A block that binds to the record its page is generated for.
 *
 * **Kept out of {@link PageBlock} deliberately.** An ordinary page's body has
 * no record to bind to, so a field block stored in `pages.content` would name
 * a field of nothing. Two unions rather than one is what makes that a decode
 * error instead of a renderer deciding what to do about it — and it is why
 * `pages.detail_content` is a separate column rather than a flag on the body.
 *
 * The names say what they render, not what they render it from: a detail page
 * for a tenant-defined object will use the same seven.
 */
export const EventDetailBlock = Schema.Union([
    FieldHeadingBlock,
    FieldProseBlock,
    FieldListBlock,
    FieldActionBlock,
    FieldImageBlock,
    FieldMapBlock,
    FieldForecastBlock,
])
export type EventDetailBlock = typeof EventDetailBlock.Type

/**
 * A composed detail layout: field blocks and ordinary content blocks in one
 * list.
 *
 * Both kinds, because a tenant may want a standing note or a call to action
 * under every event — those carry their own words and are the blocks a page
 * already has. The field blocks carry references. Nothing else distinguishes
 * them here; the renderer groups them and `siteData.ts` resolves them.
 *
 * Two filters rather than one:
 *
 * - **Unique ids**, which is `BlockDocument`'s own and is what the composer's
 *   `freshBlockId` counts against.
 * - **Exactly one heading**, which is this document's alone. A detail page is
 *   generated per record and its `h1` is the record's name; a layout with none
 *   would render a page with no title, and a layout with two would render two
 *   `h1`s on one document. Neither is a thing to let a tenant compose by
 *   accident, and the composer therefore neither offers a heading in its
 *   picker nor lets the one that is there be removed.
 */
const detail_document = <A, E>(image: Schema.Codec<A, E, never, never>) =>
    Schema.Struct({
        schema_version: Schema.Literal(1),
        blocks: Schema.Array(
            Schema.Union([page_blocks(image), EventDetailBlock])
        ).check(Schema.isMaxLength(40)),
    }).check(
        Schema.makeFilter(
            (document) =>
                new Set(document.blocks.map((b) => b.id)).size ===
                document.blocks.length
        ),
        Schema.makeFilter(
            (document) =>
                document.blocks.filter((b) => b._tag === "FieldHeading")
                    .length === 1
        )
    )

export const EventDetailDocument = detail_document(BlockImage)
export type EventDetailDocument = typeof EventDetailDocument.Type

export const PublishedEventDetailDocument = detail_document(PublishedBlockImage)
export type PublishedEventDetailDocument =
    typeof PublishedEventDetailDocument.Type

/** The stored layout, decoded. Tolerant in the same way the body decoders are:
 *  the caller falls back to `DEFAULT_EVENT_DETAIL_LAYOUT` on a failure, so a
 *  corrupt column costs the composition and not the page. */
export const decodeEventDetailContent =
    decode_block_document(EventDetailDocument)
export const decodePublishedEventDetailContent = decode_block_document(
    PublishedEventDetailDocument
)

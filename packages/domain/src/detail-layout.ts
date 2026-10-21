/**
 * What a record's own public page is made of, and what it falls back to.
 *
 * **Its own module, importing nothing at runtime, for the reason
 * `event-fields.ts` is its own module.** `schemas/block-documents.ts` beside it
 * builds Schemas when it loads, and the Worker reads
 * {@link DEFAULT_EVENT_DETAIL_LAYOUT} on every detail page that has not been
 * composed — which is all of them until somebody composes one. A value import
 * reaching these names through the schema module would carry Effect onto a
 * public page, which `scripts/check-public-bundle.mjs` fails the build over.
 * That script's header lists three separate times this has happened.
 *
 * The `import type` below is erased, so it costs nothing at runtime; it is what
 * makes `satisfies` able to check the constant against the union it has to
 * decode as.
 */

import type { EventDetailBlock } from "./schemas/block-documents.ts"

/**
 * The particulars of an event a field list may draw, as the author picks them.
 *
 * **Hand-kept, like `BLOCK_KINDS`, and for a stronger version of the same
 * reason.** That list's comment says "being a block in the schema is not being
 * offerable in the picker"; this one decides which columns of a CRM record are
 * publishable at all. `styleguide/content-composition.md` makes that the rule
 * for collections — "a collection is publishable exactly when it has a declared
 * projection, and the block picker offers precisely that set" — and a detail
 * page is where the same discipline has to hold field by field. Nobody can
 * compose their way into exposing a column by adding it to the projection.
 *
 * These are **particulars, not column names.** `venue` is the venue, drawn as
 * its name and linked where the row has a URL for it — one thing a reader sees,
 * out of two columns. Naming them after what the page shows rather than after
 * what the table stores is what lets the same list survive a schema change
 * underneath it.
 */
export const EVENT_LIST_FIELDS = [
    "title",
    "date",
    "time",
    "venue",
    "start",
    "end",
    "tickets",
] as const

/** The event's prose. One today, and a list because a second — a line-up, a
 *  programme note — is a column away and would need no other change here. */
export const EVENT_PROSE_FIELDS = ["description"] as const

/** The event's pictures. `flyer` is `image_url`, named for what it is on the
 *  page rather than for the column, like the particulars above. */
export const EVENT_IMAGE_FIELDS = ["flyer"] as const

/** The event's places. A pair of columns behind one name — `eventPlace` in
 *  `event-fields.ts` is what turns them into a position or into nothing. */
export const EVENT_PLACE_FIELDS = ["place"] as const

/** The event's destinations: a field a visitor can be sent to. Both are URLs
 *  the row may not have, and a block bound to an absent one renders nothing
 *  rather than an empty button. */
export const EVENT_ACTION_FIELDS = ["tickets", "venue"] as const

/** What a particular is called when the author has not renamed it.
 *
 *  The template's own words, lifted rather than reinvented, so an uncomposed
 *  page says exactly what it said before. A `label` on the stored entry
 *  overrides it — a musician whose "venue" is a festival stage wants to say
 *  so — which is the one thing a field list carries that is not a reference. */
export const EVENT_FIELD_LABELS = {
    title: "Title",
    date: "Date",
    time: "Time",
    venue: "Venue",
    start: "Start",
    end: "End",
    tickets: "Tickets",
} as const satisfies Readonly<
    Record<(typeof EVENT_LIST_FIELDS)[number], string>
>

/**
 * The page an event has when nobody has composed one.
 *
 * **This is what makes the feature need no migration, and it is the whole of
 * why.** `pages.detail_content` is optional; a site that has never opened the
 * composer has no row to read, so the Worker reads this instead and renders
 * exactly what the hand-written template rendered before it was taken apart.
 * Nothing is written to the database for an existing site, and nothing has to
 * be. If this constant is ever wrong, the fix is this constant — a backfill
 * would be the same mistake written into every row.
 *
 * **The order is read off what the page used to be**, section for section:
 * the title and date, the prose, the strip of particulars, the action, the
 * flyer, then the location and the forecast. `site-event/index.marko`'s header
 * argues for that order and still does; this is the same order expressed as
 * data.
 *
 * The ids are the section names rather than `heading-1`, `prose-1`. They are
 * only ever compared for uniqueness, they appear in a tenant's saved JSON the
 * moment they edit this page, and a body people read is the reason
 * `freshBlockId` counts up in words rather than hashing.
 */
export const DEFAULT_EVENT_DETAIL_LAYOUT = [
    {
        _tag: "FieldHeading",
        id: "heading",
        field: { _tag: "SiteEvent", field: "title" },
        date: { _tag: "SiteEvent", field: "date" },
    },
    {
        _tag: "FieldProse",
        id: "description",
        field: { _tag: "SiteEvent", field: "description" },
        label: "Description",
    },
    {
        _tag: "FieldList",
        id: "details",
        fields: [
            { field: { _tag: "SiteEvent", field: "venue" } },
            { field: { _tag: "SiteEvent", field: "start" } },
            { field: { _tag: "SiteEvent", field: "end" } },
            { field: { _tag: "SiteEvent", field: "tickets" } },
        ],
    },
    {
        _tag: "FieldAction",
        id: "action",
        field: { _tag: "SiteEvent", field: "tickets" },
        label: "Get tickets",
    },
    {
        _tag: "FieldImage",
        id: "flyer",
        field: { _tag: "SiteEvent", field: "flyer" },
    },
    {
        _tag: "FieldMap",
        id: "map",
        field: { _tag: "SiteEvent", field: "place" },
        label: "Location",
    },
    {
        _tag: "FieldForecast",
        id: "forecast",
        field: { _tag: "SiteEvent", field: "place" },
        label: "Weather at venue",
    },
] as const satisfies ReadonlyArray<EventDetailBlock>

import { Effect, Layer, Schema as S } from "effect"
import {
    IndexedDb,
    IndexedDbDatabase,
    IndexedDbTable,
    IndexedDbVersion,
} from "@effect/platform-browser"

import { Activity, Contact } from "../crm/crm.domain.ts"

// Deliberately narrower than the crm-indexeddb schema. That demo is about how a
// normalized store is joined; this one is about swapping the source a list is
// read from, so the local copy is stored in the shape the list renders and
// nothing else. Tag ids resolve against the TAGS constant in app code, which is
// not user data and never needs a store.
const SyncContactRow = S.Struct({
    ...Contact.fields,
    contactIndex: S.Number,
    tagIds: S.Array(S.String),
    latestActivity: Activity,
})

// hydratedContacts is the resume cursor: a reload mid-hydration continues from
// where it stopped rather than starting over.
const SyncMetadataRow = S.Struct({ id: S.String, hydratedContacts: S.Number })
// The local half of search. The server matches word prefixes too, so the two
// sources answer identically; if they did not, the handover would change the
// results under the user.
const SyncTokenRow = S.Struct({
    id: S.String,
    contactId: S.String,
    token: S.String,
})

// Edits live beside the hydrated rows rather than inside them, and that
// placement is the whole write story. Hydration upserts generated rows in index
// order, so an edit written into `contacts` would be silently overwritten by a
// batch that had not reached that index yet — the race the demo's notes call
// "hydration overtaken by writes". A separate table cannot be overwritten by a
// batch that never touches it, so ordering between the two paths stops
// mattering instead of needing to be coordinated.
const SyncEditRow = S.Struct({ id: S.String, name: S.String })

// The tag facet, as a join table rather than a field on the contact row.
//
// The row already carries `tagIds`, so this is redundant as *data* — it exists
// only so the question "which contacts have this tag" is an index lookup rather
// than a scan of every contact. That is the whole trade a facet index is: a
// second copy of something you already have, written once on the fill, to turn
// a scan into a seek on every read after it.
const SyncTagLinkRow = S.Struct({
    id: S.String,
    contactId: S.String,
    tagId: S.String,
})

// The recency facet, keyed by contact so there is exactly one row per contact
// and the store can be range-scanned by age. `occurredDaysAgo` is denormalised
// off the row's latest activity for the same reason as above.
const SyncRecencyRow = S.Struct({ id: S.String, occurredDaysAgo: S.Number })

// The full history, which the row above deliberately does not carry. A detail
// view showing only the latest activity would be a thinner page than the demo's
// premise allows: after the swap, a contact has to open from the local copy
// like the list does, and offline, or the handover only half happened. Storing
// it costs three rows per contact on the fill, which is the point — the price
// of local-first is meant to be visible rather than hidden.
const SyncActivityRow = Activity

const Contacts = IndexedDbTable.make({
    name: "contacts",
    schema: SyncContactRow,
    keyPath: "id",
    indexes: { contactIndex: "contactIndex" },
})
const ContactTokens = IndexedDbTable.make({
    name: "contact_tokens",
    schema: SyncTokenRow,
    keyPath: "id",
    indexes: { token: "token" },
})
const ContactEdits = IndexedDbTable.make({
    name: "contact_edits",
    schema: SyncEditRow,
    keyPath: "id",
})
const Activities = IndexedDbTable.make({
    name: "activities",
    schema: SyncActivityRow,
    keyPath: "id",
    indexes: { contactId: "contactId" },
})
const ContactTags = IndexedDbTable.make({
    name: "contact_tags",
    schema: SyncTagLinkRow,
    keyPath: "id",
    indexes: { tagId: "tagId" },
})
const ContactRecency = IndexedDbTable.make({
    name: "contact_recency",
    schema: SyncRecencyRow,
    keyPath: "id",
    indexes: { occurredDaysAgo: "occurredDaysAgo" },
})
const Metadata = IndexedDbTable.make({
    name: "metadata",
    schema: SyncMetadataRow,
    keyPath: "id",
})

// Three versions, because object stores can only be created inside a
// `versionchange` transaction. A browser that has already run this demo holds
// an older database without the newer stores, and an initializer that has run
// once never runs there again — the first transaction naming a missing store
// fails with "One of the specified object stores was not found". That has
// already happened once on this demo.
//
// Each migration adds a store and touches nothing else, so the hydrated rows
// survive the upgrade. That matters more here than in most schemas: rebuilding
// them is the ten-second fill this demo exists to avoid.
const V1 = IndexedDbVersion.make(Contacts, ContactTokens, Metadata)
const V2 = IndexedDbVersion.make(
    Contacts,
    ContactTokens,
    ContactEdits,
    Metadata
)
const V3 = IndexedDbVersion.make(
    Contacts,
    ContactTokens,
    ContactEdits,
    Activities,
    Metadata
)
const V4 = IndexedDbVersion.make(
    Contacts,
    ContactTokens,
    ContactEdits,
    Activities,
    ContactTags,
    ContactRecency,
    Metadata
)

export class CrmSyncDb extends IndexedDbDatabase.make(V1, (transaction) =>
    Effect.gen(function* () {
        yield* transaction.createObjectStore("contacts")
        yield* transaction.createIndex("contacts", "contactIndex")
        yield* transaction.createObjectStore("contact_tokens")
        yield* transaction.createIndex("contact_tokens", "token")
        yield* transaction.createObjectStore("metadata")
    })
)
    .add(V2, (_from, to) =>
        Effect.asVoid(to.createObjectStore("contact_edits"))
    )
    // An upgrade from V2 arrives with contacts already written, and their
    // activities are not among them. The store is created empty and the fill
    // rewrites it — the resume cursor is reset by the same migration so the
    // hydration that follows covers every contact rather than resuming past
    // the ones whose activities were never stored.
    .add(V3, (_from, to) =>
        Effect.gen(function* () {
            yield* to.createObjectStore("activities")
            yield* to.createIndex("activities", "contactId")
            yield* to
                .from("metadata")
                .upsert({ id: "cursor", hydratedContacts: 0 })
        })
    )
    // The two facet indexes, added for the same reason and at the same cost as
    // V3: the stores arrive empty, so the cursor is reset and the fill rewrites
    // every contact. Two more rows per contact on the way in — roughly a tag
    // link and a recency row each — bought so a tag or a recency filter is a
    // seek instead of a scan.
    .add(V4, (_from, to) =>
        Effect.gen(function* () {
            yield* to.createObjectStore("contact_tags")
            yield* to.createIndex("contact_tags", "tagId")
            yield* to.createObjectStore("contact_recency")
            yield* to.createIndex("contact_recency", "occurredDaysAgo")
            yield* to
                .from("metadata")
                .upsert({ id: "cursor", hydratedContacts: 0 })
        })
    ) {}

export const databaseLayer = CrmSyncDb.layer("urm-crm-sync-v1").pipe(
    Layer.provide(IndexedDb.layerWindow)
)

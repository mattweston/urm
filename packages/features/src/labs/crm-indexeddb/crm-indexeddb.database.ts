import { Effect, Layer, Schema as S } from "effect"
import {
    IndexedDb,
    IndexedDbDatabase,
    IndexedDbTable,
    IndexedDbVersion,
} from "@effect/platform-browser"

import { Activity, Contact, Tag } from "../crm/crm.domain.ts"
import { DatasetSize } from "../crm/crm.model.ts"

// tagIds and latestActivity are derived: contact_tags and activities remain the
// source of truth and still back the facet indexes, but the read-optimized copy
// lets a page of contacts be joined without a request per row. Real local-first
// stores do this, because IndexedDB has no join and no multi-key get: you pay at
// read time, or you maintain derived fields in the write transaction.
const ContactRow = S.Struct({
    ...Contact.fields,
    contactIndex: S.Number,
    tagIds: S.Array(S.String),
    latestActivity: Activity,
})
const TagLinkRow = S.Struct({
    id: S.String,
    contactId: S.String,
    tagId: S.String,
})
const ActivityRow = S.Struct({ ...Activity.fields })
const RecencyRow = S.Struct({
    id: S.String,
    contactId: S.String,
    occurredDaysAgo: S.Number,
})
// IndexedDB has no text index, so one is materialized: a row per search token
// per contact, with the token indexed. A prefix query is then a bounded range
// scan over that index instead of a cursor walk of every contact.
const TokenRow = S.Struct({
    id: S.String,
    contactId: S.String,
    token: S.String,
})
const MetadataRow = S.Struct({
    id: S.String,
    size: DatasetSize,
    seededContacts: S.Number,
})

const Contacts = IndexedDbTable.make({
    name: "contacts",
    schema: ContactRow,
    keyPath: "id",
    indexes: { contactIndex: "contactIndex" },
})
const Tags = IndexedDbTable.make({ name: "tags", schema: Tag, keyPath: "id" })
const ContactTags = IndexedDbTable.make({
    name: "contact_tags",
    schema: TagLinkRow,
    keyPath: "id",
    indexes: { tagId: "tagId", contactId: "contactId" },
})
const Activities = IndexedDbTable.make({
    name: "activities",
    schema: ActivityRow,
    keyPath: "id",
    indexes: { contactId: "contactId", occurredDaysAgo: "occurredDaysAgo" },
})
const ContactRecency = IndexedDbTable.make({
    name: "contact_recency",
    schema: RecencyRow,
    keyPath: "id",
    indexes: { occurredDaysAgo: "occurredDaysAgo" },
})
const ContactTokens = IndexedDbTable.make({
    name: "contact_tokens",
    schema: TokenRow,
    keyPath: "id",
    indexes: { token: "token" },
})
const Metadata = IndexedDbTable.make({
    name: "metadata",
    schema: MetadataRow,
    keyPath: "id",
})

const Version = IndexedDbVersion.make(
    Contacts,
    Tags,
    ContactTags,
    Activities,
    ContactRecency,
    ContactTokens,
    Metadata
)

export class CrmIndexedDb extends IndexedDbDatabase.make(
    Version,
    (transaction) =>
        Effect.gen(function* () {
            yield* transaction.createObjectStore("contacts")
            yield* transaction.createIndex("contacts", "contactIndex")
            yield* transaction.createObjectStore("tags")
            yield* transaction.createObjectStore("contact_tags")
            yield* transaction.createIndex("contact_tags", "tagId")
            yield* transaction.createIndex("contact_tags", "contactId")
            yield* transaction.createObjectStore("activities")
            yield* transaction.createIndex("activities", "contactId")
            yield* transaction.createIndex("activities", "occurredDaysAgo")
            yield* transaction.createObjectStore("contact_recency")
            yield* transaction.createIndex("contact_recency", "occurredDaysAgo")
            yield* transaction.createObjectStore("contact_tokens")
            yield* transaction.createIndex("contact_tokens", "token")
            yield* transaction.createObjectStore("metadata")
        })
) {}

// v3 added the derived contact fields and the token index, so an earlier
// database reseeds once.
export const databaseLayer = CrmIndexedDb.layer("urm-crm-indexeddb-v3").pipe(
    Layer.provide(IndexedDb.layerWindow)
)

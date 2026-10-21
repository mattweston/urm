import { Array, Option, Schema as S, pipe } from "effect"

import { Activity, Contact, Tag, TAGS } from "../crm/crm.domain.ts"
import type {
    RemoteContactRow,
    RemoteContactsPage,
} from "../crm-remote/crm-remote.domain.ts"

// The normalized store: one row per entity, keyed by id. Everything else in
// this demo holds ids and resolves them through here.
export const NormalizedStore = S.Struct({
    contactsById: S.Record(S.String, Contact),
    tagsById: S.Record(S.String, Tag),
    tagIdsByContact: S.Record(S.String, S.Array(S.String)),
    latestActivityByContact: S.Record(S.String, Activity),
})

export type NormalizedStore = typeof NormalizedStore.Type

// The tag vocabulary is fixed and the facet list already renders from it, so
// the store starts holding it. Contacts, their tag ids, and their latest
// activity all arrive one page at a time.
export const INITIAL_STORE: NormalizedStore = {
    contactsById: {},
    tagsById: Object.fromEntries(Array.map(TAGS, (tag) => [tag.id, tag])),
    tagIdsByContact: {},
    latestActivityByContact: {},
}

// A cache entry. It holds the ids the query matched on that page, never the
// rows themselves, so two queries that both matched a contact point at the one
// copy of it in the store.
export const ContactPage = S.Struct({
    contactIds: S.Array(S.String),
    totalMatches: S.Number,
    page: S.Number,
    queryPlan: S.String,
    hasNextPage: S.Boolean,
})

export type ContactPage = typeof ContactPage.Type

export type ResolvedRow = Readonly<{
    contact: Contact
    tags: ReadonlyArray<Tag>
    latestActivity: Activity
}>

export const pageOfIds = (response: RemoteContactsPage): ContactPage => ({
    contactIds: Array.map(response.rows, (row) => row.contact.id),
    totalMatches: response.totalMatches,
    page: response.page,
    queryPlan: response.queryPlan,
    hasNextPage: response.hasNextPage,
})

const recordFrom = <Value>(
    rows: ReadonlyArray<RemoteContactRow>,
    toEntry: (row: RemoteContactRow) => readonly [string, Value]
): Readonly<Record<string, Value>> =>
    Object.fromEntries(Array.map(rows, toEntry))

// Locally edited contacts are held back from the merge. The simulated backend
// has no write path, so a later response still carries its original copy of a
// row the user has already changed here.
export const mergeRows = (
    store: NormalizedStore,
    rows: ReadonlyArray<RemoteContactRow>,
    locallyEditedContactIds: ReadonlyArray<string>
): NormalizedStore => {
    const mergeable = Array.filter(
        rows,
        (row) => !locallyEditedContactIds.includes(row.contact.id)
    )
    const tags = Array.flatMap(rows, (row) => row.tags)

    return {
        contactsById: {
            ...store.contactsById,
            ...recordFrom(mergeable, (row) => [row.contact.id, row.contact]),
        },
        tagsById: {
            ...store.tagsById,
            ...Object.fromEntries(Array.map(tags, (tag) => [tag.id, tag])),
        },
        tagIdsByContact: {
            ...store.tagIdsByContact,
            ...recordFrom(mergeable, (row) => [
                row.contact.id,
                Array.map(row.tags, (tag) => tag.id),
            ]),
        },
        latestActivityByContact: {
            ...store.latestActivityByContact,
            ...recordFrom(mergeable, (row) => [
                row.contact.id,
                row.latestActivity,
            ]),
        },
    }
}

export const resolveRow = (
    store: NormalizedStore,
    contactId: string
): Option.Option<ResolvedRow> =>
    pipe(
        Option.fromNullishOr(store.contactsById[contactId]),
        Option.map((contact) => ({
            contact,
            tags: Array.getSomes(
                Array.map(store.tagIdsByContact[contactId] ?? [], (tagId) =>
                    Option.fromNullishOr(store.tagsById[tagId])
                )
            ),
            latestActivity: store.latestActivityByContact[contactId] ?? {
                id: `${contactId}-activity-fallback`,
                contactId,
                kind: "Email",
                summary: "No recent activity",
                occurredDaysAgo: 999,
            },
        }))
    )

export const storedContactCount = (store: NormalizedStore): number =>
    Object.keys(store.contactsById).length

export const renameContact = (
    store: NormalizedStore,
    contactId: string,
    name: string
): NormalizedStore =>
    Option.match(Option.fromNullishOr(store.contactsById[contactId]), {
        onNone: () => store,
        onSome: (contact) => ({
            ...store,
            contactsById: {
                ...store.contactsById,
                [contactId]: {
                    ...contact,
                    name,
                    searchText: `${name} ${contact.email}`.toLowerCase(),
                },
            },
        }),
    })

export const toggleContactTag = (
    store: NormalizedStore,
    contactId: string,
    tagId: string
): NormalizedStore => {
    const currentTagIds = store.tagIdsByContact[contactId] ?? []
    const nextTagIds = currentTagIds.includes(tagId)
        ? Array.filter(currentTagIds, (currentTagId) => currentTagId !== tagId)
        : [...currentTagIds, tagId]

    return {
        ...store,
        tagIdsByContact: { ...store.tagIdsByContact, [contactId]: nextTagIds },
    }
}

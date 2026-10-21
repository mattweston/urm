import {
    Array,
    type Cause,
    Duration,
    Effect,
    Option,
    Result,
    Schema as S,
} from "effect"
import { IndexedDbDatabase } from "@effect/platform-browser"
import { Command } from "foldkit"

import { TAGS, type Activity, type Tag } from "../crm/crm.domain.ts"
import {
    activitiesForContact,
    contactCountForDatasetSize,
    contactForIndex,
    contactIndexForId,
    tagIdsForIndex,
} from "../crm/crm.generate.ts"
import {
    matchesAllTerms,
    searchTermsFor,
    searchTokensFor,
} from "../crm/crm.search.ts"
import { maxActivityAgeDays } from "../crm/crm.model.ts"
import { SyncFilterSchema, type SyncFilter } from "./crm-sync.model.ts"
import { PAGE_SIZE } from "../crm-remote/crm-remote.domain.ts"
import { CrmSyncDb, databaseLayer } from "./crm-sync.database.ts"
import type { SyncContactDetail } from "./crm-sync.domain.ts"
import {
    CompletedSyncRebuild,
    ElapsedSyncSearchDebounce,
    FailedSyncOperation,
    SettledSyncContactDetail,
    SettledSyncContactWrite,
    SettledSyncEditsLoad,
    SettledSyncHydrationBatch,
    SettledSyncLocalPage,
    SettledSyncRemotePage,
} from "./crm-sync.message.ts"

export const DATASET_SIZE = "TenThousand" as const
export const TOTAL_CONTACTS = contactCountForDatasetSize(DATASET_SIZE)
export const HYDRATION_BATCH_SIZE = 500
// The batch size is a latency knob, not a detail: a readwrite transaction holds
// the store, so a bigger batch hydrates in fewer round trips but blocks reads
// for longer. This one is small enough that paging stays responsive while the
// fill runs.
const HYDRATION_LATENCY = Duration.millis(90)
const REMOTE_LATENCY = Duration.millis(280)
export const SEARCH_DEBOUNCE_MS = 350

// Debouncing matters more here than anywhere else in the set: before the swap
// every keystroke is a network round trip, and after it every keystroke is a
// local read. The same guard covers both.
const DebounceSyncSearch = Command.define("DebounceSyncSearch", {
    args: { value: S.String },
    messages: [ElapsedSyncSearchDebounce],
    execute: ({ value }) =>
        Effect.sleep(Duration.millis(SEARCH_DEBOUNCE_MS)).pipe(
            Effect.as(ElapsedSyncSearchDebounce({ value }))
        ),
})

const withDatabase = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(Effect.provide(databaseLayer))

const maybeFirst = <A, E, R>(
    effect: Effect.Effect<A, E | Cause.NoSuchElementError, R>
): Effect.Effect<Option.Option<A>, E, R> =>
    effect.pipe(
        Effect.map((row) => Option.some(row)),
        Effect.catchTag("NoSuchElementError", () =>
            Effect.succeed(Option.none<A>())
        )
    )

const tagsForIds = (tagIds: ReadonlyArray<string>): ReadonlyArray<Tag> =>
    Array.getSomes(
        Array.map(tagIds, (tagId) =>
            Option.fromNullishOr(TAGS.find((tag) => tag.id === tagId))
        )
    )

// The generator behind this is the same one the server reads from, so the local
// copy and the network answer are two views of one dataset rather than two
// datasets that happen to look alike.
const contactRowAt = (contactIndex: number) => {
    const contact = contactForIndex(contactIndex)
    const activities = activitiesForContact(contact.id, contactIndex)

    return {
        ...contact,
        contactIndex,
        tagIds: tagIdsForIndex(contactIndex),
        latestActivity: activities[0] ?? {
            id: `${contact.id}-none`,
            contactId: contact.id,
            kind: "None",
            summary: "No activity",
            occurredDaysAgo: 999,
        },
    }
}

const contactRowsFrom = (startIndex: number) => {
    const endIndex = Math.min(startIndex + HYDRATION_BATCH_SIZE, TOTAL_CONTACTS)

    return Array.makeBy(endIndex - startIndex, (offset) =>
        contactRowAt(startIndex + offset)
    )
}

// Stands in for the server's own index. It applies exactly the matching rule
// the local token index applies, because the whole handover rests on both
// sources answering a question the same way.
const serverSearch = (filter: SyncFilter, page: number) => {
    const terms = searchTermsFor(filter.searchText)
    const maximumAge = maxActivityAgeDays(filter.recency)
    const matched: Array<number> = []

    for (
        let contactIndex = 0;
        contactIndex < TOTAL_CONTACTS;
        contactIndex += 1
    ) {
        const contact = contactForIndex(contactIndex)
        const tagIds = tagIdsForIndex(contactIndex)
        const matchesSearch =
            terms.length === 0 ||
            matchesAllTerms(searchTokensFor(contact.searchText), terms)
        // Every selected tag has to match, not any, and recency is measured
        // against the same latest activity the row shows. Both rules are copied
        // into the local read below — if they ever drift, the swap changes the
        // results under the reader and verification is what catches it.
        const matchesTags = filter.tagIds.every((tagId) =>
            tagIds.includes(tagId)
        )
        const latestDaysAgo =
            activitiesForContact(contact.id, contactIndex)[0]
                ?.occurredDaysAgo ?? 999

        if (matchesSearch && matchesTags && latestDaysAgo <= maximumAge) {
            matched.push(contactIndex)
        }
    }

    const pageStart = page * PAGE_SIZE

    return {
        totalMatches: matched.length,
        contactIndexes: matched.slice(pageStart, pageStart + PAGE_SIZE),
        hasNextPage: pageStart + PAGE_SIZE < matched.length,
    }
}

const FetchSyncRemotePage = Command.define("FetchSyncRemotePage", {
    args: { page: S.Number, filter: SyncFilterSchema, queryKey: S.String },
    messages: [SettledSyncRemotePage],
    execute: ({ page, filter, queryKey }) =>
        Effect.sleep(REMOTE_LATENCY).pipe(
            Effect.andThen(() =>
                Effect.try({
                    try: () => {
                        const found = serverSearch(filter, page)

                        return {
                            totalMatches: found.totalMatches,
                            page,
                            queryPlan: `network round trip · ${Duration.toMillis(REMOTE_LATENCY)}ms`,
                            rows: Array.map(
                                found.contactIndexes,
                                (contactIndex) => {
                                    const contact = contactRowAt(contactIndex)

                                    return {
                                        contact,
                                        tags: tagsForIds(contact.tagIds),
                                        latestActivity: contact.latestActivity,
                                    }
                                }
                            ),
                            hasNextPage: found.hasNextPage,
                        }
                    },
                    catch: (error) => `${error}`,
                })
            ),
            Effect.result,
            Effect.map((result) => SettledSyncRemotePage({ queryKey, result }))
        ),
})

const HydrateSyncBatch = Command.define("HydrateSyncBatch", {
    args: { startIndex: S.Number },
    messages: [SettledSyncHydrationBatch, FailedSyncOperation],
    execute: ({ startIndex }) =>
        withDatabase(
            Effect.gen(function* () {
                const query = yield* CrmSyncDb.getQueryBuilder
                const rows = contactRowsFrom(startIndex)
                const hydratedContacts = startIndex + rows.length
                const tokens = Array.flatMap(rows, (contact) =>
                    Array.map(searchTokensFor(contact.searchText), (token) => ({
                        id: `${contact.id}-${token}`,
                        contactId: contact.id,
                        token,
                    }))
                )
                // Three per contact, and they go down in the same batch as the row they
                // belong to: a contact whose activities arrived in a later transaction
                // would open half-empty for as long as the fill took to reach them.
                const activities = Array.flatMap(rows, (contact) =>
                    activitiesForContact(contact.id, contact.contactIndex)
                )
                // The facet indexes. Redundant as data — both are already on the contact
                // row — and written anyway so a tag or a recency filter is a seek rather
                // than a scan of every contact.
                const tagLinks = Array.flatMap(rows, (contact) =>
                    Array.map(contact.tagIds, (tagId) => ({
                        id: `${contact.id}-${tagId}`,
                        contactId: contact.id,
                        tagId,
                    }))
                )
                const recencyRows = Array.map(rows, (contact) => ({
                    id: contact.id,
                    occurredDaysAgo: contact.latestActivity.occurredDaysAgo,
                }))

                yield* Effect.sleep(HYDRATION_LATENCY)
                yield* query.withTransaction({
                    tables: [
                        "contacts",
                        "contact_tokens",
                        "activities",
                        "contact_tags",
                        "contact_recency",
                        "metadata",
                    ],
                    mode: "readwrite",
                })(
                    Effect.gen(function* () {
                        yield* query.from("contacts").upsertAll(rows)
                        yield* query.from("contact_tokens").upsertAll(tokens)
                        yield* query.from("activities").upsertAll(activities)
                        yield* query.from("contact_tags").upsertAll(tagLinks)
                        yield* query
                            .from("contact_recency")
                            .upsertAll(recencyRows)
                        // The cursor advances in the same transaction as the rows it counts,
                        // so an interrupted hydration resumes without gaps or double writes.
                        yield* query
                            .from("metadata")
                            .upsert({ id: "cursor", hydratedContacts })
                    })
                )

                return SettledSyncHydrationBatch({ hydratedContacts })
            })
        ).pipe(
            Effect.catch((error) =>
                Effect.succeed(FailedSyncOperation({ error: `${error}` }))
            )
        ),
})

// Newest first is how a history is read, and the generator's occurredDaysAgo is
// the only ordering either source can agree on.
const newestFirst = (
    activities: ReadonlyArray<Activity>
): ReadonlyArray<Activity> =>
    activities.toSorted(
        (left, right) => left.occurredDaysAgo - right.occurredDaysAgo
    )

// None for an id outside the dataset, which is what the not-found state on the
// detail page renders. An unparseable id and an id past the end are the same
// answer: there is no such contact.
const detailForContactId = (
    contactId: string
): Option.Option<SyncContactDetail> =>
    Option.map(
        Option.filter(
            contactIndexForId(contactId),
            (contactIndex) => contactIndex < TOTAL_CONTACTS
        ),
        (contactIndex) => {
            const contact = contactForIndex(contactIndex)

            return {
                contact,
                tags: tagsForIds(tagIdsForIndex(contactIndex)),
                activities: newestFirst(
                    activitiesForContact(contact.id, contactIndex)
                ),
                queryPlan: `network round trip · ${Duration.toMillis(REMOTE_LATENCY)}ms`,
            }
        }
    )

const FetchSyncRemoteContact = Command.define("FetchSyncRemoteContact", {
    args: { contactId: S.String },
    messages: [SettledSyncContactDetail],
    execute: ({ contactId }) =>
        Effect.sleep(REMOTE_LATENCY).pipe(
            Effect.andThen(() =>
                Effect.sync(() => detailForContactId(contactId))
            ),
            Effect.map((maybeDetail) =>
                SettledSyncContactDetail({
                    contactId,
                    result: Result.succeed(maybeDetail),
                })
            )
        ),
})

const ReadSyncLocalContact = Command.define("ReadSyncLocalContact", {
    args: { contactId: S.String },
    messages: [SettledSyncContactDetail],
    execute: ({ contactId }) =>
        withDatabase(
            Effect.gen(function* () {
                const query = yield* CrmSyncDb.getQueryBuilder
                const maybeContact = yield* maybeFirst(
                    query.from("contacts").select().equals(contactId).first()
                )

                if (Option.isNone(maybeContact))
                    return Option.none<SyncContactDetail>()

                const contact = maybeContact.value
                // The contactId index is what makes this a read rather than a scan, and
                // it is the reason the store needed one.
                const activities = yield* query
                    .from("activities")
                    .select("contactId")
                    .equals(contactId)

                return Option.some({
                    contact,
                    tags: tagsForIds(contact.tagIds),
                    activities: newestFirst(activities),
                    queryPlan: `local IndexedDB read · ${1 + 1} requests`,
                })
            })
        ).pipe(
            Effect.result,
            Effect.map((result) =>
                SettledSyncContactDetail({
                    contactId,
                    result: Result.mapError(result, (error) => `${error}`),
                })
            )
        ),
})

const ReadSyncLocalPage = Command.define("ReadSyncLocalPage", {
    args: {
        page: S.Number,
        filter: SyncFilterSchema,
        isVerification: S.Boolean,
        queryKey: S.String,
    },
    messages: [SettledSyncLocalPage],
    execute: ({ page, filter, isVerification, queryKey }) =>
        withDatabase(
            Effect.gen(function* () {
                const query = yield* CrmSyncDb.getQueryBuilder
                const maybeCursor = yield* maybeFirst(
                    query.from("metadata").select().first()
                )
                const hydratedContacts = Option.match(maybeCursor, {
                    onNone: () => 0,
                    onSome: (cursor) => cursor.hydratedContacts,
                })
                const terms = searchTermsFor(filter.searchText)
                const pageStart = page * PAGE_SIZE
                const hasFacets =
                    filter.tagIds.length > 0 || filter.recency !== "Any"

                // Ordering has to match the server's, or the swap is visible as a
                // reshuffle. contactIndex is the server's list order, kept as an index,
                // and the unfiltered read pages straight down it.
                if (terms.length === 0 && !hasFacets) {
                    const contacts = yield* query
                        .from("contacts")
                        .select("contactIndex")
                        .offset(pageStart)
                        .limit(PAGE_SIZE)

                    return {
                        totalMatches: hydratedContacts,
                        page,
                        queryPlan: `local IndexedDB read · ${1 + 1} requests`,
                        rows: Array.map(contacts, (contact) => ({
                            contact,
                            tags: tagsForIds(contact.tagIds),
                            latestActivity: contact.latestActivity,
                        })),
                        hasNextPage: pageStart + PAGE_SIZE < hydratedContacts,
                    }
                }

                // One candidate set per predicate, then intersected. Each set is an
                // index read rather than a scan, which is the whole reason V4 added two
                // stores holding data the contact row already carries.
                const idsPerTerm = yield* Effect.forEach(terms, (term) =>
                    Effect.map(
                        query
                            .from("contact_tokens")
                            .select("token")
                            .between(term, `${term}\uffff`),
                        (tokenRows) =>
                            Array.dedupe(
                                Array.map(
                                    tokenRows,
                                    (tokenRow) => tokenRow.contactId
                                )
                            )
                    )
                )
                const idsPerTag = yield* Effect.forEach(
                    filter.tagIds,
                    (tagId) =>
                        Effect.map(
                            query
                                .from("contact_tags")
                                .select("tagId")
                                .equals(tagId),
                            (linkRows) =>
                                Array.map(
                                    linkRows,
                                    (linkRow) => linkRow.contactId
                                )
                        )
                )
                // A half-open range from zero: every contact whose latest activity is at
                // most this old, in one index scan.
                const idsByRecency =
                    filter.recency === "Any"
                        ? []
                        : [
                              Array.map(
                                  yield* query
                                      .from("contact_recency")
                                      .select("occurredDaysAgo")
                                      .between(
                                          0,
                                          maxActivityAgeDays(filter.recency)
                                      ),
                                  (recencyRow) => recencyRow.id
                              ),
                          ]
                const candidateSets = [
                    ...idsPerTerm,
                    ...idsPerTag,
                    ...idsByRecency,
                ]
                const matchedIds = Array.match(candidateSets, {
                    onEmpty: (): ReadonlyArray<string> => [],
                    onNonEmpty: (sets) =>
                        Array.reduce(
                            Array.drop(sets, 1),
                            Array.headNonEmpty(sets),
                            (kept, ids) => {
                                const idsInSet = new Set(ids)

                                return Array.filter(kept, (contactId) =>
                                    idsInSet.has(contactId)
                                )
                            }
                        ),
                })
                // Sorted before paging, not after fetching. Index reads come back in
                // token, tag or age order, and slicing any of those would hand out a
                // page the server would never produce — which verification compares
                // against and rejects. The id encodes the index, so this costs no reads.
                const ordered = matchedIds.toSorted(
                    (left, right) =>
                        Option.getOrElse(contactIndexForId(left), () => 0) -
                        Option.getOrElse(contactIndexForId(right), () => 0)
                )
                const pageIds = ordered.slice(pageStart, pageStart + PAGE_SIZE)
                const contacts = Array.getSomes(
                    yield* Effect.forEach(pageIds, (contactId) =>
                        maybeFirst(
                            query
                                .from("contacts")
                                .select()
                                .equals(contactId)
                                .first()
                        )
                    )
                )

                return {
                    totalMatches: matchedIds.length,
                    page,
                    queryPlan: `local facet indexes · ${2 + candidateSets.length + pageIds.length} requests`,
                    rows: Array.map(contacts, (contact) => ({
                        contact,
                        tags: tagsForIds(contact.tagIds),
                        latestActivity: contact.latestActivity,
                    })),
                    hasNextPage: pageStart + pageIds.length < matchedIds.length,
                }
            })
        ).pipe(
            Effect.result,
            Effect.map((result) =>
                SettledSyncLocalPage({
                    queryKey,
                    isVerification,
                    result: Result.mapError(result, (error) => `${error}`),
                })
            )
        ),
})

// Stands in for the server's validation. A write path with no way to be refused
// only ever exercises the happy path, and the rollback is the half that is easy
// to get wrong.
export const MAX_CONTACT_NAME = 60

const rejectionFor = (name: string): Option.Option<string> =>
    name.trim().length === 0
        ? Option.some("A contact name cannot be empty.")
        : name.length > MAX_CONTACT_NAME
          ? Option.some(
                `A contact name cannot exceed ${MAX_CONTACT_NAME} characters.`
            )
          : Option.none()

const WriteSyncContactEdit = Command.define("WriteSyncContactEdit", {
    args: {
        contactId: S.String,
        name: S.String,
        previousName: S.Option(S.String),
    },
    messages: [SettledSyncContactWrite],
    execute: ({ contactId, name, previousName }) =>
        withDatabase(
            Effect.gen(function* () {
                yield* Effect.sleep(REMOTE_LATENCY)

                // Refused before anything is persisted, so a rejected write leaves no
                // trace to undo in the store — only the optimistic Model change rolls back.
                const maybeRejection = rejectionFor(name)

                if (Option.isSome(maybeRejection)) {
                    return yield* Effect.fail(maybeRejection.value)
                }

                const query = yield* CrmSyncDb.getQueryBuilder
                yield* query
                    .from("contact_edits")
                    .upsert({ id: contactId, name })

                return name
            })
        ).pipe(
            Effect.result,
            Effect.map((result) =>
                SettledSyncContactWrite({
                    contactId,
                    previousName,
                    result: Result.mapError(result, (error) => `${error}`),
                })
            )
        ),
})

const LoadSyncEdits = Command.define("LoadSyncEdits", {
    messages: [SettledSyncEditsLoad, FailedSyncOperation],
    execute: withDatabase(
        Effect.gen(function* () {
            const query = yield* CrmSyncDb.getQueryBuilder
            const rows = yield* query.from("contact_edits").select()

            return SettledSyncEditsLoad({
                edits: Array.map(rows, (row): readonly [string, string] => [
                    row.id,
                    row.name,
                ]),
            })
        })
    ).pipe(
        Effect.catch((error) =>
            Effect.succeed(FailedSyncOperation({ error: `${error}` }))
        )
    ),
})

const RebuildSyncDatabase = Command.define("RebuildSyncDatabase", {
    messages: [CompletedSyncRebuild, FailedSyncOperation],
    execute: withDatabase(
        Effect.gen(function* () {
            const database = yield* IndexedDbDatabase.IndexedDbDatabase
            yield* database.rebuild

            return CompletedSyncRebuild()
        })
    ).pipe(
        Effect.catch((error) =>
            Effect.succeed(FailedSyncOperation({ error: `${error}` }))
        )
    ),
})

export const debounceSearch = DebounceSyncSearch
export const fetchRemotePage = FetchSyncRemotePage
export const fetchRemoteContact = FetchSyncRemoteContact
export const hydrateBatch = HydrateSyncBatch
export const readLocalPage = ReadSyncLocalPage
export const readLocalContact = ReadSyncLocalContact
export const rebuildDatabase = RebuildSyncDatabase()
export const writeContactEdit = WriteSyncContactEdit
export const loadEdits = LoadSyncEdits()

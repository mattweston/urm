import {
    Array,
    type Cause,
    Duration,
    Effect,
    Option,
    Result,
    Schema as S,
    Stream,
} from "effect"
import { IndexedDbDatabase } from "@effect/platform-browser"
import { Command } from "foldkit"

import { Activity, TAGS, type Contact } from "../crm/crm.domain.ts"
import {
    activitiesForContact,
    contactCountForDatasetSize,
    contactForIndex,
    tagIdsForIndex,
} from "../crm/crm.generate.ts"
import { searchTermsFor, searchTokensFor } from "../crm/crm.search.ts"
import { PAGE_SIZE } from "../crm-remote/crm-remote.domain.ts"
import { CrmIndexedDb, databaseLayer } from "./crm-indexeddb.database.ts"
import {
    ElapsedIndexedDbCrmSearchDebounce,
    FailedIndexedDbOperation,
    InspectedIndexedDbCrmDatabase,
    SeededIndexedDbCrmDatabaseBatch,
    SettledIndexedDbContactsQuery,
} from "./crm-indexeddb.message.ts"
import { ActivityRecency, DatasetSize } from "./crm-indexeddb.model.ts"

export const SEED_BATCH_SIZE = 500
export const SEARCH_DEBOUNCE_MS = 350

const withDatabase = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(Effect.provide(databaseLayer))

const failure = (error: unknown) =>
    FailedIndexedDbOperation({ error: String(error) })

// `.first()` signals "no matching row" by failing with NoSuchElementError, not
// by succeeding with null, so every absence has to be caught rather than
// compared. Only that tag is caught here: a real IndexedDbQueryError still
// fails the Command.
const maybeFirst = <A, E, R>(
    effect: Effect.Effect<A, E | Cause.NoSuchElementError, R>
): Effect.Effect<Option.Option<A>, E, R> =>
    effect.pipe(
        Effect.map((row) => Option.some(row)),
        Effect.catchTag("NoSuchElementError", () =>
            Effect.succeed(Option.none<A>())
        )
    )

const InspectIndexedDbCrmDatabase = Command.define(
    "InspectIndexedDbCrmDatabase",
    {
        messages: [InspectedIndexedDbCrmDatabase, FailedIndexedDbOperation],
        execute: withDatabase(
            Effect.gen(function* () {
                const query = yield* CrmIndexedDb.getQueryBuilder
                // A database that has never been seeded has no metadata row at all,
                // which is the ordinary first-visit case rather than a failure.
                const maybeMetadata = yield* maybeFirst(
                    query.from("metadata").select().first()
                )
                return Option.match(maybeMetadata, {
                    onNone: () =>
                        InspectedIndexedDbCrmDatabase({
                            seededContacts: 0,
                            size: "TenThousand",
                        }),
                    onSome: (metadata) =>
                        InspectedIndexedDbCrmDatabase({
                            seededContacts: metadata.seededContacts,
                            size: metadata.size,
                        }),
                })
            })
        ).pipe(Effect.catch((error) => Effect.succeed(failure(error)))),
    }
)

const noActivity = (contactId: string) => ({
    id: `${contactId}-none`,
    contactId,
    kind: "None",
    summary: "No activity",
    occurredDaysAgo: 999,
})

const seedRows = (size: typeof DatasetSize.Type, startIndex: number) => {
    const endIndex = Math.min(
        startIndex + SEED_BATCH_SIZE,
        contactCountForDatasetSize(size)
    )
    const contacts = Array.makeBy(endIndex - startIndex, (offset) => {
        const contactIndex = startIndex + offset
        const contact = contactForIndex(contactIndex)
        const activities = activitiesForContact(contact.id, contactIndex)

        // The derived fields are written here, inside the same transaction as
        // the link rows they summarize, so the two can never disagree.
        return {
            ...contact,
            contactIndex,
            tagIds: tagIdsForIndex(contactIndex),
            latestActivity: activities[0] ?? noActivity(contact.id),
        }
    })
    const contactTags = Array.flatMap(contacts, (contact) =>
        Array.map(tagIdsForIndex(contact.contactIndex), (tagId) => ({
            id: `${contact.id}-${tagId}`,
            contactId: contact.id,
            tagId,
        }))
    )
    const activities = Array.flatMap(contacts, (contact) =>
        activitiesForContact(contact.id, contact.contactIndex)
    )
    const recency = Array.map(contacts, (contact) => ({
        id: contact.id,
        contactId: contact.id,
        occurredDaysAgo: contact.latestActivity.occurredDaysAgo,
    }))
    const tokens = Array.flatMap(contacts, (contact) =>
        Array.map(searchTokensFor(contact.searchText), (token) => ({
            id: `${contact.id}-${token}`,
            contactId: contact.id,
            token,
        }))
    )
    return { contacts, contactTags, activities, recency, tokens, endIndex }
}

const SeedIndexedDbCrmDatabaseBatch = Command.define(
    "SeedIndexedDbCrmDatabaseBatch",
    {
        args: { size: DatasetSize, startIndex: S.Number },
        messages: [SeededIndexedDbCrmDatabaseBatch, FailedIndexedDbOperation],
        execute: ({ size, startIndex }) =>
            withDatabase(
                Effect.gen(function* () {
                    const query = yield* CrmIndexedDb.getQueryBuilder
                    const rows = seedRows(size, startIndex)
                    yield* query.withTransaction({
                        tables: [
                            "contacts",
                            "tags",
                            "contact_tags",
                            "activities",
                            "contact_recency",
                            "contact_tokens",
                            "metadata",
                        ],
                        mode: "readwrite",
                    })(
                        Effect.gen(function* () {
                            if (startIndex === 0)
                                yield* query.from("tags").upsertAll([...TAGS])
                            // Every seed row has a deterministic key. Upserts make a retry or
                            // a second open tab converge on the same normalized dataset rather
                            // than aborting the entire IndexedDB transaction on a duplicate key.
                            yield* query
                                .from("contacts")
                                .upsertAll(rows.contacts)
                            yield* query
                                .from("contact_tags")
                                .upsertAll(rows.contactTags)
                            yield* query
                                .from("activities")
                                .upsertAll(rows.activities)
                            yield* query
                                .from("contact_recency")
                                .upsertAll(rows.recency)
                            yield* query
                                .from("contact_tokens")
                                .upsertAll(rows.tokens)
                            yield* query.from("metadata").upsert({
                                id: "dataset",
                                size,
                                seededContacts: rows.endIndex,
                            })
                        })
                    )
                    return SeededIndexedDbCrmDatabaseBatch({
                        seededContacts: rows.endIndex,
                        size,
                    })
                })
            ).pipe(Effect.catch((error) => Effect.succeed(failure(error)))),
    }
)

const RebuildIndexedDbCrmDatabase = Command.define(
    "RebuildIndexedDbCrmDatabase",
    {
        args: { size: DatasetSize },
        messages: [InspectedIndexedDbCrmDatabase, FailedIndexedDbOperation],
        execute: ({ size }) =>
            withDatabase(
                Effect.gen(function* () {
                    const database = yield* IndexedDbDatabase.IndexedDbDatabase
                    yield* database.rebuild
                    return InspectedIndexedDbCrmDatabase({
                        seededContacts: 0,
                        size,
                    })
                })
            ).pipe(Effect.catch((error) => Effect.succeed(failure(error)))),
    }
)

const maxActivityAge = (activityRecency: typeof ActivityRecency.Type): number =>
    activityRecency === "SevenDays"
        ? 7
        : activityRecency === "ThirtyDays"
          ? 30
          : 999

type ContactRow = Contact &
    Readonly<{
        contactIndex: number
        tagIds: ReadonlyArray<string>
        latestActivity: typeof Activity.Type
    }>

type TextScan = Readonly<{
    totalMatches: number
    pageContacts: ReadonlyArray<ContactRow>
}>

const emptyTextScan = (): TextScan => ({ totalMatches: 0, pageContacts: [] })

// The number the demo is really about. Requests are counted rather than timed
// because a count is stable across machines and is what the read strategy
// actually changes.
const describePlan = (
    plan: string,
    isDenormalizedRead: boolean,
    requests: number,
    rowCount: number
): string =>
    `${plan} · ${isDenormalizedRead ? "denormalized read" : "normalized join"} · ${requests} request${requests === 1 ? "" : "s"} for ${rowCount} row${rowCount === 1 ? "" : "s"}`

const queryPage = Effect.fn("IndexedDbCrm.queryPage")(function* (
    input: Readonly<{
        searchText: string
        selectedTagIds: ReadonlyArray<string>
        activityRecency: typeof ActivityRecency.Type
        page: number
        isDenormalizedRead: boolean
        isTokenIndexSearch: boolean
    }>
) {
    const query = yield* CrmIndexedDb.getQueryBuilder
    const maybeMetadata = yield* maybeFirst(
        query.from("metadata").select().first()
    )
    const totalSeeded = Option.match(maybeMetadata, {
        onNone: () => 0,
        onSome: (metadata) => metadata.seededContacts,
    })
    // The tag lookup table is six rows. Reading it once per query and joining in
    // memory is what removed the bulk of the old per-link request count.
    const tags = yield* query.from("tags").select()
    const tagsById = new Map(Array.map(tags, (tag) => [tag.id, tag] as const))
    const tagsForIds = (tagIds: ReadonlyArray<string>) =>
        Array.getSomes(
            Array.map(tagIds, (tagId) =>
                Option.fromNullishOr(tagsById.get(tagId))
            )
        )
    const normalizedSearch = input.searchText.trim().toLowerCase()
    const pageStart = input.page * PAGE_SIZE
    // Two ways to answer the same question. The denormalized read joins from
    // fields already on the contact row and issues nothing; the normalized join
    // walks the link tables, costing two requests per row because IndexedDB has
    // no multi-key get.
    const loadRows = (contacts: ReadonlyArray<ContactRow>) =>
        input.isDenormalizedRead
            ? Effect.succeed(
                  Array.map(contacts, (contact) => ({
                      contact,
                      tags: tagsForIds(contact.tagIds),
                      latestActivity: contact.latestActivity,
                  }))
              )
            : Effect.forEach(contacts, (contact) =>
                  Effect.gen(function* () {
                      const links = yield* query
                          .from("contact_tags")
                          .select("contactId")
                          .equals(contact.id)
                      // A contact seeded with no activity row is a legitimate shape
                      // here, so absence falls back to the placeholder instead of
                      // failing the whole page query.
                      const maybeLatestActivity = yield* maybeFirst(
                          query
                              .from("activities")
                              .select("contactId")
                              .equals(contact.id)
                              .first()
                      )
                      return {
                          contact,
                          tags: tagsForIds(
                              Array.map(links, (link) => link.tagId)
                          ),
                          latestActivity: Option.getOrElse(
                              maybeLatestActivity,
                              () => noActivity(contact.id)
                          ),
                      }
                  })
              )
    const rowRequests = (rowCount: number) =>
        input.isDenormalizedRead ? 0 : rowCount * 2
    // The index holds one word per row, so a multi-word search is one prefix
    // range per word, intersected. Searching the raw string would look for a
    // token containing a space, which no token ever does.
    const searchTerms = searchTermsFor(normalizedSearch)
    const isTokenSearch =
        normalizedSearch !== "" &&
        input.isTokenIndexSearch &&
        searchTerms.length > 0
    const isTextOnlyQuery =
        normalizedSearch !== "" &&
        !isTokenSearch &&
        input.selectedTagIds.length === 0 &&
        input.activityRecency === "Any"

    if (isTextOnlyQuery) {
        const scan = yield* query
            .from("contacts")
            .select("contactIndex")
            .stream({ chunkSize: 100 })
            .pipe(
                Stream.runFold(emptyTextScan, (state, contact): TextScan => {
                    if (!contact.searchText.includes(normalizedSearch))
                        return state

                    const matchIndex = state.totalMatches
                    return {
                        totalMatches: matchIndex + 1,
                        pageContacts:
                            matchIndex >= pageStart &&
                            matchIndex < pageStart + PAGE_SIZE
                                ? Array.append(state.pageContacts, contact)
                                : state.pageContacts,
                    }
                })
            )
        const rows = yield* loadRows(scan.pageContacts)
        return {
            totalMatches: scan.totalMatches,
            page: input.page,
            // The scan counts as one request but reads every contact: this is
            // the one path the read strategy cannot rescue, because IndexedDB
            // has no arbitrary-substring index to consult.
            queryPlan: describePlan(
                "IndexedDB cursor substring scan (no text index)",
                input.isDenormalizedRead,
                3 + rowRequests(rows.length),
                rows.length
            ),
            rows,
            hasNextPage: pageStart + rows.length < scan.totalMatches,
        }
    }

    // One bounded range scan per term. "￿" sorts above any character that can
    // follow the prefix, so each range covers exactly the tokens starting with
    // its term.
    const idsPerTerm = isTokenSearch
        ? yield* Effect.forEach(searchTerms, (term) =>
              Effect.map(
                  query
                      .from("contact_tokens")
                      .select("token")
                      .between(term, `${term}￿`),
                  (rows) =>
                      Array.dedupe(Array.map(rows, (row) => row.contactId))
              )
          )
        : []
    // Every term has to match, so the contact needs a token for each: "ada
    // lovelace" is the contacts found by "ada" that were also found by
    // "lovelace".
    const tokenMatchedIds = Array.match(idsPerTerm, {
        onEmpty: (): ReadonlyArray<string> => [],
        onNonEmpty: (termIds) =>
            Array.reduce(
                Array.drop(termIds, 1),
                Array.headNonEmpty(termIds),
                (kept, ids) => {
                    const idsForTerm = new Set(ids)

                    return Array.filter(kept, (contactId) =>
                        idsForTerm.has(contactId)
                    )
                }
            ),
    })
    const tagLinks = yield* Effect.forEach(input.selectedTagIds, (tagId) =>
        query.from("contact_tags").select("tagId").equals(tagId)
    )
    const recencyRows =
        input.activityRecency === "Any"
            ? []
            : yield* query
                  .from("contact_recency")
                  .select("occurredDaysAgo")
                  .lte(maxActivityAge(input.activityRecency))
    const candidateIds =
        input.selectedTagIds.length === 0 && input.activityRecency === "Any"
            ? []
            : Array.filter(
                  Array.map(
                      input.selectedTagIds.length === 0
                          ? recencyRows
                          : (tagLinks[0] ?? []),
                      (row) => row.contactId
                  ),
                  (contactId) =>
                      tagLinks.every((links) =>
                          links.some((link) => link.contactId === contactId)
                      ) &&
                      (input.activityRecency === "Any" ||
                          recencyRows.some(
                              (row) => row.contactId === contactId
                          ))
              )
    const hasIndexedFacet =
        input.selectedTagIds.length > 0 || input.activityRecency !== "Any"
    const isPlainPagedQuery = normalizedSearch === "" && !hasIndexedFacet
    // Every restriction that applies, intersected as ids before any contact row
    // is fetched.
    const restrictedIds =
        isTokenSearch && hasIndexedFacet
            ? Array.filter(candidateIds, (contactId) =>
                  tokenMatchedIds.includes(contactId)
              )
            : isTokenSearch
              ? tokenMatchedIds
              : candidateIds
    // Prefix matching already happened in the index, so the token path needs no
    // second pass over the rows and can fetch the page alone. A substring search
    // has to see every candidate before it knows which fifty to show.
    const isIdLookup = isTokenSearch || hasIndexedFacet
    const needsRowFilter = normalizedSearch !== "" && !isTokenSearch
    const fetchedIds = needsRowFilter
        ? restrictedIds
        : restrictedIds.slice(pageStart, pageStart + PAGE_SIZE)
    const contacts = isPlainPagedQuery
        ? yield* query
              .from("contacts")
              .select("contactIndex")
              .offset(input.page * PAGE_SIZE)
              .limit(PAGE_SIZE)
        : isIdLookup
          ? Array.getSomes(
                yield* Effect.forEach(fetchedIds, (contactId) =>
                    maybeFirst(
                        query
                            .from("contacts")
                            .select()
                            .equals(contactId)
                            .first()
                    )
                )
            )
          : yield* query.from("contacts").select("contactIndex")
    const matchingContacts = Array.filter(
        contacts,
        (contact): contact is ContactRow =>
            !needsRowFilter || contact.searchText.includes(normalizedSearch)
    )
    const pageContacts =
        isPlainPagedQuery || (isIdLookup && !needsRowFilter)
            ? matchingContacts
            : matchingContacts.slice(pageStart, pageStart + PAGE_SIZE)
    const rows = yield* loadRows(pageContacts)
    const totalMatches = isPlainPagedQuery
        ? totalSeeded
        : isIdLookup && !needsRowFilter
          ? restrictedIds.length
          : matchingContacts.length
    // metadata + tags, then the reads that found the page: one paged index
    // request, or the token range plus the facet index reads plus one request
    // per contact actually fetched.
    const lookupRequests = isPlainPagedQuery
        ? 3
        : 2 +
          (isTokenSearch ? searchTerms.length : 0) +
          input.selectedTagIds.length +
          (input.activityRecency === "Any" ? 0 : 1) +
          (isIdLookup ? fetchedIds.length : 1)
    const plan = isPlainPagedQuery
        ? "IndexedDB contact index"
        : isTokenSearch && hasIndexedFacet
          ? "IndexedDB token prefix range, intersected with tag/activity-recency indexes"
          : isTokenSearch
            ? "IndexedDB token prefix range"
            : "IndexedDB tag/activity-recency indexes"
    return {
        totalMatches,
        page: input.page,
        queryPlan: describePlan(
            plan,
            input.isDenormalizedRead,
            lookupRequests + rowRequests(rows.length),
            rows.length
        ),
        rows,
        hasNextPage: pageStart + rows.length < totalMatches,
    }
})

const QueryIndexedDbCrmContacts = Command.define("QueryIndexedDbCrmContacts", {
    args: {
        searchText: S.String,
        selectedTagIds: S.Array(S.String),
        activityRecency: ActivityRecency,
        page: S.Number,
        queryKey: S.String,
        isDenormalizedRead: S.Boolean,
        isTokenIndexSearch: S.Boolean,
    },
    messages: [SettledIndexedDbContactsQuery],
    execute: (input) =>
        withDatabase(queryPage(input)).pipe(
            Effect.result,
            Effect.map((result) =>
                SettledIndexedDbContactsQuery({
                    queryKey: input.queryKey,
                    result: Result.mapError(result, String),
                })
            )
        ),
})

// Not interruptible: a sleep is not work worth stopping, so the timer runs to
// completion and update judges it at receipt against the Model.
const DebounceIndexedDbCrmSearch = Command.define(
    "DebounceIndexedDbCrmSearch",
    {
        args: { value: S.String },
        messages: [ElapsedIndexedDbCrmSearchDebounce],
        execute: ({ value }) =>
            Effect.sleep(Duration.millis(SEARCH_DEBOUNCE_MS)).pipe(
                Effect.as(ElapsedIndexedDbCrmSearchDebounce({ value }))
            ),
    }
)

export const debounceSearch = DebounceIndexedDbCrmSearch
export const inspectDatabase = InspectIndexedDbCrmDatabase()
export const seedDatabaseBatch = SeedIndexedDbCrmDatabaseBatch
export const rebuildDatabase = RebuildIndexedDbCrmDatabase
export const queryContacts = QueryIndexedDbCrmContacts

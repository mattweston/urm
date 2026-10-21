import {
    Array,
    Effect,
    HashMap,
    Match as M,
    Option,
    Record,
    Result,
    Schema as S,
} from "effect"
import { AsyncData, Command, Navigation, Update } from "foldkit"
import * as Ui from "@foldkit/ui"
import { modifyFields } from "foldkit/struct"

import { RemoteContactsPage } from "../crm-remote/crm-remote.domain.ts"
import {
    HYDRATION_BATCH_SIZE,
    TOTAL_CONTACTS,
    debounceSearch,
    fetchRemoteContact,
    fetchRemotePage,
    hydrateBatch,
    loadEdits,
    readLocalContact,
    readLocalPage,
    rebuildDatabase,
    writeContactEdit,
} from "./crm-sync.command.ts"
import {
    ChangedSyncRoute,
    CompletedSyncUrlReplacement,
    GotSyncVirtualListMessage,
    type Message,
} from "./crm-sync.message.ts"
import {
    CrmSyncListRoute,
    CrmSyncRoute,
    activityRecencyFromRoute,
    crmSyncBrowseHref,
    recencyParamFor,
    searchTextFromRoute,
    tagIdsFromRoute,
    tagsParamFor,
} from "./crm-sync.route.ts"
import {
    MAX_CACHED_QUERY_PAGES,
    SyncContactDetailData,
    SyncContactsData,
    activeQueryKeyFor,
    anchorPageFor,
    currentPageData,
    detailFor,
    emptyModel,
    filterKeyOf,
    filterOf,
    pagesForCurrentWindow,
    parseQueryKey,
    queryKeyFor,
    type Model,
    type SyncFilter,
} from "./crm-sync.model.ts"

type UpdateReturn = Update.Return<Model, Message>
const withUpdateReturn = M.withReturnType<UpdateReturn>()

type CacheEntry = typeof SyncContactsData.schema.Type

// A search is a refinement of the same view, not a destination. Pushing would
// make Back walk backwards through every abandoned search term one keystroke at
// a time.
const ReplaceSyncUrl = Command.define("ReplaceSyncUrl", {
    args: { href: S.String },
    messages: [CompletedSyncUrlReplacement],
    execute: ({ href }) =>
        Navigation.replaceUrl(href).pipe(
            Effect.as(CompletedSyncUrlReplacement())
        ),
})

const ChangeEmbeddedSyncRoute = Command.define("ChangeEmbeddedSyncRoute", {
    args: { route: CrmSyncRoute },
    messages: [ChangedSyncRoute],
    execute: ({ route }) => Effect.succeed(ChangedSyncRoute({ route })),
})

type NavigationMode = "Browser" | "Model"

// Every part of the filter, so a link carries the list the reader is actually
// looking at rather than its search box alone.
const filterHref = (filter: SyncFilter): string =>
    crmSyncBrowseHref({
        search:
            filter.searchText === ""
                ? Option.none()
                : Option.some(filter.searchText),
        tags: tagsParamFor(filter.tagIds),
        recency: recencyParamFor(filter.recency),
    })

const filterRoute = (filter: SyncFilter) =>
    CrmSyncListRoute({
        search:
            filter.searchText === ""
                ? Option.none()
                : Option.some(filter.searchText),
        tags: tagsParamFor(filter.tagIds),
        recency: recencyParamFor(filter.recency),
    })

const replaceSyncFilter = (filter: SyncFilter, navigation: NavigationMode) =>
    navigation === "Browser"
        ? ReplaceSyncUrl({ href: filterHref(filter) })
        : ChangeEmbeddedSyncRoute({ route: filterRoute(filter) })

const mapVirtualListCommands = (
    commands: ReadonlyArray<Command.Command<Ui.VirtualList.Message>>
): ReadonlyArray<Command.Command<Message>> =>
    Command.mapMessages(commands, (message) =>
        GotSyncVirtualListMessage({ message })
    )

// How far a cached page is from the one being read. A page belonging to another
// search is unreachable without another navigation, so it counts as furthest.
const pageDistanceFrom = (
    model: Model,
    anchorPage: number,
    queryKey: string
): number =>
    Option.match(parseQueryKey(queryKey), {
        onNone: () => Number.MAX_SAFE_INTEGER,
        onSome: ({ filterKey, page }) =>
            filterKey === filterKeyOf(filterOf(model))
                ? Math.abs(page - anchorPage)
                : Number.MAX_SAFE_INTEGER,
    })

// Bounded at MAX_CACHED_QUERY_PAGES, and the victim is the page furthest from
// the window rather than simply the oldest. Under numbered pages those were the
// same thing; under a continuous scroll they are opposites — a long scroll
// touches every page it passes, so pure recency evicts exactly the pages a
// scroll back is about to ask for again. Recency still breaks ties.
const keysToEvict = (
    model: Model,
    keysByRecency: ReadonlyArray<string>,
    protectedKeys: ReadonlyArray<string>
): ReadonlyArray<string> => {
    const excess = keysByRecency.length - MAX_CACHED_QUERY_PAGES

    if (excess <= 0) return []

    const anchorPage = anchorPageFor(model)
    const candidates = Array.map(
        Array.filter(
            keysByRecency,
            (queryKey) => !protectedKeys.includes(queryKey)
        ),
        (queryKey, recencyIndex) => ({
            queryKey,
            distance: pageDistanceFrom(model, anchorPage, queryKey),
            recencyIndex,
        })
    )
    const worstFirst = candidates.toSorted((left, right) =>
        left.distance === right.distance
            ? right.recencyIndex - left.recencyIndex
            : right.distance - left.distance
    )

    return Array.map(
        Array.take(worstFirst, excess),
        (candidate) => candidate.queryKey
    )
}

// The recency list is the ordering rather than a timestamp on each entry: an
// entry cannot then disagree with its own position.
const withCacheEntries = (
    model: Model,
    entries: ReadonlyArray<readonly [string, CacheEntry]>
) => {
    const writtenKeys = Array.map(entries, ([queryKey]) => queryKey)
    const keysByRecency = Array.appendAll(
        writtenKeys,
        Array.filter(
            model.cacheKeysByRecency,
            (queryKey) => !writtenKeys.includes(queryKey)
        )
    )
    const written = Array.reduce(
        entries,
        model.pageByQueryKey,
        (cache, [queryKey, entry]) => HashMap.set(cache, queryKey, entry)
    )
    const evictedKeys = keysToEvict(model, keysByRecency, writtenKeys)

    return {
        cacheKeysByRecency: Array.filter(
            keysByRecency,
            (queryKey) => !evictedKeys.includes(queryKey)
        ),
        pageByQueryKey: Array.reduce(
            evictedKeys,
            written,
            (cache, evictedKey) => HashMap.remove(cache, evictedKey)
        ),
    }
}

// An entry already holding rows costs nothing, and one already in flight is
// answered by the response on its way. Everything else has to be asked for.
const needsRequest = (model: Model, queryKey: string): boolean =>
    Option.match(HashMap.get(model.pageByQueryKey, queryKey), {
        onNone: () => true,
        onSome: (entry) =>
            !AsyncData.hasData(entry) && !AsyncData.isPending(entry),
    })

// Reading a page always goes through here, so the source is decided in exactly
// one place. Everything else asks for pages and stays out of it.
const ensurePages = (
    model: Model,
    pages: ReadonlyArray<number>
): UpdateReturn => {
    const filter = filterOf(model)
    const missingPages = Array.filter(pages, (page) =>
        needsRequest(model, queryKeyFor(filter, page))
    )
    const cache = withCacheEntries(
        model,
        Array.map(missingPages, (page): readonly [string, CacheEntry] => [
            queryKeyFor(filter, page),
            // Loading, not Refreshing: a page still on its way renders as
            // skeleton rows in place, and the spacers around it are already
            // sized for it, so nothing on screen moves when it arrives.
            SyncContactsData.Loading(),
        ])
    )

    return {
        model: modifyFields(model, {
            pageByQueryKey: () => cache.pageByQueryKey,
            cacheKeysByRecency: () => cache.cacheKeysByRecency,
        }),
        commands: Array.map(missingPages, (page) =>
            model.source === "Local"
                ? readLocalPage({
                      page,
                      filter,
                      isVerification: false,
                      queryKey: queryKeyFor(filter, page),
                  })
                : fetchRemotePage({
                      page,
                      filter,
                      queryKey: queryKeyFor(filter, page),
                  })
        ),
    }
}

// The one rule tying the scroll window back to the page-shaped data underneath.
// Anything that can move the window, resize the container or change how many
// rows there are ends here.
const ensureWindowPages = (model: Model): UpdateReturn =>
    ensurePages(model, pagesForCurrentWindow(model))

// A detail read follows whichever source the list is reading, which is the
// premise the activities store was added for: after the swap, opening a contact
// is a local read and works offline, rather than the one thing still on the
// wire. The overlay is not merged in here — it is applied at render, exactly as
// it is for a row, so both sources keep answering identically.
const ensureDetail = (model: Model, contactId: string): UpdateReturn =>
    AsyncData.hasData(detailFor(model, contactId)) ||
    AsyncData.isPending(detailFor(model, contactId))
        ? { model, commands: [] }
        : {
              model: modifyFields(model, {
                  detailByContactId: (details) =>
                      HashMap.set(
                          details,
                          contactId,
                          SyncContactDetailData.Loading()
                      ),
              }),
              commands: [
                  model.source === "Local"
                      ? readLocalContact({ contactId })
                      : fetchRemoteContact({ contactId }),
              ],
          }

// The Model kept the scroll position across the detail view; the DOM element
// did not, because it was unmounted and a new one put back. scrollToIndex is
// what pushes the position into the new element, and it is issued on the
// measurement that arrives when that element is inserted — by then it exists,
// which is not true at the moment the route changes.
const restoreListScroll = (model: Model): UpdateReturn => {
    const { model: list, commands = [] } = Ui.VirtualList.scrollToIndex(
        model.list,
        Math.floor(model.list.scrollTop / model.list.rowHeightPx)
    )

    return {
        model: modifyFields(model, {
            list: () => list,
            isListScrollPending: () => false,
        }),
        commands: mapVirtualListCommands(commands),
    }
}

const withCommands = (
    { model, commands = [] }: UpdateReturn,
    extraCommands: ReadonlyArray<Command.Command<Message>>
): UpdateReturn => ({
    model,
    commands: Array.appendAll(commands, extraCommands),
})

// The scroll position is pushed back into the Model as well as into the DOM.
// Leaving it at the old offset would resolve, for the instant before the scroll
// event returns, to a page of a result set that no longer exists — and that
// page would be requested.
const scrollListToTop = (model: Model): UpdateReturn => {
    // Already there, which is every cold load and every search made without
    // having scrolled. Nothing to re-apply, and no container to apply it to yet.
    if (model.list.scrollTop === 0) return { model, commands: [] }

    const { model: list, commands = [] } = Ui.VirtualList.scrollToIndex(
        model.list,
        0
    )

    return {
        model: modifyFields(model, {
            list: () => modifyFields(list, { scrollTop: () => 0 }),
        }),
        commands: mapVirtualListCommands(commands),
    }
}

// Both sources settle the same way, so the fold from a Result into a cache
// entry lives once rather than being written out at each call site.
const settledCache = (
    model: Model,
    queryKey: string,
    result: Result.Result<RemoteContactsPage, string>
) => {
    const previous = Option.getOrElse(
        HashMap.get(model.pageByQueryKey, queryKey),
        SyncContactsData.Idle
    )
    const cache = withCacheEntries(model, [
        [queryKey, AsyncData.settle(result)(previous)],
    ])

    return {
        pageByQueryKey: () => cache.pageByQueryKey,
        cacheKeysByRecency: () => cache.cacheKeysByRecency,
    }
}

const contactIdsOf = (page: RemoteContactsPage): ReadonlyArray<string> =>
    Array.map(page.rows, (row) => row.contact.id)

// Order matters as much as membership: the same contacts in a different order
// is a visible reshuffle, which is exactly what must not happen.
const sameContactIds = (
    left: ReadonlyArray<string>,
    right: ReadonlyArray<string>
): boolean =>
    left.length === right.length &&
    left.every((contactId, index) => contactId === right[index])

// The check that makes the swap safe to call seamless. The local copy has to
// return the page already on screen, row for row and in the same order, before
// it is allowed to serve anything. Disagreement abandons the swap rather than
// showing it, because a silently wrong list is worse than staying on the wire.
// Virtualisation does not change what is compared: a page is still the unit,
// and the one compared is the page holding the top of the window.
const verifyAgainstScreen = (
    model: Model,
    localPage: RemoteContactsPage
): UpdateReturn =>
    Option.match(AsyncData.getData(currentPageData(model)), {
        onNone: () => ({
            model: modifyFields(model, {
                source: () => "Local",
                hydrationState: () => "Complete",
            }),
            commands: [],
        }),
        onSome: (shown) =>
            sameContactIds(contactIdsOf(shown), contactIdsOf(localPage))
                ? {
                      model: modifyFields(model, {
                          source: () => "Local",
                          hydrationState: () => "Complete",
                      }),
                      commands: [],
                  }
                : {
                      model: modifyFields(model, {
                          hydrationState: () => "Complete",
                          maybeMismatch: () =>
                              Option.some(
                                  "The local copy returned a different page than the one on screen, so the source was left on the network."
                              ),
                      }),
                      commands: [],
                  },
    })

// Applying an edit and clearing the form are one decision, so they are one
// function. The Command is decided by the caller, which is what keeps the
// optimistic apply and its rollback symmetrical.
const withOverlay = (
    model: Model,
    contactId: string,
    maybeName: Option.Option<string>
): Model =>
    modifyFields(model, {
        editedNameByContactId: (edits) =>
            Option.match(maybeName, {
                onNone: () => Record.remove(edits, contactId),
                onSome: (name) => Record.set(edits, contactId, name),
            }),
    })

const withoutPendingWrite = (model: Model, contactId: string): Model =>
    modifyFields(model, {
        pendingWriteContactIds: Array.filter(
            (pendingId) => pendingId !== contactId
        ),
    })

// Nothing is read here. The URL decides which rows the list answers, and it
// arrives as ChangedSyncRoute — on a cold load as much as on a back button.
// Requesting a page here as well would fetch the unfiltered first page on top
// of the one the URL actually asks for.
//
// The background fill and the edit restore do start here, because neither
// depends on the filter: the local copy is written whole, and edits survived
// the last session and have to be on screen before hydration replaces the rows
// they sit over.
export const init = (): UpdateReturn => ({
    model: emptyModel(),
    commands: [hydrateBatch({ startIndex: 0 }), loadEdits],
})

export const update = (
    model: Model,
    message: Message,
    navigation: NavigationMode = "Browser"
): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            // A scroll or a resize changes the window, and the window decides which
            // pages have to exist. Delegating and then reconciling in one handler is
            // what keeps the two from drifting apart.
            GotSyncVirtualListMessage: ({ message: listMessage }) => {
                const { model: list, commands: listCommands = [] } =
                    Ui.VirtualList.update(model.list, listMessage)
                const measured = modifyFields(model, { list: () => list })
                // The measurement that follows a remount is the signal that the
                // container is back in the DOM, and the only moment at which the
                // saved position can be applied to it.
                const { model: restored, commands: restoreCommands = [] } =
                    model.isListScrollPending &&
                    listMessage._tag === "MeasuredContainer"
                        ? restoreListScroll(measured)
                        : { model: measured, commands: [] }

                return withCommands(
                    ensureWindowPages(restored),
                    Array.appendAll(
                        mapVirtualListCommands(listCommands),
                        restoreCommands
                    )
                )
            },
            // Written into the entry that asked for it, whether or not it is still
            // inside the window. A late response fills its own slot, so scrolling
            // back to that page finds it answered instead of re-asking.
            // The reconcile after the write is not incidental: a settled page can be
            // the first answer for its search, and that is the moment the row count
            // — and so the window, and so which pages are needed — becomes known.
            SettledSyncRemotePage: ({ queryKey, result }) =>
                model.source === "Remote"
                    ? ensureWindowPages(
                          modifyFields(model, {
                              ...settledCache(model, queryKey, result),
                              remoteRequests: (count) => count + 1,
                          })
                      )
                    : // Once the local copy is authoritative a slow network response
                      // is not just redundant, it could overwrite a fresher local
                      // read. It is dropped rather than cached.
                      { model, commands: [] },
            SettledSyncLocalPage: ({ queryKey, isVerification, result }) => {
                if (isVerification) {
                    return Result.match(result, {
                        onFailure: (error) => ({
                            model: modifyFields(model, {
                                hydrationState: () => "Complete",
                                maybeMismatch: () =>
                                    Option.some(
                                        `Verification read failed: ${error}`
                                    ),
                            }),
                            commands: [],
                        }),
                        onSuccess: (localPage) =>
                            verifyAgainstScreen(model, localPage),
                    })
                }

                return model.source === "Local"
                    ? ensureWindowPages(
                          modifyFields(model, {
                              ...settledCache(model, queryKey, result),
                              localRequests: (count) => count + 1,
                          })
                      )
                    : { model, commands: [] }
            },
            SettledSyncHydrationBatch: ({ hydratedContacts }) =>
                hydratedContacts >= TOTAL_CONTACTS
                    ? {
                          model: modifyFields(model, {
                              hydratedContacts: () => hydratedContacts,
                              hydrationState: () => "Verifying",
                          }),
                          commands: [
                              readLocalPage({
                                  page: anchorPageFor(model),
                                  filter: filterOf(model),
                                  isVerification: true,
                                  queryKey: activeQueryKeyFor(model),
                              }),
                          ],
                      }
                    : {
                          model: modifyFields(model, {
                              hydratedContacts: () => hydratedContacts,
                          }),
                          commands: [
                              hydrateBatch({ startIndex: hydratedContacts }),
                          ],
                      },
            // The only handler that turns a filter into a read. Everything else
            // writes a URL, which means a deep link, a back button and a keystroke
            // all reach the data by the same path — one direction, so back and
            // forward work by construction rather than by being handled.
            ChangedSyncRoute: ({ route }) =>
                M.value(route).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        CrmSyncList: (listRoute) => {
                            const searchText = searchTextFromRoute(listRoute)
                            const tagIds = tagIdsFromRoute(listRoute)
                            const recency = activityRecencyFromRoute(listRoute)
                            const nextFilter: SyncFilter = {
                                searchText,
                                tagIds,
                                recency,
                            }
                            // Resyncing the input from the route keeps the box correct
                            // on cold load, back/forward, and any navigation the demo
                            // did not originate. While typing it is already equal.
                            // Leaving the contact selected is what marks the list as
                            // needing its position pushed back into a fresh container.
                            const listed = modifyFields(model, {
                                searchText: () => searchText,
                                maybeSelectedContactId: () => Option.none(),
                                isListScrollPending: (isPending) =>
                                    isPending ||
                                    Option.isSome(model.maybeSelectedContactId),
                            })

                            // The whole filter, not the search alone: a tag toggled off
                            // is as much a different result set as a word typed.
                            if (
                                filterKeyOf(nextFilter) ===
                                filterKeyOf(filterOf(model))
                            ) {
                                return ensureWindowPages(listed)
                            }

                            // A different result set, so the old offset means nothing:
                            // back to the top, and nothing to restore.
                            const {
                                model: scrolled,
                                commands: scrollCommands = [],
                            } = scrollListToTop(
                                modifyFields(listed, {
                                    activeSearchText: () => searchText,
                                    activeTagIds: () => tagIds,
                                    activeRecency: () => recency,
                                    isListScrollPending: () => false,
                                })
                            )

                            return withCommands(
                                ensureWindowPages(scrolled),
                                scrollCommands
                            )
                        },
                        // The list submodel is untouched here on purpose. Its scrollTop
                        // is the reader's place, and the only thing that keeps it is
                        // nothing writing over it while the detail is on screen.
                        CrmSyncContact: ({ contactId }) =>
                            ensureDetail(
                                modifyFields(model, {
                                    maybeSelectedContactId: () =>
                                        Option.some(contactId),
                                }),
                                contactId
                            ),
                    })
                ),
            SettledSyncContactDetail: ({ contactId, result }) => ({
                model: modifyFields(model, {
                    detailByContactId: HashMap.modify(
                        contactId,
                        AsyncData.settle(result)
                    ),
                }),
                commands: [],
            }),
            // Navigation has nothing left to do once the URL is written: the route
            // change is what carries the work, and it arrives as ChangedSyncRoute.
            CompletedSyncUrlReplacement: () => ({ model, commands: [] }),
            // Debounced while the network is the source, immediate once the local
            // copy is.
            //
            // The debounce guards a round trip, and after the swap there is no round
            // trip to guard — a local index read answers in well under a frame. It
            // was also, less obviously, hiding a blank list between searches: a new
            // query key has no answered page, so the rows came out and a spinner
            // went in. That is what `displayedFilterKeyFor` fixes, and until it did,
            // dispatching per keystroke here strobed.
            UpdatedSyncSearchText: ({ value }) => ({
                model: modifyFields(model, { searchText: () => value }),
                commands:
                    model.source === "Local"
                        ? [
                              replaceSyncFilter(
                                  {
                                      ...filterOf(model),
                                      searchText: value,
                                  },
                                  navigation
                              ),
                          ]
                        : [debounceSearch({ value })],
            }),
            // The guard: a timer armed by an earlier keystroke arrives carrying text
            // the Model has moved on from, and is dropped. The Model is returned
            // unchanged either way — writing the URL and updating the Model here as
            // well is the tempting shortcut, and it double-fetches on back/forward.
            ElapsedSyncSearchDebounce: ({ value }) =>
                value === model.searchText
                    ? {
                          model,
                          commands: [
                              replaceSyncFilter(
                                  {
                                      ...filterOf(model),
                                      searchText: value,
                                  },
                                  navigation
                              ),
                          ],
                      }
                    : { model, commands: [] },
            // Straight to the URL, no debounce and no Model change here: the route
            // change is what carries the read, exactly as it is for a search.
            ToggledSyncTagFacet: ({ tagId }) => ({
                model,
                commands: [
                    replaceSyncFilter(
                        {
                            ...filterOf(model),
                            tagIds: model.activeTagIds.includes(tagId)
                                ? Array.filter(
                                      model.activeTagIds,
                                      (selected) => selected !== tagId
                                  )
                                : Array.append(model.activeTagIds, tagId),
                        },
                        navigation
                    ),
                ],
            }),
            SelectedSyncActivityRecency: ({ recency }) => ({
                model,
                commands: [
                    replaceSyncFilter(
                        { ...filterOf(model), recency },
                        navigation
                    ),
                ],
            }),
            ClickedSyncRebuild: () => ({
                model: modifyFields(emptyModel(), {
                    list: () => model.list,
                    searchText: () => model.searchText,
                    activeSearchText: () => model.activeSearchText,
                    activeTagIds: () => model.activeTagIds,
                    activeRecency: () => model.activeRecency,
                }),
                commands: [rebuildDatabase],
            }),
            CompletedSyncRebuild: () =>
                withCommands(ensureWindowPages(model), [
                    hydrateBatch({ startIndex: 0 }),
                ]),
            FailedSyncOperation: ({ error }) => ({
                model: modifyFields(model, {
                    hydrationState: () => "Failed",
                    maybeError: () => Option.some(error),
                }),
                commands: [],
            }),
            ClickedEditSyncContact: ({ contactId }) => ({
                model: modifyFields(model, {
                    maybeEditingContactId: () => Option.some(contactId),
                    editedName: () => currentNameFor(model, contactId),
                    maybeWriteError: () => Option.none(),
                }),
                commands: [],
            }),
            UpdatedSyncEditedName: ({ value }) => ({
                model: modifyFields(model, { editedName: () => value }),
                commands: [],
            }),
            ClickedCancelSyncContactEdit: () => ({
                model: modifyFields(model, {
                    maybeEditingContactId: () => Option.none(),
                    editedName: () => "",
                }),
                commands: [],
            }),
            // Optimistic: the overlay is applied now and the write is sent after.
            // previousName rides along so the rollback has something to restore —
            // by the time the result lands the Model has already forgotten it.
            SubmittedSyncContactEdit: () =>
                Option.match(model.maybeEditingContactId, {
                    onNone: (): UpdateReturn => ({ model, commands: [] }),
                    onSome: (contactId) => ({
                        model: modifyFields(
                            withOverlay(
                                model,
                                contactId,
                                Option.some(model.editedName)
                            ),
                            {
                                pendingWriteContactIds: (pending) =>
                                    pending.includes(contactId)
                                        ? pending
                                        : Array.append(pending, contactId),
                                maybeEditingContactId: () => Option.none(),
                                editedName: () => "",
                                maybeWriteError: () => Option.none(),
                            }
                        ),
                        commands: [
                            writeContactEdit({
                                contactId,
                                name: model.editedName,
                                previousName: Record.get(
                                    model.editedNameByContactId,
                                    contactId
                                ),
                            }),
                        ],
                    }),
                }),
            SettledSyncContactWrite: ({ contactId, previousName, result }) =>
                Result.match(result, {
                    // Rollback restores the overlay to exactly what it held before the
                    // optimistic apply, which for a first edit means removing it rather
                    // than writing an empty string.
                    onFailure: (error) => ({
                        model: modifyFields(
                            withoutPendingWrite(
                                withOverlay(model, contactId, previousName),
                                contactId
                            ),
                            {
                                maybeWriteError: () => Option.some(error),
                            }
                        ),
                        commands: [],
                    }),
                    onSuccess: () => ({
                        model: withoutPendingWrite(model, contactId),
                        commands: [],
                    }),
                }),
            SettledSyncEditsLoad: ({ edits }) => ({
                model: modifyFields(model, {
                    // Loaded edits lose to anything written this session: a write
                    // made while the read was in flight is newer than the row it
                    // returns.
                    editedNameByContactId: (current) =>
                        Record.union(
                            Record.fromEntries(edits),
                            current,
                            (_, live) => live
                        ),
                }),
                commands: [],
            }),
        })
    )

// What the edit box should open with: the local edit if there is one, otherwise
// the name the row is showing.
const currentNameFor = (model: Model, contactId: string): string =>
    Option.match(Record.get(model.editedNameByContactId, contactId), {
        // Scanned across every answered page rather than one page on screen:
        // under a continuous scroll the rows in view can come from two.
        onNone: () =>
            Option.match(
                Array.findFirst(
                    Array.flatMap(
                        Array.getSomes(
                            Array.map(model.cacheKeysByRecency, (queryKey) =>
                                Option.flatMap(
                                    HashMap.get(model.pageByQueryKey, queryKey),
                                    AsyncData.getData
                                )
                            )
                        ),
                        (page) => page.rows
                    ),
                    (row) => row.contact.id === contactId
                ),
                { onNone: () => "", onSome: (row) => row.contact.name }
            ),
        onSome: (name) => name,
    })

export const hydrationPercent = (model: Model): number =>
    Math.min(100, Math.round((model.hydratedContacts / TOTAL_CONTACTS) * 100))

export const batchCount = Math.ceil(TOTAL_CONTACTS / HYDRATION_BATCH_SIZE)

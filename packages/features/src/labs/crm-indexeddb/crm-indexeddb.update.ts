import { Array, Equal, HashMap, Match as M, Option } from "effect"
import { AsyncData, Update } from "foldkit"
import { modifyFields } from "foldkit/struct"

import {
    debounceSearch,
    inspectDatabase,
    queryContacts,
    rebuildDatabase,
    seedDatabaseBatch,
} from "./crm-indexeddb.command.ts"
import type { Message } from "./crm-indexeddb.message.ts"
import { IndexedContactsData, type Model } from "./crm-indexeddb.model.ts"
import { contactCountForDatasetSize } from "../crm/crm.generate.ts"

type UpdateReturn = Update.Return<Model, Message>
const withUpdateReturn = M.withReturnType<UpdateReturn>()
export const MAX_CACHED_QUERY_PAGES = 24

// The read strategy is part of the key: the two strategies return the same rows
// but different query plans, and caching them separately keeps the request count
// on screen honest after a flip.
const queryKeyFor = (model: Model, page: number): string =>
    `${model.selectedDatasetSize}|${model.searchText}|${model.selectedTagIds.join(",")}|${model.activityRecency}|${model.isDenormalizedRead}|${model.isTokenIndexSearch}|${page}`

const currentPage = (model: Model) =>
    Option.getOrElse(
        HashMap.get(model.pageByQueryKey, model.activeQueryKey),
        IndexedContactsData.Idle
    )

const cachePage = (
    model: Model,
    queryKey: string,
    page: typeof IndexedContactsData.schema.Type
) => {
    const keys = [
        queryKey,
        ...Array.filter(model.cacheKeysByRecency, (key) => key !== queryKey),
    ]
    const evicted = Array.drop(keys, MAX_CACHED_QUERY_PAGES)
    return {
        cacheKeysByRecency: Array.take(keys, MAX_CACHED_QUERY_PAGES),
        pageByQueryKey: Array.reduce(
            evicted,
            HashMap.set(model.pageByQueryKey, queryKey, page),
            (cache, key) => HashMap.remove(cache, key)
        ),
    }
}

const requestPage = (model: Model, page: number): UpdateReturn => {
    const queryKey = queryKeyFor(model, page)
    const current = Option.getOrElse(
        HashMap.get(model.pageByQueryKey, queryKey),
        IndexedContactsData.Idle
    )
    return Option.match(AsyncData.revalidateOrLoad(current), {
        onNone: () => {
            const cache = cachePage(model, queryKey, current)
            return {
                model: modifyFields(model, {
                    activeQueryKey: () => queryKey,
                    pendingQueryKey: () => Option.none(),
                    pageByQueryKey: () => cache.pageByQueryKey,
                    cacheKeysByRecency: () => cache.cacheKeysByRecency,
                }),
                commands: [],
            }
        },
        onSome: (next) => {
            const cache = cachePage(model, queryKey, next)
            const isColdQuery = !AsyncData.hasData(current)
            return {
                model: modifyFields(model, {
                    activeQueryKey: () =>
                        isColdQuery ? model.activeQueryKey : queryKey,
                    pendingQueryKey: () =>
                        isColdQuery ? Option.some(queryKey) : Option.none(),
                    pageByQueryKey: () => cache.pageByQueryKey,
                    cacheKeysByRecency: () => cache.cacheKeysByRecency,
                }),
                commands: [
                    queryContacts({
                        searchText: model.searchText,
                        selectedTagIds: model.selectedTagIds,
                        activityRecency: model.activityRecency,
                        page,
                        queryKey,
                        isDenormalizedRead: model.isDenormalizedRead,
                        isTokenIndexSearch: model.isTokenIndexSearch,
                    }),
                ],
            }
        },
    })
}

// activeQueryKey already encodes the committed search text, tags, recency and
// size, so comparing it against the key the current inputs would produce says
// whether this request would repeat the query already on screen.
const requestFirstPageIfChanged = (model: Model): UpdateReturn =>
    model.activeQueryKey === queryKeyFor(model, 0) &&
    AsyncData.hasData(currentPage(model))
        ? { model, commands: [] }
        : requestPage(model, 0)

const seedNextBatch = (model: Model, seededContacts: number): UpdateReturn =>
    seededContacts >= contactCountForDatasetSize(model.selectedDatasetSize)
        ? requestPage(
              modifyFields(model, {
                  seedingState: () => "Ready",
                  seededContacts: () => seededContacts,
              }),
              0
          )
        : {
              model: modifyFields(model, {
                  seedingState: () => "Seeding",
                  seededContacts: () => seededContacts,
              }),
              commands: [
                  seedDatabaseBatch({
                      size: model.selectedDatasetSize,
                      startIndex: seededContacts,
                  }),
              ],
          }

const updateSelectedTags = (
    selectedTagIds: ReadonlyArray<string>,
    tagId: string,
    isSelected: boolean
): ReadonlyArray<string> =>
    isSelected
        ? selectedTagIds.includes(tagId)
            ? selectedTagIds
            : [...selectedTagIds, tagId]
        : Array.filter(selectedTagIds, (id) => id !== tagId)

export const init = (): UpdateReturn => ({
    model: {
        selectedDatasetSize: "TenThousand",
        searchText: "",
        isSearchDebounced: true,
        isDenormalizedRead: true,
        isTokenIndexSearch: true,
        selectedTagIds: [],
        activityRecency: "Any",
        seedingState: "Inspecting",
        seededContacts: 0,
        activeQueryKey: "",
        pendingQueryKey: Option.none(),
        pageByQueryKey: HashMap.empty(),
        cacheKeysByRecency: [],
        maybeError: Option.none(),
    },
    commands: [inspectDatabase],
})

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedIndexedDbCrmSearchText: ({ value }) => {
                const typed = modifyFields(model, { searchText: () => value })

                if (model.seedingState !== "Ready")
                    return { model: typed, commands: [] }

                // Each skipped keystroke here saves a real cursor scan of the whole
                // contacts store, not a simulated latency.
                return model.isSearchDebounced
                    ? { model: typed, commands: [debounceSearch({ value })] }
                    : requestPage(typed, 0)
            },
            // The guard: a timer armed by an earlier keystroke arrives carrying text
            // the Model has moved on from, and is dropped.
            ElapsedIndexedDbCrmSearchDebounce: ({ value }) =>
                value === model.searchText && model.seedingState === "Ready"
                    ? requestFirstPageIfChanged(model)
                    : { model, commands: [] },
            ToggledIndexedDbCrmDenormalizedRead: ({ isEnabled }) => {
                const toggled = modifyFields(model, {
                    isDenormalizedRead: () => isEnabled,
                })

                // Re-runs the page under the strategy just chosen, staying on the
                // page being looked at, so the two request counts can be compared
                // with nothing else changed.
                return model.seedingState === "Ready"
                    ? requestPage(
                          toggled,
                          Option.match(AsyncData.getData(currentPage(model)), {
                              onNone: () => 0,
                              onSome: (page) => page.page,
                          })
                      )
                    : { model: toggled, commands: [] }
            },
            ToggledIndexedDbCrmTokenIndexSearch: ({ isEnabled }) => {
                const toggled = modifyFields(model, {
                    isTokenIndexSearch: () => isEnabled,
                })

                // Only matters while there is search text: with the box empty both
                // settings take the same paged-index path.
                return model.seedingState === "Ready" && model.searchText !== ""
                    ? requestPage(toggled, 0)
                    : { model: toggled, commands: [] }
            },
            ToggledIndexedDbCrmSearchDebounce: ({ isEnabled }) => {
                const toggled = modifyFields(model, {
                    isSearchDebounced: () => isEnabled,
                })

                // Switching debouncing off runs whatever is already typed, so the
                // results match the box rather than waiting for a keystroke.
                return isEnabled || model.seedingState !== "Ready"
                    ? { model: toggled, commands: [] }
                    : requestFirstPageIfChanged(toggled)
            },
            SelectedIndexedDbCrmDatasetSize: ({ size }) => ({
                model: modifyFields(model, {
                    selectedDatasetSize: () => size,
                    seededContacts: () => 0,
                    seedingState: () => "Seeding",
                    activeQueryKey: () => "",
                    pendingQueryKey: () => Option.none(),
                    pageByQueryKey: () => HashMap.empty(),
                    cacheKeysByRecency: () => [],
                }),
                commands: [rebuildDatabase({ size })],
            }),
            ToggledIndexedDbCrmTagFacet: ({ tagId, isSelected }) =>
                model.seedingState === "Ready"
                    ? requestPage(
                          modifyFields(model, {
                              selectedTagIds: () =>
                                  updateSelectedTags(
                                      model.selectedTagIds,
                                      tagId,
                                      isSelected
                                  ),
                          }),
                          0
                      )
                    : {
                          model: modifyFields(model, {
                              selectedTagIds: () =>
                                  updateSelectedTags(
                                      model.selectedTagIds,
                                      tagId,
                                      isSelected
                                  ),
                          }),
                          commands: [],
                      },
            SelectedIndexedDbCrmActivityRecency: ({ activityRecency }) =>
                model.seedingState === "Ready"
                    ? requestPage(
                          modifyFields(model, {
                              activityRecency: () => activityRecency,
                          }),
                          0
                      )
                    : {
                          model: modifyFields(model, {
                              activityRecency: () => activityRecency,
                          }),
                          commands: [],
                      },
            ClickedIndexedDbCrmRebuild: () => ({
                model: modifyFields(model, {
                    seededContacts: () => 0,
                    seedingState: () => "Seeding",
                    activeQueryKey: () => "",
                    pendingQueryKey: () => Option.none(),
                    pageByQueryKey: () => HashMap.empty(),
                    cacheKeysByRecency: () => [],
                    maybeError: () => Option.none(),
                }),
                commands: [
                    rebuildDatabase({ size: model.selectedDatasetSize }),
                ],
            }),
            RequestedNextIndexedDbCrmPage: () =>
                Option.match(AsyncData.getData(currentPage(model)), {
                    onNone: () => ({ model, commands: [] }),
                    onSome: (page) =>
                        page.hasNextPage
                            ? requestPage(model, page.page + 1)
                            : { model, commands: [] },
                }),
            RequestedPreviousIndexedDbCrmPage: () =>
                Option.match(AsyncData.getData(currentPage(model)), {
                    onNone: () => ({ model, commands: [] }),
                    onSome: (page) =>
                        page.page > 0
                            ? requestPage(model, page.page - 1)
                            : { model, commands: [] },
                }),
            InspectedIndexedDbCrmDatabase: ({ seededContacts, size }) =>
                seedNextBatch(
                    modifyFields(model, { selectedDatasetSize: () => size }),
                    seededContacts
                ),
            SeededIndexedDbCrmDatabaseBatch: ({ seededContacts }) =>
                seedNextBatch(model, seededContacts),
            // Unlike the other two demos this keeps the Option.match guard: it also
            // decides whether the pending query becomes the active one, and pointing
            // activeQueryKey at an evicted entry would blank the view.
            SettledIndexedDbContactsQuery: ({ queryKey, result }) =>
                Option.match(HashMap.get(model.pageByQueryKey, queryKey), {
                    onNone: () => ({ model, commands: [] }),
                    onSome: (page) => ({
                        model: modifyFields(model, {
                            activeQueryKey: () =>
                                Option.exists(
                                    model.pendingQueryKey,
                                    (pendingQueryKey) =>
                                        Equal.equals(pendingQueryKey, queryKey)
                                )
                                    ? queryKey
                                    : model.activeQueryKey,
                            pendingQueryKey: () =>
                                Option.exists(
                                    model.pendingQueryKey,
                                    (pendingQueryKey) =>
                                        Equal.equals(pendingQueryKey, queryKey)
                                )
                                    ? Option.none()
                                    : model.pendingQueryKey,
                            pageByQueryKey: HashMap.set(
                                queryKey,
                                AsyncData.settle(page, result)
                            ),
                        }),
                        commands: [],
                    }),
                }),
            FailedIndexedDbOperation: ({ error }) => ({
                model: modifyFields(model, {
                    seedingState: () => "Failed",
                    maybeError: () => Option.some(error),
                }),
                commands: [],
            }),
        })
    )

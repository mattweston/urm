import { Array, HashMap, Match as M, Option, Result } from "effect"
import { AsyncData, Update } from "foldkit"
import { modifyFields } from "foldkit/struct"

import { queryNormalizedContacts } from "./crm-normalized.command.ts"
import {
    mergeRows,
    pageOfIds,
    renameContact,
    toggleContactTag,
    type NormalizedStore,
} from "./crm-normalized.domain.ts"
import type { Message } from "./crm-normalized.message.ts"
import {
    ContactPageAsyncData,
    emptyModel,
    type FilterPreset,
    type Model,
} from "./crm-normalized.model.ts"
import type { RemoteContactsPage } from "../crm-remote/crm-remote.domain.ts"

type UpdateReturn = Update.Return<Model, Message>
const withUpdateReturn = M.withReturnType<UpdateReturn>()
export const MAX_CACHED_QUERY_PAGES = 24

const PRESET_TAG_IDS: Readonly<Record<FilterPreset, string>> = {
    EnterpriseTag: "enterprise",
    FounderTag: "founder",
}

const cacheWithPage = (
    model: Model,
    queryKey: string,
    page: typeof ContactPageAsyncData.schema.Type
) => {
    const keysByRecency = [
        queryKey,
        ...Array.filter(
            model.cacheKeysByRecency,
            (cachedKey) => cachedKey !== queryKey
        ),
    ]
    const evictedKeys = Array.drop(keysByRecency, MAX_CACHED_QUERY_PAGES)

    return {
        cacheKeysByRecency: Array.take(keysByRecency, MAX_CACHED_QUERY_PAGES),
        pageByQueryKey: Array.reduce(
            evictedKeys,
            HashMap.set(model.pageByQueryKey, queryKey, page),
            (cache, evictedKey) => HashMap.remove(cache, evictedKey)
        ),
    }
}

const queryKeyFor = (model: Model, page: number): string =>
    `${model.selectedDatasetSize}|${model.searchText}|${model.selectedTagIds.join(",")}|${model.activityRecency}|${page}`

const currentPageData = (model: Model) =>
    Option.getOrElse(
        HashMap.get(model.pageByQueryKey, model.activeQueryKey),
        ContactPageAsyncData.Idle
    )

// `loadIfMissing`, not `revalidateOrLoad`: a cache entry is a list of ids that
// the store already resolves, so revisiting a query has nothing to refetch.
// This is what lets a local edit stay visible when the user switches back.
const requestPage = (model: Model, page: number): UpdateReturn => {
    const queryKey = queryKeyFor(model, page)
    const current = Option.getOrElse(
        HashMap.get(model.pageByQueryKey, queryKey),
        ContactPageAsyncData.Idle
    )
    const maybeLoading = AsyncData.loadIfMissing(current)
    const cache = cacheWithPage(
        model,
        queryKey,
        Option.getOrElse(maybeLoading, () => current)
    )

    return {
        model: modifyFields(model, {
            activeQueryKey: () => queryKey,
            pageByQueryKey: () => cache.pageByQueryKey,
            cacheKeysByRecency: () => cache.cacheKeysByRecency,
        }),
        commands: Array.fromOption(
            Option.map(maybeLoading, () =>
                queryNormalizedContacts({
                    size: model.selectedDatasetSize,
                    searchText: model.searchText,
                    selectedTagIds: model.selectedTagIds,
                    activityRecency: model.activityRecency,
                    page,
                    queryKey,
                })
            )
        ),
    }
}

const resetAndRequest = (model: Model): UpdateReturn =>
    requestPage(
        modifyFields(model, {
            maybeEditingContactId: () => Option.none(),
            editedName: () => "",
        }),
        0
    )

const updateSelectedTags = (
    selectedTagIds: ReadonlyArray<string>,
    tagId: string,
    isSelected: boolean
): ReadonlyArray<string> =>
    isSelected
        ? selectedTagIds.includes(tagId)
            ? selectedTagIds
            : [...selectedTagIds, tagId]
        : Array.filter(
              selectedTagIds,
              (selectedTagId) => selectedTagId !== tagId
          )

const withContactId = (
    contactIds: ReadonlyArray<string>,
    contactId: string
): ReadonlyArray<string> =>
    contactIds.includes(contactId) ? contactIds : [...contactIds, contactId]

const storeWithResponse = (
    model: Model,
    result: Result.Result<RemoteContactsPage, string>
): NormalizedStore =>
    Result.match(result, {
        onFailure: () => model.store,
        onSuccess: (response) =>
            mergeRows(
                model.store,
                response.rows,
                model.locallyEditedContactIds
            ),
    })

export const init = (): UpdateReturn => requestPage(emptyModel(), 0)

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedNormalizedCrmSearchText: ({ value }) =>
                resetAndRequest(modifyFields(model, { searchText: () => value })),
            SelectedNormalizedCrmDatasetSize: ({ size }) =>
                resetAndRequest(
                    modifyFields(model, { selectedDatasetSize: () => size })
                ),
            ToggledNormalizedCrmTagFacet: ({ tagId, isSelected }) =>
                resetAndRequest(
                    modifyFields(model, {
                        selectedTagIds: () =>
                            updateSelectedTags(
                                model.selectedTagIds,
                                tagId,
                                isSelected
                            ),
                    })
                ),
            SelectedNormalizedCrmActivityRecency: ({ activityRecency }) =>
                resetAndRequest(
                    modifyFields(model, { activityRecency: () => activityRecency })
                ),
            SelectedNormalizedCrmFilterPreset: ({ preset }) =>
                resetAndRequest(
                    modifyFields(model, {
                        searchText: () => "",
                        selectedTagIds: () => [PRESET_TAG_IDS[preset]],
                        activityRecency: () => "Any",
                    })
                ),
            RequestedNextNormalizedCrmPage: () =>
                Option.match(AsyncData.getData(currentPageData(model)), {
                    onNone: (): UpdateReturn => ({ model, commands: [] }),
                    onSome: (page) =>
                        page.hasNextPage
                            ? requestPage(model, page.page + 1)
                            : { model, commands: [] },
                }),
            RequestedPreviousNormalizedCrmPage: () =>
                Option.match(AsyncData.getData(currentPageData(model)), {
                    onNone: (): UpdateReturn => ({ model, commands: [] }),
                    onSome: (page) =>
                        page.page > 0
                            ? requestPage(model, page.page - 1)
                            : { model, commands: [] },
                }),
            ClickedEditNormalizedCrmContact: ({ contactId }) => ({
                model: modifyFields(model, {
                    maybeEditingContactId: () => Option.some(contactId),
                    editedName: () =>
                        Option.match(
                            Option.fromNullishOr(
                                model.store.contactsById[contactId]
                            ),
                            {
                                onNone: () => "",
                                onSome: (contact) => contact.name,
                            }
                        ),
                }),
                commands: [],
            }),
            UpdatedNormalizedCrmEditedName: ({ value }) => ({
                model: modifyFields(model, { editedName: () => value }),
                commands: [],
            }),
            SubmittedNormalizedCrmContactEdit: () =>
                Option.match(model.maybeEditingContactId, {
                    onNone: (): UpdateReturn => ({ model, commands: [] }),
                    onSome: (contactId) => ({
                        model: modifyFields(model, {
                            store: () =>
                                renameContact(
                                    model.store,
                                    contactId,
                                    model.editedName
                                ),
                            locallyEditedContactIds: () =>
                                withContactId(
                                    model.locallyEditedContactIds,
                                    contactId
                                ),
                            maybeEditingContactId: () => Option.none(),
                            editedName: () => "",
                        }),
                        commands: [],
                    }),
                }),
            ClickedCancelNormalizedCrmContactEdit: () => ({
                model: modifyFields(model, {
                    maybeEditingContactId: () => Option.none(),
                    editedName: () => "",
                }),
                commands: [],
            }),
            ToggledNormalizedCrmContactTag: ({ contactId, tagId }) => ({
                model: modifyFields(model, {
                    store: () =>
                        toggleContactTag(model.store, contactId, tagId),
                    locallyEditedContactIds: () =>
                        withContactId(model.locallyEditedContactIds, contactId),
                }),
                commands: [],
            }),
            // The response splits in two here: rows are merged into the one
            // store, and only their ids are kept in the cache entry.
            SettledNormalizedContactsQuery: ({ queryKey, result }) => ({
                model: modifyFields(model, {
                    store: () => storeWithResponse(model, result),
                    pageByQueryKey: HashMap.modify(
                        queryKey,
                        AsyncData.settle(Result.map(result, pageOfIds))
                    ),
                }),
                commands: [],
            }),
        })
    )

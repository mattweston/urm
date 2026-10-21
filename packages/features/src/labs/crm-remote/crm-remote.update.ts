import {
    Array,
    Effect,
    HashMap,
    Match as M,
    Option,
    Schema as S,
    String,
} from "effect"
import { AsyncData, Command, Navigation, Update } from "foldkit"
import { modifyFields } from "foldkit/struct"

import {
    debounceRemoteCrmSearch,
    queryRemoteContacts,
} from "./crm-remote.command.ts"
import {
    ChangedRemoteCrmRoute,
    CompletedRemoteCrmUrlPush,
    CompletedRemoteCrmUrlReplacement,
    type Message,
} from "./crm-remote.message.ts"
import {
    RemoteContactsAsyncData,
    emptyModel,
    type Model,
} from "./crm-remote.model.ts"
import {
    CrmRemoteRoute,
    crmRemoteBrowseFieldsFromRoute,
    crmRemoteBrowseHref,
    selectedTagIdsFromRoute,
    type CrmRemoteBrowseFields,
} from "./crm-remote.route.ts"

type UpdateReturn = Update.Return<Model, Message>
const withUpdateReturn = M.withReturnType<UpdateReturn>()
export const MAX_CACHED_QUERY_PAGES = 24

const ReplaceRemoteCrmUrl = Command.define("ReplaceRemoteCrmUrl", {
    args: { href: S.String },
    messages: [CompletedRemoteCrmUrlReplacement],
    execute: ({ href }) =>
        Navigation.replaceUrl(href).pipe(
            Effect.as(CompletedRemoteCrmUrlReplacement())
        ),
})

const PushRemoteCrmUrl = Command.define("PushRemoteCrmUrl", {
    args: { href: S.String },
    messages: [CompletedRemoteCrmUrlPush],
    execute: ({ href }) =>
        Navigation.pushUrl(href).pipe(Effect.as(CompletedRemoteCrmUrlPush())),
})

const ChangeEmbeddedRemoteCrmRoute = Command.define(
    "ChangeEmbeddedRemoteCrmRoute",
    {
        args: { route: CrmRemoteRoute },
        messages: [ChangedRemoteCrmRoute],
        execute: ({ route }) =>
            Effect.succeed(ChangedRemoteCrmRoute({ route })),
    }
)

type NavigationMode = "Browser" | "Model"

const replaceRemoteRoute = (
    fields: CrmRemoteBrowseFields,
    navigation: NavigationMode
) =>
    navigation === "Browser"
        ? ReplaceRemoteCrmUrl({ href: crmRemoteBrowseHref(fields) })
        : ChangeEmbeddedRemoteCrmRoute({ route: CrmRemoteRoute(fields) })

const pushRemoteRoute = (
    fields: CrmRemoteBrowseFields,
    navigation: NavigationMode
) =>
    navigation === "Browser"
        ? PushRemoteCrmUrl({ href: crmRemoteBrowseHref(fields) })
        : ChangeEmbeddedRemoteCrmRoute({ route: CrmRemoteRoute(fields) })

const cacheWithPage = (
    model: Model,
    queryKey: string,
    page: typeof RemoteContactsAsyncData.schema.Type
) => {
    const allKeysByRecency = [
        queryKey,
        ...Array.filter(
            model.cacheKeysByRecency,
            (cachedKey) => cachedKey !== queryKey
        ),
    ]
    const cacheKeysByRecency = Array.take(
        allKeysByRecency,
        MAX_CACHED_QUERY_PAGES
    )
    const evictedKeys = Array.drop(allKeysByRecency, MAX_CACHED_QUERY_PAGES)

    return {
        cacheKeysByRecency,
        pageByQueryKey: Array.reduce(
            evictedKeys,
            HashMap.set(model.pageByQueryKey, queryKey, page),
            (cache, evictedKey) => HashMap.remove(cache, evictedKey)
        ),
    }
}

const queryKeyFor = (fields: CrmRemoteBrowseFields): string =>
    `${fields.size}|${Option.getOrElse(fields.search, () => "")}|${Option.getOrElse(fields.tags, () => "")}|${fields.recency}|${fields.page}`

const currentPageData = (model: Model) =>
    Option.getOrElse(
        HashMap.get(model.pageByQueryKey, model.activeQueryKey),
        RemoteContactsAsyncData.Idle
    )

const requestCurrentRoutePage = (model: Model): UpdateReturn => {
    const fields = crmRemoteBrowseFieldsFromRoute(model.route)
    const queryKey = queryKeyFor(fields)
    const current = Option.getOrElse(
        HashMap.get(model.pageByQueryKey, queryKey),
        RemoteContactsAsyncData.Idle
    )

    return Option.match(AsyncData.revalidateOrLoad(current), {
        onNone: () => {
            const cache = cacheWithPage(model, queryKey, current)
            return {
                model: modifyFields(model, {
                    activeQueryKey: () => queryKey,
                    pageByQueryKey: () => cache.pageByQueryKey,
                    cacheKeysByRecency: () => cache.cacheKeysByRecency,
                }),
                commands: [],
            }
        },
        onSome: (next) => {
            const cache = cacheWithPage(model, queryKey, next)
            return {
                model: modifyFields(model, {
                    activeQueryKey: () => queryKey,
                    pageByQueryKey: () => cache.pageByQueryKey,
                    cacheKeysByRecency: () => cache.cacheKeysByRecency,
                    issuedQueryCount: (count) => count + 1,
                }),
                commands: [
                    queryRemoteContacts({
                        size: fields.size,
                        searchText: Option.getOrElse(fields.search, () => ""),
                        selectedTagIds: selectedTagIdsFromRoute(model.route),
                        activityRecency: fields.recency,
                        page: fields.page,
                        queryKey,
                    }),
                ],
            }
        },
    })
}

const replaceFirstPage = (
    model: Model,
    updateFields: (fields: CrmRemoteBrowseFields) => CrmRemoteBrowseFields,
    navigation: NavigationMode
): UpdateReturn => {
    const fields = crmRemoteBrowseFieldsFromRoute(model.route)
    const nextFields = updateFields({ ...fields, page: 0 })
    return { model, commands: [replaceRemoteRoute(nextFields, navigation)] }
}

const searchTextFromRoute = (model: Model): string =>
    Option.getOrElse(model.route.search, () => "")

// Commits typed text to the URL, which is what actually triggers the query.
// Skipped when the route already carries it, so a debounce timer that lands on
// text already committed by an earlier one does not restart the page.
const commitSearchText = (
    model: Model,
    value: string,
    navigation: NavigationMode
): UpdateReturn =>
    searchTextFromRoute(model) === value
        ? { model, commands: [] }
        : replaceFirstPage(
              model,
              (fields) => ({
                  ...fields,
                  search: value === "" ? Option.none() : Option.some(value),
              }),
              navigation
          )

const updateSelectedTags = (
    selectedTagIds: ReadonlyArray<string>,
    tagId: string,
    isSelected: boolean
): ReadonlyArray<string> =>
    isSelected
        ? selectedTagIds.includes(tagId)
            ? selectedTagIds
            : Array.sort([...selectedTagIds, tagId], String.Order)
        : Array.filter(
              selectedTagIds,
              (selectedTagId) => selectedTagId !== tagId
          )

// No query is issued here. demosInit runs for every page of the site, and both
// ways into this demo — a cold load, and a ChangedUrl navigation — sync the URL
// through ChangedRemoteCrmRoute, which requests the page the URL actually asks
// for. Querying here as well would fetch the unfiltered default page too.
export const init = (): UpdateReturn => ({ model: emptyModel(), commands: [] })

export const update = (
    model: Model,
    message: Message,
    navigation: NavigationMode = "Browser"
): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedRemoteCrmRoute: ({ route }) => {
                const nextRoute = CrmRemoteRoute(
                    crmRemoteBrowseFieldsFromRoute(route)
                )

                // Resyncing the draft from the route keeps the text field correct
                // on cold load, back/forward, and any navigation the demo did not
                // originate. While typing it is already equal.
                return requestCurrentRoutePage(
                    modifyFields(model, {
                        route: () => nextRoute,
                        searchDraft: () =>
                            Option.getOrElse(nextRoute.search, () => ""),
                    })
                )
            },
            CompletedRemoteCrmUrlReplacement: () => ({ model, commands: [] }),
            CompletedRemoteCrmUrlPush: () => ({ model, commands: [] }),
            UpdatedRemoteCrmSearchText: ({ value }) => {
                const typed = modifyFields(model, { searchDraft: () => value })

                return model.isSearchDebounced
                    ? {
                          model: typed,
                          commands: [debounceRemoteCrmSearch({ value })],
                      }
                    : commitSearchText(typed, value, navigation)
            },
            // The guard: a timer armed by an earlier keystroke arrives carrying
            // text the Model no longer holds, and is dropped. No counter is needed
            // because the draft is itself the identity of what the Model wants.
            ElapsedRemoteCrmSearchDebounce: ({ value }) =>
                value === model.searchDraft
                    ? commitSearchText(model, value, navigation)
                    : { model, commands: [] },
            ToggledRemoteCrmSearchDebounce: ({ isEnabled }) => {
                const toggled = modifyFields(model, {
                    isSearchDebounced: () => isEnabled,
                })

                // Switching debouncing off commits whatever is already typed, so
                // the results match the box rather than waiting for a keystroke.
                return isEnabled
                    ? { model: toggled, commands: [] }
                    : commitSearchText(toggled, toggled.searchDraft, navigation)
            },
            SelectedRemoteCrmDatasetSize: ({ size }) =>
                replaceFirstPage(
                    model,
                    (fields) => ({ ...fields, size }),
                    navigation
                ),
            ToggledRemoteCrmTagFacet: ({ tagId, isSelected }) =>
                replaceFirstPage(
                    model,
                    (fields) => {
                        const selectedTagIds = updateSelectedTags(
                            selectedTagIdsFromRoute(model.route),
                            tagId,
                            isSelected
                        )
                        return {
                            ...fields,
                            tags:
                                selectedTagIds.length === 0
                                    ? Option.none()
                                    : Option.some(selectedTagIds.join(",")),
                        }
                    },
                    navigation
                ),
            SelectedRemoteCrmActivityRecency: ({ activityRecency }) =>
                replaceFirstPage(
                    model,
                    (fields) => ({
                        ...fields,
                        recency: activityRecency,
                    }),
                    navigation
                ),
            RequestedNextRemoteCrmPage: () =>
                Option.match(AsyncData.getData(currentPageData(model)), {
                    onNone: () => ({ model, commands: [] }),
                    onSome: (page) =>
                        page.hasNextPage
                            ? {
                                  model,
                                  commands: [
                                      pushRemoteRoute(
                                          {
                                              ...crmRemoteBrowseFieldsFromRoute(
                                                  model.route
                                              ),
                                              page: page.page + 1,
                                          },
                                          navigation
                                      ),
                                  ],
                              }
                            : { model, commands: [] },
                }),
            RequestedPreviousRemoteCrmPage: () =>
                Option.match(AsyncData.getData(currentPageData(model)), {
                    onNone: () => ({ model, commands: [] }),
                    onSome: (page) =>
                        page.page > 0
                            ? {
                                  model,
                                  commands: [
                                      pushRemoteRoute(
                                          {
                                              ...crmRemoteBrowseFieldsFromRoute(
                                                  model.route
                                              ),
                                              page: page.page - 1,
                                          },
                                          navigation
                                      ),
                                  ],
                              }
                            : { model, commands: [] },
                }),
            SettledRemoteContactsQuery: ({ queryKey, result }) => ({
                model: modifyFields(model, {
                    pageByQueryKey: HashMap.modify(
                        queryKey,
                        AsyncData.settle(result)
                    ),
                }),
                commands: [],
            }),
        })
    )

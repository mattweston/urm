import { Effect, Match as M, Option, Schema as S } from "effect"
import { Command, Navigation } from "foldkit"
import { modifyFields } from "foldkit/struct"
import type { Model } from "./query-sync-table.model.ts"
import {
    CompletedReplaceUrl,
    type Message,
} from "./query-sync-table.message.ts"
import {
    Ascending,
    Descending,
    QuerySyncTableBrowseRoute,
    querySyncTableBrowseFieldsFromRoute,
    querySyncTableBrowseHref,
    Unsorted,
    type QuerySyncTableBrowseFields,
    type QuerySyncTableRoute,
    type SortColumn,
} from "./query-sync-table.route.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const Diet = S.Literals(["Carnivore", "Herbivore", "Omnivore"])
const Period = S.Literals(["Triassic", "Jurassic", "Cretaceous"])
const decodeDiet = S.decodeUnknownOption(Diet)
const decodePeriod = S.decodeUnknownOption(Period)

export const ReplaceFilters = Command.define("ReplaceFilters", {
    args: { href: S.String },
    messages: [CompletedReplaceUrl],
    execute: ({ href }) =>
        Navigation.replaceUrl(href).pipe(Effect.as(CompletedReplaceUrl())),
})

const replaceFilters = (href: string) => ReplaceFilters({ href })

const nextSorting = (
    sorting: QuerySyncTableBrowseFields["sorting"],
    column: SortColumn
) =>
    M.value(sorting).pipe(
        M.withReturnType<QuerySyncTableBrowseFields["sorting"]>(),
        M.tagsExhaustive({
            Unsorted: () => Ascending({ column }),
            Ascending: ({ column: sortedColumn }) =>
                sortedColumn === column
                    ? Descending({ column })
                    : Ascending({ column }),
            Descending: ({ column: sortedColumn }) =>
                sortedColumn === column ? Unsorted() : Ascending({ column }),
        })
    )

const searchValueFromInput = (value: string) =>
    value === "" ? Option.none() : Option.some(value)

export const init = (route: QuerySyncTableRoute): UpdateReturn => [
    {
        route,
    },
    [],
]

export const update = (
    model: Model,
    message: Message,
    navigation: "Browser" | "Model" = "Browser",
    to_href: (href: string) => string = (href) => href
): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ChangedRoute: ({ route }) => [
                modifyFields(model, {
                    route: () => route,
                }),
                [],
            ],
            CompletedReplaceUrl: () => [model, []],
            ChangedSearchInput: ({ value }) => {
                const fields = querySyncTableBrowseFieldsFromRoute(model.route)
                const nextFields = {
                    ...fields,
                    search: searchValueFromInput(value),
                }

                return [
                    modifyFields(model, {
                        route: () => QuerySyncTableBrowseRoute(nextFields),
                    }),
                    navigation === "Browser"
                        ? [
                              replaceFilters(
                                  to_href(querySyncTableBrowseHref(nextFields))
                              ),
                          ]
                        : [],
                ]
            },
            ClickedColumnHeader: ({ column }) => {
                const fields = querySyncTableBrowseFieldsFromRoute(model.route)
                const nextFields = {
                    ...fields,
                    sorting: nextSorting(fields.sorting, column),
                }

                return [
                    modifyFields(model, {
                        route: () => QuerySyncTableBrowseRoute(nextFields),
                    }),
                    navigation === "Browser"
                        ? [
                              replaceFilters(
                                  to_href(querySyncTableBrowseHref(nextFields))
                              ),
                          ]
                        : [],
                ]
            },
            SelectedDietFilter: ({ value }) => {
                const fields = querySyncTableBrowseFieldsFromRoute(model.route)
                const nextFields = {
                    ...fields,
                    diet: decodeDiet(value),
                }

                return [
                    modifyFields(model, {
                        route: () => QuerySyncTableBrowseRoute(nextFields),
                    }),
                    navigation === "Browser"
                        ? [
                              replaceFilters(
                                  to_href(querySyncTableBrowseHref(nextFields))
                              ),
                          ]
                        : [],
                ]
            },
            SelectedPeriodFilter: ({ value }) => {
                const fields = querySyncTableBrowseFieldsFromRoute(model.route)
                const nextFields = {
                    ...fields,
                    period: decodePeriod(value),
                }

                return [
                    modifyFields(model, {
                        route: () => QuerySyncTableBrowseRoute(nextFields),
                    }),
                    navigation === "Browser"
                        ? [
                              replaceFilters(
                                  to_href(querySyncTableBrowseHref(nextFields))
                              ),
                          ]
                        : [],
                ]
            },
        })
    )

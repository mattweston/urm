import { Array, Effect, Match as M, Option, String, pipe } from "effect"
import { Command, Update } from "foldkit"
import * as Ui from "@foldkit/ui"
import { evo } from "foldkit/struct"

import {
    contactMatchesRecency,
    contactMatchesSelectedTags,
    contactMatchesText,
    type Dataset,
} from "./crm.domain.ts"
import { GenerateDataset } from "./crm.command.ts"
import { GotVirtualListMessage, type Message } from "./crm.message.ts"
import type { ActivityRecency, Model } from "./crm.model.ts"
import { Generating, Ready, emptyModel } from "./crm.model.ts"

type UpdateReturn = Update.Return<Model, Message>

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const RECENCY_DAYS: Readonly<Record<ActivityRecency, number>> = {
    SevenDays: 7,
    ThirtyDays: 30,
    Any: 999,
}

const normalizeSearch = (value: string): string =>
    pipe(value, String.trim, String.toLowerCase)

const filterContactIds = (
    dataset: Dataset,
    searchText: string,
    selectedTagIds: ReadonlyArray<string>,
    activityRecency: ActivityRecency
): ReadonlyArray<string> => {
    const normalizedSearch = normalizeSearch(searchText)
    const maxActivityAgeDays = RECENCY_DAYS[activityRecency]

    return Array.filter(dataset.contactIds, (contactId) =>
        pipe(
            Option.fromNullishOr(dataset.contactsById[contactId]),
            Option.match({
                onNone: () => false,
                onSome: (contact) =>
                    contactMatchesText(contact, normalizedSearch) &&
                    contactMatchesSelectedTags(
                        contactId,
                        selectedTagIds,
                        dataset.tagIdsByContact
                    ) &&
                    contactMatchesRecency(
                        contactId,
                        maxActivityAgeDays,
                        dataset.latestActivityByContact
                    ),
            })
        )
    )
}

const mapVirtualListCommands = (
    commands: ReadonlyArray<Command.Command<Ui.VirtualList.Message>>
): ReadonlyArray<Command.Command<Message>> =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) => GotVirtualListMessage({ message }))
        )
    )

const scrollListToTop = (model: Model): UpdateReturn => {
    const { model: list, commands = [] } = Ui.VirtualList.scrollToIndex(
        model.list,
        0
    )

    return {
        model: evo(model, { list: () => list }),
        commands: mapVirtualListCommands(commands),
    }
}

const applyFilters = (model: Model): UpdateReturn => {
    const filteredContactIds = filterContactIds(
        model.dataset,
        model.searchText,
        model.selectedTagIds,
        model.activityRecency
    )
    const { model: scrolledModel, commands = [] } = scrollListToTop(
        evo(model, { filteredContactIds: () => filteredContactIds })
    )

    return { model: scrolledModel, commands }
}

const updateSelectedTags = (
    selectedTagIds: ReadonlyArray<string>,
    tagId: string,
    isSelected: boolean
): ReadonlyArray<string> => {
    if (isSelected) {
        return selectedTagIds.includes(tagId)
            ? selectedTagIds
            : [...selectedTagIds, tagId]
    }

    return Array.filter(
        selectedTagIds,
        (selectedTagId) => selectedTagId !== tagId
    )
}

export const init = (): UpdateReturn => ({
    model: emptyModel(),
    commands: [GenerateDataset({ size: "TenThousand" })],
})

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            GotVirtualListMessage: ({ message: virtualListMessage }) => {
                const { model: list, commands = [] } = Ui.VirtualList.update(
                    model.list,
                    virtualListMessage
                )

                return {
                    model: evo(model, { list: () => list }),
                    commands: mapVirtualListCommands(commands),
                }
            },
            UpdatedSearchText: ({ value }) =>
                applyFilters(evo(model, { searchText: () => value })),
            SelectedDatasetSize: ({ size }) => ({
                model: evo(model, {
                    loadState: () => Generating({ size }),
                    selectedDatasetSize: () => size,
                    filteredContactIds: () => [],
                    maybeSelectedContactId: () => Option.none(),
                }),
                commands: [GenerateDataset({ size })],
            }),
            ToggledTagFacet: ({ tagId, isSelected }) =>
                applyFilters(
                    evo(model, {
                        selectedTagIds: () =>
                            updateSelectedTags(
                                model.selectedTagIds,
                                tagId,
                                isSelected
                            ),
                    })
                ),
            SelectedActivityRecency: ({ activityRecency }) =>
                applyFilters(
                    evo(model, { activityRecency: () => activityRecency })
                ),
            ClickedClearFilters: () =>
                applyFilters(
                    evo(model, {
                        searchText: () => "",
                        selectedTagIds: () => [],
                        activityRecency: () => "Any",
                    })
                ),
            SelectedContact: ({ contactId }) => ({
                model: evo(model, {
                    maybeSelectedContactId: () => Option.some(contactId),
                }),
                commands: [],
            }),
            CompletedGenerateDataset: ({ size, dataset }) => {
                const nextModel = evo(model, {
                    loadState: () => Ready({ size }),
                    dataset: () => dataset,
                    filteredContactIds: () =>
                        filterContactIds(
                            dataset,
                            model.searchText,
                            model.selectedTagIds,
                            model.activityRecency
                        ),
                    maybeSelectedContactId: () => Option.none(),
                })

                return scrollListToTop(nextModel)
            },
        })
    )

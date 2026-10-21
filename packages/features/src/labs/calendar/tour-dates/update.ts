import { Array, Match as M, Option } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import { LoadTourDates, saveTourDates } from "./command.ts"
import type { Message, TourDateField } from "./message.ts"
import {
    Editing,
    type Model,
    Ready,
    SaveFailed,
    Saving,
    Viewing,
    Loading,
} from "./model.ts"
import type { TourDate } from "./tour-date.ts"
import { tourDateGroups } from "./tour-dates.data.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const initial_groups = tourDateGroups.toSorted(
    (left, right) => left.order - right.order
)

const isSafeHttpUrl = (value: string | null): boolean =>
    value === null || /^https?:\/\/[^\s]+$/i.test(value)

const hasInvalidLinks = (groups: Model["groups"]): boolean =>
    Array.some(groups, (group) =>
        Array.some(
            group.dates,
            (tour_date) =>
                !isSafeHttpUrl(tour_date.ticket_link_url) ||
                !isSafeHttpUrl(tour_date.artist_page_url) ||
                !isSafeHttpUrl(tour_date.map_url)
        )
    )

export const initialModel: Model = {
    filter: "All",
    groups: initial_groups,
    saved_snapshot: initial_groups,
    editor_state: Viewing(),
    persistence_state: Loading(),
}

export const init = (): UpdateReturn => [initialModel, [LoadTourDates()]]

const updatedTourDate = (
    tour_date: TourDate,
    field: typeof TourDateField.Type,
    value: string
): TourDate => {
    const optional_value = value.trim() === "" ? null : value

    switch (field) {
        case "title":
            return evo(tour_date, { title: () => value })
        case "date":
            return evo(tour_date, { date: () => optional_value })
        case "day":
            return evo(tour_date, { day: () => optional_value })
        case "prices":
            return evo(tour_date, { prices: () => optional_value })
        case "start_time":
            return evo(tour_date, { start_time: () => optional_value })
        case "ticket_link_url":
            return evo(tour_date, { ticket_link_url: () => optional_value })
        case "artist_page_url":
            return evo(tour_date, { artist_page_url: () => optional_value })
        case "map_url":
            return evo(tour_date, { map_url: () => optional_value })
        case "address":
            return evo(tour_date, { address: () => optional_value })
        case "email":
            return evo(tour_date, { email: () => optional_value })
        case "phone":
            return evo(tour_date, { phone: () => optional_value })
        case "note":
            return evo(tour_date, { note: () => optional_value })
        case "confirmation":
            return evo(tour_date, { confirmation: () => optional_value })
    }
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedTourDateFilter: ({ filter }) => [
                evo(model, { filter: () => filter }),
                [],
            ],
            ClickedEditTourDates: () =>
                model.persistence_state._tag === "Loading"
                    ? [model, []]
                    : [
                          evo(model, {
                              editor_state: () => Editing(),
                              filter: () => "All",
                          }),
                          [],
                      ],
            ClickedSaveTourDates: () =>
                model.persistence_state._tag === "Saving"
                    ? [model, []]
                    : hasInvalidLinks(model.groups)
                      ? [
                            evo(model, {
                                persistence_state: () =>
                                    SaveFailed({
                                        error: "Links must use http:// or https:// URLs.",
                                    }),
                            }),
                            [],
                        ]
                      : [
                            evo(model, {
                                persistence_state: () => Saving(),
                            }),
                            [saveTourDates(model.groups)],
                        ],
            ClickedCancelTourDates: () => [
                evo(model, {
                    groups: () => model.saved_snapshot,
                    editor_state: () => Viewing(),
                    persistence_state: () => Ready(),
                }),
                [],
            ],
            UpdatedTourDateGroupTitle: ({ group_id, value }) =>
                model.persistence_state._tag === "Saving"
                    ? [model, []]
                    : [
                          evo(model, {
                              groups: Array.map((group) =>
                                  group.id === group_id
                                      ? evo(group, { title: () => value })
                                      : group
                              ),
                          }),
                          [],
                      ],
            UpdatedTourDateField: ({ group_id, tour_date_id, field, value }) =>
                model.persistence_state._tag === "Saving"
                    ? [model, []]
                    : [
                          evo(model, {
                              groups: Array.map((group) =>
                                  group.id === group_id
                                      ? evo(group, {
                                            dates: Array.map((tour_date) =>
                                                tour_date.id === tour_date_id
                                                    ? updatedTourDate(
                                                          tour_date,
                                                          field,
                                                          value
                                                      )
                                                    : tour_date
                                            ),
                                        })
                                      : group
                              ),
                          }),
                          [],
                      ],
            LoadedTourDates: ({ maybe_groups }) =>
                model.editor_state._tag === "Editing" &&
                model.persistence_state._tag === "Loading"
                    ? [evo(model, { persistence_state: () => Ready() }), []]
                    : model.editor_state._tag === "Editing" ||
                        model.persistence_state._tag !== "Loading"
                      ? [model, []]
                      : Option.match(maybe_groups, {
                            onNone: () => [
                                evo(model, {
                                    persistence_state: () => Ready(),
                                }),
                                [],
                            ],
                            onSome: (groups) => [
                                evo(model, {
                                    groups: () => groups,
                                    saved_snapshot: () => groups,
                                    persistence_state: () => Ready(),
                                }),
                                [],
                            ],
                        }),
            CompletedSaveTourDates: () => [
                evo(model, {
                    saved_snapshot: () => model.groups,
                    editor_state: () => Viewing(),
                    persistence_state: () => Ready(),
                }),
                [],
            ],
            FailedSaveTourDates: ({ error }) => [
                evo(model, { persistence_state: () => SaveFailed({ error }) }),
                [],
            ],
        })
    )

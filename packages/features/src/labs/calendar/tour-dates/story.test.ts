import { Option } from "effect"
import { Story } from "foldkit"
import { describe, expect, test } from "vitest"

import { SaveTourDates } from "./command.ts"
import {
    ClickedCancelTourDates,
    ClickedEditTourDates,
    ClickedSaveTourDates,
    CompletedSaveTourDates,
    FailedSaveTourDates,
    LoadedTourDates,
    SelectedTourDateFilter,
    UpdatedTourDateField,
    UpdatedTourDateGroupTitle,
    type TourDateField,
} from "./message.ts"
import type { Model } from "./model.ts"
import { initialModel, update } from "./update.ts"

const readyModel: Model = {
    ...initialModel,
    persistence_state: { _tag: "Ready" },
}

describe("tour dates update", () => {
    test("updates every schema-backed tour-date field", () => {
        const fields: ReadonlyArray<TourDateField> = [
            "title",
            "date",
            "day",
            "prices",
            "start_time",
            "ticket_link_url",
            "artist_page_url",
            "map_url",
            "address",
            "email",
            "phone",
            "note",
            "confirmation",
        ]

        for (const field of fields) {
            const [model] = update(
                initialModel,
                UpdatedTourDateField({
                    group_id: "may-2026",
                    tour_date_id: "hebden-bridge",
                    field,
                    value: "Changed value",
                })
            )
            expect(model.groups[0]?.dates[0]?.[field]).toBe("Changed value")
        }
    })

    test("updates the group title inline", () => {
        const [model] = update(
            initialModel,
            UpdatedTourDateGroupTitle({
                group_id: "may-2026",
                value: "Late May 2026",
            })
        )
        expect(model.groups[0]?.title).toBe("Late May 2026")
    })

    test("selecting confirmed dates updates the in-memory filter", () => {
        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given(readyModel),
            Story.message(SelectedTourDateFilter({ filter: "Confirmed" })),
            Story.Command.expectNone(),
            Story.model((model) => {
                expect(model.filter).toBe("Confirmed")
                expect(model.groups).toBe(initialModel.groups)
            }),
            Story.message(SelectedTourDateFilter({ filter: "All" })),
            Story.model((model) => {
                expect(model.filter).toBe("All")
            })
        )
    })

    test("cancel restores the last saved snapshot", () => {
        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given(readyModel),
            Story.message(ClickedEditTourDates()),
            Story.message(
                UpdatedTourDateField({
                    group_id: "may-2026",
                    tour_date_id: "hebden-bridge",
                    field: "title",
                    value: "Changed venue",
                })
            ),
            Story.message(ClickedCancelTourDates()),
            Story.Command.expectNone(),
            Story.model((model) => {
                expect(model.groups[0]?.dates[0]?.title).toBe(
                    "The Trades Club, Hebden Bridge"
                )
                expect(model.editor_state._tag).toBe("Viewing")
            })
        )
    })

    test("save snapshots the edits and requests browser-local persistence", () => {
        const groups = initialModel.groups.map((group) =>
            group.id === "may-2026"
                ? {
                      ...group,
                      dates: group.dates.map((tour_date) =>
                          tour_date.id === "hebden-bridge"
                              ? { ...tour_date, title: "Changed venue" }
                              : tour_date
                      ),
                  }
                : group
        )

        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given({
                ...initialModel,
                groups,
                editor_state: { _tag: "Editing" },
                persistence_state: { _tag: "Ready" },
            }),
            Story.message(ClickedSaveTourDates()),
            Story.Command.expectExact(SaveTourDates({ groups })),
            Story.Command.resolve(SaveTourDates, CompletedSaveTourDates()),
            Story.model((model) => {
                expect(model.saved_snapshot).toStrictEqual(groups)
                expect(model.editor_state._tag).toBe("Viewing")
            })
        )
    })

    test("a delayed initial load cannot overwrite an active edit", () => {
        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given({
                ...initialModel,
                editor_state: { _tag: "Editing" },
            }),
            Story.message(
                UpdatedTourDateField({
                    group_id: "may-2026",
                    tour_date_id: "hebden-bridge",
                    field: "title",
                    value: "Changed venue",
                })
            ),
            Story.message(
                LoadedTourDates({
                    maybe_groups: Option.some(initialModel.groups),
                })
            ),
            Story.model((model) => {
                expect(model.groups[0]?.dates[0]?.title).toBe("Changed venue")
                expect(model.persistence_state._tag).toBe("Ready")
            })
        )
    })

    test("a failed save keeps the editor open and the saved snapshot unchanged", () => {
        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given({
                ...initialModel,
                editor_state: { _tag: "Editing" },
                persistence_state: { _tag: "Ready" },
            }),
            Story.message(ClickedSaveTourDates()),
            Story.Command.expectExact(
                SaveTourDates({ groups: initialModel.groups })
            ),
            Story.Command.resolve(
                SaveTourDates,
                FailedSaveTourDates({ error: "Storage unavailable" })
            ),
            Story.model((model) => {
                expect(model.editor_state._tag).toBe("Editing")
                expect(model.persistence_state._tag).toBe("SaveFailed")
                expect(model.saved_snapshot).toBe(initialModel.saved_snapshot)
            })
        )
    })

    test("unsafe link drafts cannot be saved", () => {
        Story.story(
            (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            Story.given({
                ...readyModel,
                editor_state: { _tag: "Editing" },
            }),
            Story.message(
                UpdatedTourDateField({
                    group_id: "may-2026",
                    tour_date_id: "hebden-bridge",
                    field: "ticket_link_url",
                    value: "javascript:alert(1)",
                })
            ),
            Story.message(ClickedSaveTourDates()),
            Story.Command.expectNone(),
            Story.model((model) => {
                expect(model.persistence_state._tag).toBe("SaveFailed")
                expect(model.editor_state._tag).toBe("Editing")
            })
        )
    })
})

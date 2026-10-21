import { Scene } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { describe, test } from "vitest"

import { SaveTourDates } from "./command.ts"
import {
    CompletedSaveTourDates,
    FailedSaveTourDates,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"
import { initialModel, update } from "./update.ts"
import { view } from "./view.ts"

const standaloneView = (model: Model, h: HtmlBuilder<Message>): Html =>
    view(model, (message) => message, h)

const readyModel: Model = {
    ...initialModel,
    persistence_state: { _tag: "Ready" },
}

const editedGroups = initialModel.groups.map((group) =>
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

describe("tour dates view", () => {
    test("renders the ported tour listing and optional details", () => {
        Scene.scene(
            {
                update: (
                    model: Parameters<typeof update>[0],
                    message: Parameters<typeof update>[1]
                ) => {
                    const [next_model, commands] = update(model, message)
                    return { model: next_model, commands }
                },
                view: standaloneView,
            },
            Scene.given(readyModel),
            Scene.expect(
                Scene.role("heading", { name: "Tour Dates" })
            ).toExist(),
            Scene.expect(Scene.text("May 2026")).toExist(),
            Scene.expect(
                Scene.text("The Trades Club, Hebden Bridge")
            ).toExist(),
            Scene.expect(Scene.text("Date TBA")).toExist(),
            Scene.expect(Scene.role("link", { name: "Tickets" })).toExist(),
            Scene.expect(
                Scene.role("group", { name: "Filter tour dates" })
            ).toExist()
        )
    })

    test("confirmed-only filtering hides unconfirmed dates", () => {
        Scene.scene(
            {
                update: (
                    model: Parameters<typeof update>[0],
                    message: Parameters<typeof update>[1]
                ) => {
                    const [next_model, commands] = update(model, message)
                    return { model: next_model, commands }
                },
                view: standaloneView,
            },
            Scene.given(readyModel),
            Scene.click(Scene.role("button", { name: "Confirmed only" })),
            Scene.Command.expectNone(),
            Scene.expect(Scene.text("Date TBA")).toBeAbsent(),
            Scene.expect(Scene.text("Cottiers Theatre, Glasgow")).toExist(),
            Scene.click(Scene.role("button", { name: "All dates" })),
            Scene.Command.expectNone(),
            Scene.expect(Scene.text("Date TBA")).toExist()
        )
    })

    test("renders the original empty state when no dates are available", () => {
        Scene.scene(
            {
                update: (
                    model: Parameters<typeof update>[0],
                    message: Parameters<typeof update>[1]
                ) => {
                    const [next_model, commands] = update(model, message)
                    return { model: next_model, commands }
                },
                view: standaloneView,
            },
            Scene.given({ ...initialModel, groups: [] }),
            Scene.expect(Scene.text("No Tour Dates found")).toExist()
        )
    })

    test("edits and saves a field inline", () => {
        Scene.scene(
            {
                update: (
                    model: Parameters<typeof update>[0],
                    message: Parameters<typeof update>[1]
                ) => {
                    const [next_model, commands] = update(model, message)
                    return { model: next_model, commands }
                },
                view: standaloneView,
            },
            Scene.given(readyModel),
            Scene.click(Scene.role("button", { name: "Edit dates" })),
            Scene.expect(Scene.label("Month for May 2026")).toExist(),
            Scene.type(
                Scene.label("Venue / title for hebden-bridge"),
                "Changed venue"
            ),
            Scene.expect(
                Scene.role("button", { name: "Save locally" })
            ).toExist(),
            Scene.click(Scene.role("button", { name: "Save locally" })),
            Scene.Command.expectExact(SaveTourDates({ groups: editedGroups })),
            Scene.Command.resolve(SaveTourDates, CompletedSaveTourDates()),
            Scene.expect(Scene.text("Changed venue")).toExist(),
            Scene.expect(Scene.role("button", { name: "Edit dates" })).toExist()
        )
    })

    test("keeps inline editing available when local save fails", () => {
        Scene.scene(
            {
                update: (
                    model: Parameters<typeof update>[0],
                    message: Parameters<typeof update>[1]
                ) => {
                    const [next_model, commands] = update(model, message)
                    return { model: next_model, commands }
                },
                view: standaloneView,
            },
            Scene.given(readyModel),
            Scene.click(Scene.role("button", { name: "Edit dates" })),
            Scene.click(Scene.role("button", { name: "Save locally" })),
            Scene.Command.expectExact(
                SaveTourDates({ groups: initialModel.groups })
            ),
            Scene.Command.resolve(
                SaveTourDates,
                FailedSaveTourDates({ error: "Storage unavailable" })
            ),
            Scene.expect(Scene.role("alert")).toContainText(
                "Storage unavailable"
            ),
            Scene.expect(
                Scene.role("button", { name: "Save locally" })
            ).toExist()
        )
    })
})

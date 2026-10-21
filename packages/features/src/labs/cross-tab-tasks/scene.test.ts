import { Scene } from "foldkit"
import { describe, test } from "vitest"

import {
    AddItem,
    ClearCompleted,
    CommittedToStore,
    DeleteItem,
    LoadItems,
    ReceivedItems,
    ToggleItem,
    update,
    view,
} from "./main.ts"
import {
    buyMilk,
    doneTask,
    failedModel,
    loadingModel,
    readyModel,
    staleModel,
    walkDog,
} from "./main.fixtures.ts"
import type { Message, Model } from "./main.ts"
import type { Html, HtmlBuilder } from "foldkit/html"

const standaloneView = (model: Model, h: HtmlBuilder<Message>): Html =>
    view(model, (message) => message, h)
describe("view", () => {
    test("loading state shows a status message", () => {
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
            Scene.given(loadingModel),
            Scene.expect(Scene.text("Loading...")).toExist()
        )
    })

    test("renders loaded tasks with active and completed counts", () => {
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
            Scene.given(readyModel([buyMilk, walkDog, doneTask])),
            Scene.expect(Scene.text("Buy milk")).toExist(),
            Scene.expect(Scene.text("Walk the dog")).toExist(),
            Scene.expect(Scene.text("Done task")).toExist(),
            Scene.expect(Scene.role("status")).toContainText(
                "2 active, 1 completed"
            )
        )
    })

    test("empty loaded state shows a placeholder", () => {
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
            Scene.given(readyModel([])),
            Scene.expect(Scene.text("No tasks yet. Add one above!")).toExist()
        )
    })

    test("error state shows the message and a retry button", () => {
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
            Scene.given(failedModel),
            Scene.expect(Scene.text("Could not read the store")).toExist(),
            Scene.expect(Scene.text("IndexedDB is unavailable")).toExist(),
            Scene.expect(Scene.role("button", { name: "Try again" })).toExist()
        )
    })

    test("retry reloads the store and renders the returned tasks", () => {
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
            Scene.given(failedModel),
            Scene.click(Scene.role("button", { name: "Try again" })),
            Scene.Command.expectExact(LoadItems()),
            Scene.Command.resolve(
                LoadItems,
                ReceivedItems({ items: [buyMilk] })
            ),
            Scene.expect(Scene.text("Buy milk")).toExist(),
            Scene.expect(Scene.text("Could not read the store")).toBeAbsent()
        )
    })

    test("stale state keeps cached tasks visible under a banner", () => {
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
            Scene.given(staleModel([buyMilk], "Write blocked")),
            Scene.expect(Scene.text("Buy milk")).toExist(),
            Scene.expect(
                Scene.text("Showing the last known tasks", { exact: false })
            ).toExist()
        )
    })
})

describe("interactions", () => {
    test("submitting the form requests AddItem and clears the input", () => {
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
            Scene.given(readyModel([])),
            Scene.type(Scene.label("New task"), "Write docs"),
            Scene.submit(Scene.role("form")),
            Scene.Command.expectExact(AddItem({ text: "Write docs" })),
            Scene.Command.resolve(AddItem, CommittedToStore()),
            Scene.expect(Scene.label("New task")).toHaveValue("")
        )
    })

    test("clicking a checkbox requests ToggleItem", () => {
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
            Scene.given(readyModel([buyMilk])),
            Scene.click(Scene.label("Buy milk")),
            Scene.Command.expectExact(ToggleItem({ id: "a" })),
            Scene.Command.resolve(ToggleItem, CommittedToStore())
        )
    })

    test("clicking delete requests DeleteItem", () => {
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
            Scene.given(readyModel([buyMilk])),
            Scene.click(Scene.role("button", { name: "Delete Buy milk" })),
            Scene.Command.expectExact(DeleteItem({ id: "a" })),
            Scene.Command.resolve(DeleteItem, CommittedToStore())
        )
    })

    test("clear completed requests ClearCompleted", () => {
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
            Scene.given(readyModel([buyMilk, doneTask])),
            Scene.click(Scene.role("button", { name: "Clear 1 completed" })),
            Scene.Command.expectExact(ClearCompleted()),
            Scene.Command.resolve(ClearCompleted, CommittedToStore())
        )
    })

    test("selecting the Completed filter shows only completed tasks", () => {
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
            Scene.given(readyModel([buyMilk, doneTask])),
            Scene.click(Scene.role("button", { name: "Completed" })),
            Scene.Command.expectNone(),
            Scene.expect(Scene.text("Done task")).toExist(),
            Scene.expect(Scene.text("Buy milk")).toBeAbsent()
        )
    })
})

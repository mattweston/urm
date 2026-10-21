/** # Tabs view */
import { Match as M } from "effect"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { TabValue } from "./model.ts"

const demoTabs: ReadonlyArray<TabValue> = ["Foldkit", "React", "Elm"]

const horizontalButtonClassName =
    "px-4 py-2 text-base font-normal cursor-pointer transition rounded-t-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-accent mb-[-1px] data-[selected]:relative data-[selected]:z-10 data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:border-b-0 [box-shadow:var(--shadow-control)]"

const horizontalPanelClassName =
    "p-6 bg-card text-card-foreground rounded-b-[var(--radius-surface)] rounded-tr-[var(--radius-surface)] border-(length:--surface-border-width) border-border"

const verticalButtonClassName =
    "px-4 py-2 text-base font-normal text-left cursor-pointer transition rounded-l-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-accent mr-[-1px] data-[selected]:relative data-[selected]:z-10 data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:border-r-0 [box-shadow:var(--shadow-control)]"

const verticalPanelClassName =
    "flex-1 p-6 bg-card text-card-foreground rounded-r-[var(--radius-surface)] rounded-bl-[var(--radius-surface)] border-(length:--surface-border-width) border-border"

const Tabs = Ui.Tabs.create<TabValue>()

const foldkitPanel = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    return h.div(
        [],
        [
            h.p(
                [h.Class("text-muted-foreground mb-3")],
                [
                    h.span([h.Class("text-foreground")], ["Model-View-Update"]),
                    " with Effect. A single immutable model holds all state, messages describe what happened, and a pure update function produces the next state.",
                ]
            ),
            h.p(
                [h.Class("text-muted-foreground text-sm")],
                [
                    "Composable Elm Architecture modules, Schema-typed state, and controlled side effects via Effect.",
                ]
            ),
        ]
    )
}

const reactPanel = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    return h.div(
        [],
        [
            h.p(
                [h.Class("text-muted-foreground mb-3")],
                [
                    h.span([h.Class("text-foreground")], ["Component-based"]),
                    " with hooks for state and effects. Each component manages its own local state via useState and useReducer.",
                ]
            ),
            h.p(
                [h.Class("text-muted-foreground text-sm")],
                [
                    "JSX views, hooks-driven state, and implicit side effects via useEffect.",
                ]
            ),
        ]
    )
}

const elmPanel = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    return h.div(
        [],
        [
            h.p(
                [h.Class("text-muted-foreground mb-3")],
                [
                    h.span(
                        [h.Class("text-foreground")],
                        ["The original Elm Architecture"]
                    ),
                    ". Elm pioneered the Model-View-Update architecture with a pure functional language. Foldkit brings these ideas to TypeScript.",
                ]
            ),
            h.p(
                [h.Class("text-muted-foreground text-sm")],
                [
                    "Pure functional language, Cmd/Sub for effects, and compiler-guaranteed correctness.",
                ]
            ),
        ]
    )
}

/**
 * These examples use Foldkit submodels to keep tab focus and selection behavior
 * encapsulated. Horizontal and vertical instances maintain independent state and
 * apply orientation-appropriate keyboard navigation.
 */
export const view = <ParentMessage>(
    horizontalTabs: Ui.Tabs.Model,
    horizontalValue: TabValue,
    verticalTabs: Ui.Tabs.Model,
    verticalValue: TabValue,
    horizontalToMessage: (message: Ui.Tabs.Message) => ParentMessage,
    verticalToMessage: (message: Ui.Tabs.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const renderTabs = (
        currentModel: Ui.Tabs.Model,
        selectedValue: TabValue,
        currentMessage: (message: Ui.Tabs.Message) => ParentMessage,
        isVertical: boolean
    ): Html =>
        h.submodel({
            slotId: currentModel.id,
            model: currentModel,
            view: Tabs.view,
            viewInputs: {
                selectedValue,
                tabs: demoTabs,
                ariaLabel: "Framework comparison tabs",
                orientation: isVertical ? "Vertical" : "Horizontal",
                toView: (render) =>
                    h.div(
                        [h.Class(isVertical ? "flex" : "")],
                        [
                            h.div(
                                [
                                    ...render.tablist,
                                    h.Class(
                                        isVertical ? "flex flex-col" : "flex"
                                    ),
                                ],
                                render.tabs.map((tab) =>
                                    h.button(
                                        [
                                            ...tab.tab,
                                            h.Class(
                                                isVertical
                                                    ? verticalButtonClassName
                                                    : horizontalButtonClassName
                                            ),
                                        ],
                                        [tab.value]
                                    )
                                )
                            ),
                            h.div(
                                [h.Class(isVertical ? "flex-1" : "")],
                                render.tabs.map((tab) =>
                                    tab.isActive
                                        ? h.div(
                                              [
                                                  ...tab.panel,
                                                  h.Class(
                                                      isVertical
                                                          ? verticalPanelClassName
                                                          : horizontalPanelClassName
                                                  ),
                                              ],
                                              [
                                                  M.value(tab.value).pipe(
                                                      M.withReturnType<Html>(),
                                                      M.when("Foldkit", () =>
                                                          foldkitPanel<ParentMessage>(
                                                              h
                                                          )
                                                      ),
                                                      M.when("React", () =>
                                                          reactPanel<ParentMessage>(
                                                              h
                                                          )
                                                      ),
                                                      M.when("Elm", () =>
                                                          elmPanel<ParentMessage>(
                                                              h
                                                          )
                                                      ),
                                                      M.exhaustive
                                                  ),
                                              ]
                                          )
                                        : h.empty
                                )
                            ),
                        ]
                    ),
            },
            toParentMessage: currentMessage,
        })

    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Tabs"]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Horizontal"]
            ),
            renderTabs(
                horizontalTabs,
                horizontalValue,
                (message) => horizontalToMessage(message),
                false
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Vertical"]
            ),
            renderTabs(
                verticalTabs,
                verticalValue,
                (message) => verticalToMessage(message),
                true
            ),
        ]
    )
}

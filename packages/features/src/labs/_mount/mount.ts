import { Effect, Option, Queue, Schema as S, Stream } from "effect"
import { Mount, type Update } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Mount Messages / Model
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Cause", "Lifecycle", "Stream", "Paused"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Cause",
    "Lifecycle",
    "Stream",
    "Paused",
]

export const Model = S.Struct({
    stage: Stage,

    showMeasuredPanel: S.Boolean,
    panelGeneration: S.Number,
    measuredWidth: S.Option(S.Number),
    lastMountedInstance: S.Option(S.String),

    scrollEventCount: S.Number,
    lastScrollTop: S.Number,

    editorMounted: S.Boolean,
    editorInstance: S.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedMountStage: {
        stage: Stage,
    },

    ClickedToggleMeasuredPanel: {},
    ClickedReplaceMeasuredPanel: {},

    MeasuredPanel: {
        instanceId: S.String,
        width: S.Number,
    },

    ObservedPanelScroll: {
        instanceId: S.String,
        scrollTop: S.Number,
    },

    CompletedMountEditorShell: {
        instanceId: S.String,
    },

    ClickedResetMountDemo: {},
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Cause",

    showMeasuredPanel: true,
    panelGeneration: 1,
    measuredWidth: Option.none(),
    lastMountedInstance: Option.none(),

    scrollEventCount: 0,
    lastScrollTop: 0,

    editorMounted: false,
    editorInstance: "editor-shell",
})

// -----------------------------------------------------------------------------
// 1. Mount.define — one Message at acquisition, scope kept open until unmount
// -----------------------------------------------------------------------------

export const MeasurePanel = Mount.define("MeasurePanel", {
    args: {
        instanceId: S.String,
    },

    messages: [Message.MeasuredPanel],

    execute: ({ element, instanceId }) =>
        Effect.gen(function* () {
            // The imperative behavior is caused by THIS element existing.
            // Register setup + cleanup in the Mount scope.
            yield* Effect.acquireRelease(
                Effect.sync(() => {
                    element.setAttribute("data-foldkit-mounted", instanceId)
                    return element
                }),
                (mounted) =>
                    Effect.sync(() => {
                        mounted.removeAttribute("data-foldkit-mounted")
                    })
            )

            const width = element.getBoundingClientRect().width

            return Message.MeasuredPanel({
                instanceId,
                width,
            })
        }),
})

// -----------------------------------------------------------------------------
// 2. Mount.defineStream — continuing events owned by one element
// -----------------------------------------------------------------------------

export const ObservePanelScroll = Mount.defineStream("ObservePanelScroll", {
    args: {
        instanceId: S.String,
    },

    messages: [Message.ObservedPanelScroll],

    execute: ({ element, instanceId }) =>
        Stream.callback<typeof Message.ObservedPanelScroll.Type>((queue) =>
            Effect.gen(function* () {
                const scrollElement = element as HTMLElement

                yield* Effect.acquireRelease(
                    Effect.sync(() => {
                        const handler = () =>
                            Queue.offerUnsafe(
                                queue,
                                Message.ObservedPanelScroll({
                                    instanceId,
                                    scrollTop: scrollElement.scrollTop,
                                })
                            )

                        element.addEventListener("scroll", handler, {
                            passive: true,
                        })

                        return handler
                    }),
                    (handler) =>
                        Effect.sync(() =>
                            element.removeEventListener("scroll", handler)
                        )
                )

                return yield* Effect.never
            })
        ),
})

// -----------------------------------------------------------------------------
// 3. viewStateChanges — imperative UI becomes read-only during historical view
// -----------------------------------------------------------------------------

export const MountEditorShell = Mount.define("MountEditorShell", {
    args: {
        instanceId: S.String,
    },

    messages: [Message.CompletedMountEditorShell],

    execute: ({ element, instanceId, viewStateChanges }) =>
        Effect.gen(function* () {
            const editorElement = yield* Effect.acquireRelease(
                Effect.sync(() => {
                    element.setAttribute("data-editor-mounted", "true")
                    return element
                }),
                (mounted) =>
                    Effect.sync(() => {
                        mounted.removeAttribute("data-editor-mounted")
                        mounted.removeAttribute("data-view-state")
                        mounted.removeAttribute("aria-readonly")
                    })
            )

            // A surviving live Mount is NOT restarted when DevTools
            // pauses a historical view. The integration observes the
            // DOM's view state and makes itself non-interactive.
            yield* viewStateChanges.pipe(
                Stream.runForEach((viewState) =>
                    Effect.sync(() => {
                        editorElement.setAttribute("data-view-state", viewState)
                        editorElement.setAttribute(
                            "aria-readonly",
                            viewState === "Paused" ? "true" : "false"
                        )
                    })
                ),
                Effect.forkScoped
            )

            return Message.CompletedMountEditorShell({
                instanceId,
            })
        }),
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedMountStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        ClickedToggleMeasuredPanel: () => ({
            model: modifyFields(model, {
                showMeasuredPanel: (visible) => !visible,
                measuredWidth: () => Option.none(),
            }),
        }),

        ClickedReplaceMeasuredPanel: () => ({
            model: modifyFields(model, {
                showMeasuredPanel: () => true,
                panelGeneration: (generation) => generation + 1,
                measuredWidth: () => Option.none(),
            }),
        }),

        MeasuredPanel: ({ instanceId, width }) => ({
            model: modifyFields(model, {
                measuredWidth: () => Option.some(width),
                lastMountedInstance: () => Option.some(instanceId),
            }),
        }),

        ObservedPanelScroll: ({ scrollTop }) => ({
            model: modifyFields(model, {
                scrollEventCount: (count) => count + 1,
                lastScrollTop: () => scrollTop,
            }),
        }),

        CompletedMountEditorShell: () => ({
            model: modifyFields(model, {
                editorMounted: () => true,
            }),
        }),

        ClickedResetMountDemo: () => ({
            model: init,
        }),
    })

// -----------------------------------------------------------------------------
// Real view helpers carrying real OnMount attributes
// -----------------------------------------------------------------------------

export const measuredPanelView = (
    model: Model,
    h: HtmlBuilder<Message>
): Html => {
    const instanceId = `measure-panel-${model.panelGeneration}`

    return model.showMeasuredPanel
        ? h.div(
              [
                  // Stable identity decides whether the DOM node is reused.
                  // Change the key to replace the node and reacquire its Mount.
                  h.Key(instanceId),
                  h.Class("min-h-24 rounded-lg border p-4"),
                  h.OnMount(
                      MeasurePanel({
                          instanceId,
                      })
                  ),
              ],
              [`Mounted instance: ${instanceId}`]
          )
        : h.div(
              [h.Class("rounded-lg border border-dashed p-4")],
              ["Element absent → Mount scope closed"]
          )
}

export const scrollPanelView = (h: HtmlBuilder<Message>): Html =>
    h.div(
        [
            h.Class("h-40 overflow-auto rounded-lg border"),
            h.OnMount(
                ObservePanelScroll({
                    instanceId: "scroll-panel",
                })
            ),
        ],
        [
            h.div(
                [h.Class("min-h-[520px] p-4")],
                [
                    "Scroll this panel. Its listener exists only while this DOM element exists.",
                ]
            ),
        ]
    )

export const editorShellView = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [
            h.Class("rounded-lg border p-4"),
            h.OnMount(
                MountEditorShell({
                    instanceId: model.editorInstance,
                })
            ),
        ],
        [
            "Imperative editor shell — inspect data-view-state / aria-readonly during DevTools time travel.",
        ]
    )

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const lifecycleFacts = (
    model: Model
): ReadonlyArray<readonly [string, string]> => [
    [
        "element",
        model.showMeasuredPanel
            ? `measure-panel-${model.panelGeneration}`
            : "absent",
    ],
    ["Mount", model.showMeasuredPanel ? "acquired" : "released"],
    [
        "measured width",
        Option.match(model.measuredWidth, {
            onNone: () => "waiting",
            onSome: (width) => `${Math.round(width)}px`,
        }),
    ],
    ["last result", Option.getOrElse(model.lastMountedInstance, () => "none")],
]

export const causeFacts = (): ReadonlyArray<readonly [string, string]> => [
    ["Command", "a Message caused one-shot work"],
    ["Mount", "a specific DOM element exists and the live Element is required"],
    [
        "Subscription",
        "Model-derived dependencies keep an external Stream active",
    ],
    ["ManagedResource", "Model condition owns a handle that Commands consume"],
    [
        "CustomElement",
        "foreign element already has declarative properties + CustomEvents",
    ],
]

export const streamFacts = (
    model: Model
): ReadonlyArray<readonly [string, string]> => [
    ["definition", "Mount.defineStream"],
    ["listener", "scroll on this element only"],
    ["events seen", String(model.scrollEventCount)],
    ["last scrollTop", `${Math.round(model.lastScrollTop)}px`],
]

export const pausedFacts = (
    model: Model
): ReadonlyArray<readonly [string, string]> => [
    ["Mount acquired", String(model.editorMounted)],
    ["viewStateChanges", "Stream<'Live' | 'Paused'>"],
    ["Paused", "imperative integration should become read-only"],
    ["Live", "restore interaction after current live view is patched"],
]

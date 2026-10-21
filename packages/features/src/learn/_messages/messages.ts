import { Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// The message union being taught
// -----------------------------------------------------------------------------

export const AppEvent = defineMessageUnion({
    ClickedIncrement: {},
    UpdatedSearch: {
        value: S.String,
    },
    SucceededLoadNotes: {
        count: S.Number,
    },
    FailedLoadNotes: {
        error: S.String,
    },
})
export type AppEvent = typeof AppEvent.Type

export const eventLabel = (event: AppEvent): string =>
    AppEvent.match(event, {
        ClickedIncrement: () => "User clicked increment",
        UpdatedSearch: ({ value }) => `Search input changed to "${value}"`,
        SucceededLoadNotes: ({ count }) =>
            `Notes load succeeded with ${count} items`,
        FailedLoadNotes: ({ error }) => `Notes load failed: ${error}`,
    })

export const eventPayload = (event: AppEvent): string =>
    JSON.stringify(event, null, 2)

// -----------------------------------------------------------------------------
// Facts, not instructions
// -----------------------------------------------------------------------------

export const CounterPolicy = S.Literals(["Local", "ServerOwned"])
export type CounterPolicy = typeof CounterPolicy.Type

// The fact stays ClickedIncrement. The current update policy decides what that
// fact means for the Model / Commands.
export const interpretIncrement = (
    policy: CounterPolicy,
    count: number
): Readonly<{
    nextCount: number
    explanation: string
}> =>
    policy === "Local"
        ? {
              nextCount: count + 1,
              explanation:
                  "Current policy: update owns the counter, so the next Model stores count + 1.",
          }
        : {
              nextCount: count,
              explanation:
                  "Alternative policy: the same ClickedIncrement fact could return a Command that asks a server for the canonical next value.",
          }

// -----------------------------------------------------------------------------
// Parent / child message boundary
// -----------------------------------------------------------------------------

export const ComposerMessage = defineMessageUnion({
    UpdatedDraft: {
        value: S.String,
    },
    ClickedSubmit: {},
})
export type ComposerMessage = typeof ComposerMessage.Type

export const ParentMessage = defineMessageUnion({
    ClickedClose: {},
    GotComposerMessage: {
        message: ComposerMessage,
    },
})
export type ParentMessage = typeof ParentMessage.Type

export const childExample = ComposerMessage.UpdatedDraft({
    value: "Hello Foldkit",
})

export const wrappedChildExample = ParentMessage.GotComposerMessage({
    message: childExample,
})

// -----------------------------------------------------------------------------
// Teaching demo Model / Message
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Facts", "Union", "Match", "Boundary"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Facts",
    "Union",
    "Match",
    "Boundary",
]

export const EventKind = S.Literals([
    "Clicked",
    "Updated",
    "Succeeded",
    "Failed",
])
export type EventKind = typeof EventKind.Type

export const Model = S.Struct({
    stage: Stage,

    count: S.Number,
    counterPolicy: CounterPolicy,

    eventKind: EventKind,
    searchValue: S.String,
    loadCount: S.Number,
    loadError: S.String,

    matchHandled: S.Boolean,

    childDraft: S.String,
    childWrapped: S.Boolean,
})
export type Model = typeof Model.Type

// The demo's own UI events are also a real Foldkit Message union.
export const Message = defineMessageUnion({
    SelectedMessagesStage: {
        stage: Stage,
    },

    ClickedDemoIncrement: {},
    SelectedCounterPolicy: {
        policy: CounterPolicy,
    },
    ClickedResetDemoCount: {},

    SelectedEventKind: {
        eventKind: EventKind,
    },
    UpdatedDemoSearch: {
        value: S.String,
    },
    SelectedDemoLoadCount: {
        count: S.Number,
    },
    UpdatedDemoLoadError: {
        error: S.String,
    },

    ClickedHandleExampleMessage: {},
    ClickedResetMessageHandler: {},

    UpdatedChildDraft: {
        value: S.String,
    },
    ClickedWrapChildMessage: {},
    ClickedResetChildMessage: {},
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Facts",

    count: 3,
    counterPolicy: "Local",

    eventKind: "Clicked",
    searchValue: "effect",
    loadCount: 3,
    loadError: "timeout",

    matchHandled: false,

    childDraft: "Hello Foldkit",
    childWrapped: false,
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedMessagesStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        ClickedDemoIncrement: () => {
            const interpretation = interpretIncrement(
                model.counterPolicy,
                model.count
            )

            return {
                model: evo(model, {
                    count: () => interpretation.nextCount,
                }),
            }
        },

        SelectedCounterPolicy: ({ policy }) => ({
            model: evo(model, {
                counterPolicy: () => policy,
            }),
        }),

        ClickedResetDemoCount: () => ({
            model: evo(model, {
                count: () => 3,
            }),
        }),

        SelectedEventKind: ({ eventKind }) => ({
            model: evo(model, {
                eventKind: () => eventKind,
                matchHandled: () => false,
            }),
        }),

        UpdatedDemoSearch: ({ value }) => ({
            model: evo(model, {
                searchValue: () => value,
                matchHandled: () => false,
            }),
        }),

        SelectedDemoLoadCount: ({ count }) => ({
            model: evo(model, {
                loadCount: () => count,
                matchHandled: () => false,
            }),
        }),

        UpdatedDemoLoadError: ({ error }) => ({
            model: evo(model, {
                loadError: () => error,
                matchHandled: () => false,
            }),
        }),

        ClickedHandleExampleMessage: () => ({
            model: evo(model, {
                matchHandled: () => true,
            }),
        }),

        ClickedResetMessageHandler: () => ({
            model: evo(model, {
                matchHandled: () => false,
            }),
        }),

        UpdatedChildDraft: ({ value }) => ({
            model: evo(model, {
                childDraft: () => value,
                childWrapped: () => false,
            }),
        }),

        ClickedWrapChildMessage: () => ({
            model: evo(model, {
                childWrapped: () => true,
            }),
        }),

        ClickedResetChildMessage: () => ({
            model: evo(model, {
                childDraft: () => "Hello Foldkit",
                childWrapped: () => false,
            }),
        }),
    })

export const selectedEvent = (model: Model): AppEvent => {
    switch (model.eventKind) {
        case "Clicked":
            return AppEvent.ClickedIncrement()

        case "Updated":
            return AppEvent.UpdatedSearch({
                value: model.searchValue,
            })

        case "Succeeded":
            return AppEvent.SucceededLoadNotes({
                count: model.loadCount,
            })

        case "Failed":
            return AppEvent.FailedLoadNotes({
                error: model.loadError,
            })
    }
}

export const handlerOutput = (model: Model): string =>
    AppEvent.match(selectedEvent(model), {
        ClickedIncrement: () => "handler → increment branch",
        UpdatedSearch: ({ value }) => `handler → search = "${value}"`,
        SucceededLoadNotes: ({ count }) => `handler → loaded ${count}`,
        FailedLoadNotes: ({ error }) => `handler → error "${error}"`,
    })

export const childMessage = (model: Model): ComposerMessage =>
    ComposerMessage.UpdatedDraft({
        value: model.childDraft,
    })

export const parentWrappedMessage = (model: Model): ParentMessage =>
    ParentMessage.GotComposerMessage({
        message: childMessage(model),
    })

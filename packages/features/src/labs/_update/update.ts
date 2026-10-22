import { Effect, Option, Schema as S } from "effect"
import { Command, Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Child Submodel used by the foldChild example
// -----------------------------------------------------------------------------

export const ChildModel = S.Struct({
    count: S.Number,
})
export type ChildModel = typeof ChildModel.Type

export const ChildMessage = defineMessageUnion({
    ClickedIncrement: {},
    ClickedReset: {},
})
export type ChildMessage = typeof ChildMessage.Type

export const childUpdate = (model: ChildModel, message: ChildMessage) =>
    ChildMessage.match<Update.Return<ChildModel, ChildMessage>>(message, {
        ClickedIncrement: () => ({
            model: modifyFields(model, {
                count: (count) => count + 1,
            }),
        }),

        ClickedReset: () => ({
            model: modifyFields(model, {
                count: () => 0,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Parent teaching app
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Transition", "Commands", "Combine", "Child"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Transition",
    "Commands",
    "Combine",
    "Child",
]

export const Model = S.Struct({
    stage: Stage,

    count: S.Number,
    persistedCount: S.Number,
    isPersisting: S.Boolean,

    dialogOpen: S.Boolean,
    status: S.String,
    combineLog: S.Array(S.String),
    auditCompleted: S.Boolean,

    child: ChildModel,

    showOutMessageExample: S.Boolean,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedUpdateStage: {
        stage: Stage,
    },

    ClickedPureIncrement: {},
    ClickedPureReset: {},

    ClickedPersistIncrement: {},
    CompletedPersistCount: {
        count: S.Number,
    },

    ClickedRunCombinedUpdate: {},
    CompletedAudit: {
        label: S.String,
    },

    GotChildMessage: {
        message: ChildMessage,
    },

    ClickedShowOutMessageExample: {},
    ClickedResetUpdateDemo: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
    ClosedDemo: {
        reason: S.String,
    },
})
export type OutMessage = typeof OutMessage.Type

export const init: Model = Model.make({
    stage: "Transition",

    count: 3,
    persistedCount: 3,
    isPersisting: false,

    dialogOpen: false,
    status: "Dirty",
    combineLog: [],
    auditCompleted: false,

    child: ChildModel.make({
        count: 0,
    }),

    showOutMessageExample: false,
})

// -----------------------------------------------------------------------------
// Commands
// -----------------------------------------------------------------------------

export const PersistCount = Command.define("PersistCount", {
    args: {
        count: S.Number,
    },
    messages: [Message.CompletedPersistCount],
    execute: ({ count }) =>
        Effect.gen(function* () {
            // A tiny delay makes "Model changed; Command is running" visible.
            yield* Effect.sleep("600 millis")

            return Message.CompletedPersistCount({
                count,
            })
        }),
})

export const AuditUpdate = Command.define("AuditUpdate", {
    args: {
        label: S.String,
    },
    messages: [Message.CompletedAudit],
    execute: ({ label }) =>
        Effect.succeed(
            Message.CompletedAudit({
                label,
            })
        ),
})

// -----------------------------------------------------------------------------
// Update Steps composed by Update.combine
// -----------------------------------------------------------------------------

export const openDialog: Update.Step<Model, Message> = (model) => ({
    model: modifyFields(model, {
        dialogOpen: () => true,
        combineLog: (log) => [...log, "1. openDialog → dialogOpen = true"],
    }),
})

export const clearStatus: Update.Step<Model, Message> = (model) => ({
    model: modifyFields(model, {
        status: () => "Clean",
        combineLog: (log) => [...log, "2. clearStatus → status = Clean"],
    }),
})

export const queueAudit: Update.Step<Model, Message> = (model) => ({
    model: modifyFields(model, {
        combineLog: (log) => [
            ...log,
            "3. queueAudit → return AuditUpdate Command",
        ],
        auditCompleted: () => false,
    }),
    commands: [
        AuditUpdate({
            label: "combined-update",
        }),
    ],
})

// -----------------------------------------------------------------------------
// foldChild
// -----------------------------------------------------------------------------

export const foldChildCounter = Update.foldChild({
    update: childUpdate,

    read: (model: Model) => Option.some(model.child),

    write: (model, nextChild) =>
        modifyFields(model, {
            child: () => nextChild,
        }),

    toParentMessage: (message) =>
        Message.GotChildMessage({
            message,
        }),
})

// -----------------------------------------------------------------------------
// withOutMessage example
// -----------------------------------------------------------------------------

export const closeAndReport = (
    model: Model,
    reason: string
): Update.ReturnWithOutMessage<Model, Message, OutMessage> => {
    const dialogClose: Update.Return<Model, Message> = {
        model: modifyFields(model, {
            dialogOpen: () => false,
        }),
    }

    return Update.withOutMessage(
        dialogClose,
        OutMessage.ClosedDemo({
            reason,
        })
    )
}

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedUpdateStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        // Pure transition: no side effect, no Command.
        ClickedPureIncrement: () => ({
            model: modifyFields(model, {
                count: (count) => count + 1,
            }),
        }),

        ClickedPureReset: () => ({
            model: modifyFields(model, {
                count: () => 3,
            }),
        }),

        // Change Model now; ask the Runtime to persist afterward.
        ClickedPersistIncrement: () => {
            const nextCount = model.count + 1

            return {
                model: modifyFields(model, {
                    count: () => nextCount,
                    isPersisting: () => true,
                }),
                commands: [
                    PersistCount({
                        count: nextCount,
                    }),
                ],
            }
        },

        // Command result comes back as another Message.
        CompletedPersistCount: ({ count }) => ({
            model: modifyFields(model, {
                persistedCount: () => count,
                isPersisting: () => false,
            }),
        }),

        // Each Step sees the Model produced by the previous Step.
        // Their Commands are accumulated into one update return.
        ClickedRunCombinedUpdate: () =>
            Update.combine(model, [openDialog, clearStatus, queueAudit]),

        CompletedAudit: ({ label }) => ({
            model: modifyFields(model, {
                auditCompleted: () => true,
                combineLog: (log) => [
                    ...log,
                    `runtime → CompletedAudit(${label})`,
                ],
            }),
        }),

        // Delegate child transition and lift its Commands / Messages.
        GotChildMessage: ({ message }) => foldChildCounter(model, message),

        // The root lesson does not emit an OutMessage itself; this button
        // reveals the separate closeAndReport helper in the visual panel.
        ClickedShowOutMessageExample: () => ({
            model: modifyFields(model, {
                showOutMessageExample: () => true,
            }),
        }),

        ClickedResetUpdateDemo: () => ({
            model: init,
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const transitionPreview = (
    model: Model
): Readonly<{
    before: number
    after: number
}> => ({
    before: model.count,
    after: model.count + 1,
})

export const commandPreview = (
    model: Model
): Readonly<{
    modelCount: number
    persistedCount: number
    state: string
}> => ({
    modelCount: model.count,
    persistedCount: model.persistedCount,
    state: model.isPersisting
        ? "Command running"
        : model.count === model.persistedCount
          ? "Model and persistence agree"
          : "Persistence has not caught up",
})

export const outMessagePreview = (model: Model) =>
    closeAndReport(model, "user closed demo").outMessage

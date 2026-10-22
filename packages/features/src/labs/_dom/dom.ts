import { Effect, Option, Schema as S } from "effect"
import { Command, type Update } from "foldkit"
import * as Dom from "foldkit/dom"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Demo constants
// -----------------------------------------------------------------------------

export const focusInputSelector = "#dom-demo-focus-input"

export const clickButtonSelector = "#dom-demo-click-target"

export const scrollTargetSelector = "#dom-demo-scroll-target"

export const dialogSelector = "#dom-demo-dialog"

export const animatedBoxSelector = "#dom-demo-animated-box"

// -----------------------------------------------------------------------------
// Model / Messages
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Focus", "Scroll", "Dialog", "Timing"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Focus",
    "Scroll",
    "Dialog",
    "Timing",
]

export const ScrollMode = S.Literals(["Commit", "Paint", "IfNeeded"])
export type ScrollMode = typeof ScrollMode.Type

export const Model = S.Struct({
    stage: Stage,

    focusTargetVisible: S.Boolean,
    focusStatus: S.String,
    programmaticClicks: S.Number,

    scrollMode: ScrollMode,
    scrollStatus: S.String,

    dialogVisible: S.Boolean,
    dialogStatus: S.String,
    pageScrollLocked: S.Boolean,

    timingStatus: S.String,
    failureLog: S.Array(S.String),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedDomStage: {
        stage: Stage,
    },

    ClickedToggleFocusTarget: {},
    ClickedFocusInput: {},
    ClickedFocusMissing: {},
    ClickedAdvanceFocus: {},
    ClickedProgrammaticClick: {},
    ClickedByDom: {},
    CompletedDomOperation: {
        operation: S.String,
        detail: S.String,
    },
    FailedDomOperation: {
        operation: S.String,
        selector: S.String,
        reason: S.String,
    },

    SelectedScrollMode: {
        mode: ScrollMode,
    },
    ClickedScrollTarget: {},

    ClickedOpenDialog: {},
    ClickedCloseDialog: {},
    ClickedLockScroll: {},
    ClickedUnlockScroll: {},

    ClickedWaitForAnimation: {},
    ClickedDetectMovement: {},

    ClickedResetDomDemo: {},
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Focus",

    focusTargetVisible: true,
    focusStatus: "ready",
    programmaticClicks: 0,

    scrollMode: "Commit",
    scrollStatus: "ready",

    dialogVisible: false,
    dialogStatus: "closed",
    pageScrollLocked: false,

    timingStatus: "ready",
    failureLog: [],
})

// -----------------------------------------------------------------------------
// Shared helpers for mapping Dom failures into declared Messages
// -----------------------------------------------------------------------------

const elementNotFoundMessage = (
    operation: string,
    selector: string,
    error: Dom.ElementNotFound
): Message =>
    Message.FailedDomOperation({
        operation,
        selector,
        reason: String(error),
    })

const complete = (operation: string, detail: string): Message =>
    Message.CompletedDomOperation({
        operation,
        detail,
    })

// -----------------------------------------------------------------------------
// Real Commands using foldkit/dom
// -----------------------------------------------------------------------------

export const FocusInput = Command.define("FocusInput", {
    messages: [Message.CompletedDomOperation, Message.FailedDomOperation],

    execute: Dom.focus(focusInputSelector).pipe(
        Effect.match({
            onFailure: (error) =>
                elementNotFoundMessage("focus", focusInputSelector, error),

            onSuccess: () => complete("focus", "input focused after commit"),
        })
    ),
})

export const FocusMissing = Command.define("FocusMissing", {
    messages: [Message.CompletedDomOperation, Message.FailedDomOperation],

    execute: Dom.focus("#dom-demo-does-not-exist").pipe(
        Effect.match({
            onFailure: (error) =>
                elementNotFoundMessage(
                    "focus missing",
                    "#dom-demo-does-not-exist",
                    error
                ),

            onSuccess: () => complete("focus missing", "unexpected success"),
        })
    ),
})

export const AdvanceFocus = Command.define("AdvanceFocus", {
    messages: [Message.CompletedDomOperation, Message.FailedDomOperation],

    execute: Dom.advanceFocus(focusInputSelector, "Next").pipe(
        Effect.match({
            onFailure: (error) =>
                elementNotFoundMessage(
                    "advance focus",
                    focusInputSelector,
                    error
                ),

            onSuccess: () =>
                complete("advance focus", "moved to next focusable element"),
        })
    ),
})

export const ProgrammaticClick = Command.define("ProgrammaticClick", {
    messages: [Message.CompletedDomOperation, Message.FailedDomOperation],

    execute: Dom.clickElement(clickButtonSelector).pipe(
        Effect.match({
            onFailure: (error) =>
                elementNotFoundMessage(
                    "clickElement",
                    clickButtonSelector,
                    error
                ),

            onSuccess: () =>
                complete("clickElement", "browser click dispatched"),
        })
    ),
})

export const ScrollTarget = Command.define("ScrollTarget", {
    args: {
        mode: ScrollMode,
    },

    messages: [Message.CompletedDomOperation, Message.FailedDomOperation],

    execute: ({ mode }) => {
        const effect =
            mode === "Commit"
                ? Dom.scrollIntoView(scrollTargetSelector, {
                      block: "nearest",
                  })
                : mode === "Paint"
                  ? Dom.scrollIntoViewAfterPaint(scrollTargetSelector, {
                        block: "center",
                    })
                  : Dom.scrollIntoViewIfNotVisible(scrollTargetSelector, {
                        block: "center",
                    })

        return effect.pipe(
            Effect.match({
                onFailure: (error) =>
                    elementNotFoundMessage(
                        `scroll ${mode}`,
                        scrollTargetSelector,
                        error
                    ),

                onSuccess: () =>
                    complete(
                        `scroll ${mode}`,
                        mode === "Commit"
                            ? "resolved after Foldkit commit"
                            : "Paint timing completed"
                    ),
            })
        )
    },
})

export const ShowDemoDialog = Command.define("ShowDemoDialog", {
    messages: [Message.CompletedDomOperation, Message.FailedDomOperation],

    execute: Dom.showDialog(dialogSelector, {
        focusSelector: "#dom-demo-dialog-input",
        isModal: true,
    }).pipe(
        Effect.match({
            onFailure: (error) =>
                elementNotFoundMessage("showDialog", dialogSelector, error),

            onSuccess: (installed) =>
                complete(
                    "showDialog",
                    installed
                        ? "dialog resources installed"
                        : "dialog already held resources"
                ),
        })
    ),
})

export const CloseDemoDialog = Command.define("CloseDemoDialog", {
    messages: [Message.CompletedDomOperation, Message.FailedDomOperation],

    execute: Dom.closeDialog(dialogSelector).pipe(
        Effect.match({
            onFailure: (error) =>
                elementNotFoundMessage("closeDialog", dialogSelector, error),

            onSuccess: (released) =>
                complete(
                    "closeDialog",
                    released
                        ? "dialog closed + resources released"
                        : "dialog closed; no resources held"
                ),
        })
    ),
})

export const LockPageScroll = Command.define("LockPageScroll", {
    messages: [Message.CompletedDomOperation],

    execute: Dom.lockScroll.pipe(
        Effect.as(complete("lockScroll", "page scroll locked"))
    ),
})

export const UnlockPageScroll = Command.define("UnlockPageScroll", {
    messages: [Message.CompletedDomOperation],

    execute: Dom.unlockScroll.pipe(
        Effect.as(complete("unlockScroll", "one scroll lock released"))
    ),
})

export const WaitForBoxAnimation = Command.define("WaitForBoxAnimation", {
    messages: [Message.CompletedDomOperation],

    execute: Dom.waitForAnimationSettled(animatedBoxSelector).pipe(
        Effect.as(
            complete("waitForAnimationSettled", "active Web Animations settled")
        )
    ),
})

export const DetectBoxMovement = Command.define("DetectBoxMovement", {
    messages: [Message.CompletedDomOperation],

    execute: Dom.detectElementMovement(animatedBoxSelector).pipe(
        Effect.as(
            complete(
                "detectElementMovement",
                "element moved (or target disappeared)"
            )
        )
    ),
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedDomStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        ClickedToggleFocusTarget: () => ({
            model: modifyFields(model, {
                focusTargetVisible: (visible) => !visible,
                focusStatus: () => "target visibility changed",
            }),
        }),

        ClickedFocusInput: () => ({
            model: modifyFields(model, {
                focusStatus: () => "focus Command returned",
            }),
            commands: [FocusInput()],
        }),

        ClickedFocusMissing: () => ({
            model,
            commands: [FocusMissing()],
        }),

        ClickedAdvanceFocus: () => ({
            model,
            commands: [AdvanceFocus()],
        }),

        ClickedProgrammaticClick: () => ({
            model,
            commands: [ProgrammaticClick()],
        }),

        ClickedByDom: () => ({
            model: modifyFields(model, {
                programmaticClicks: (count) => count + 1,
            }),
        }),

        CompletedDomOperation: ({ operation, detail }) => ({
            model: modifyFields(model, {
                focusStatus: (status) =>
                    operation.includes("focus") ? detail : status,

                scrollStatus: (status) =>
                    operation.startsWith("scroll") ? detail : status,

                dialogStatus: (status) =>
                    operation === "showDialog" || operation === "closeDialog"
                        ? detail
                        : status,

                pageScrollLocked: (locked) =>
                    operation === "lockScroll"
                        ? true
                        : operation === "unlockScroll"
                          ? false
                          : locked,

                timingStatus: (status) =>
                    operation === "waitForAnimationSettled" ||
                    operation === "detectElementMovement"
                        ? detail
                        : status,

                dialogVisible: (visible) =>
                    operation === "closeDialog" ? false : visible,
            }),
        }),

        FailedDomOperation: ({ operation, selector, reason }) => ({
            model: modifyFields(model, {
                failureLog: (log) => [
                    ...log,
                    `${operation}: ${selector} → ${reason}`,
                ],
                focusStatus: (status) =>
                    operation.startsWith("focus") ? "ElementNotFound" : status,
                scrollStatus: (status) =>
                    operation.startsWith("scroll") ? "ElementNotFound" : status,
                dialogStatus: (status) =>
                    operation.includes("Dialog") ? "ElementNotFound" : status,
            }),
        }),

        SelectedScrollMode: ({ mode }) => ({
            model: modifyFields(model, {
                scrollMode: () => mode,
            }),
        }),

        ClickedScrollTarget: () => ({
            model: modifyFields(model, {
                scrollStatus: () => `${model.scrollMode} Command returned`,
            }),
            commands: [
                ScrollTarget({
                    mode: model.scrollMode,
                }),
            ],
        }),

        ClickedOpenDialog: () => ({
            // Put the dialog into the next view first.
            model: modifyFields(model, {
                dialogVisible: () => true,
                dialogStatus: () => "showDialog Command returned",
            }),

            // Dom.showDialog waits for that render commit before
            // resolving the selector.
            commands: [ShowDemoDialog()],
        }),

        ClickedCloseDialog: () => ({
            model,
            commands: [CloseDemoDialog()],
        }),

        ClickedLockScroll: () => ({
            model,
            commands: [LockPageScroll()],
        }),

        ClickedUnlockScroll: () => ({
            model,
            commands: [UnlockPageScroll()],
        }),

        ClickedWaitForAnimation: () => ({
            model: modifyFields(model, {
                timingStatus: () => "waiting for animation frame + animations",
            }),
            commands: [WaitForBoxAnimation()],
        }),

        ClickedDetectMovement: () => ({
            model: modifyFields(model, {
                timingStatus: () => "watching position",
            }),
            commands: [DetectBoxMovement()],
        }),

        ClickedResetDomDemo: () => ({
            model: init,
        }),
    })

// -----------------------------------------------------------------------------
// Pure teaching data
// -----------------------------------------------------------------------------

export const timingFacts = (): ReadonlyArray<readonly [string, string]> => [
    [
        "focus / showDialog / click / scroll",
        "wait for Render.afterCommit internally",
    ],
    ["scrollIntoViewAfterPaint", "waits for Render.afterPaint"],
    ["scrollIntoViewIfNotVisible", "Paint by default; optional Commit"],
    ["lock/unlock/restore cleanup", "run immediately"],
    [
        "waitForAnimationSettled",
        "next animation frame + Web Animations .finished",
    ],
]

export const failureSummary = (model: Model): string =>
    model.failureLog.length === 0
        ? "No selector failures yet."
        : (model.failureLog[model.failureLog.length - 1] ?? "No failure")

export const scrollModeDetail = (mode: ScrollMode): string =>
    mode === "Commit"
        ? "Existing / newly committed target. Resolves selector after Foldkit commit."
        : mode === "Paint"
          ? "Wait until browser paint/layout before scrolling."
          : "Skip scrolling when the target is already fully visible."

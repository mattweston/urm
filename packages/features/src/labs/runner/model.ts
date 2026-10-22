import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { ExampleKey } from "./catalog.ts"
import { ResultValue } from "./result.ts"
import { SoundPreference } from "./audio.ts"
import { ExampleRoute } from "./route.ts"
import { CodeLine } from "./shiki.ts"
import { ExampleOptions } from "./catalog/options.ts"
import type { ScopePhase } from "./catalog/timeline.ts"

export const Idle = taggedStruct("Idle")
export const Running = taggedStruct("Running", {
    run_id: S.Number,
    started_at_millis: S.Number,
    elapsed_millis: S.Number,
})
export const Succeeded = taggedStruct("Succeeded", {
    duration_millis: S.Number,
    result: ResultValue,
})
export const Failed = taggedStruct("Failed", {
    duration_millis: S.Number,
    error: S.String,
})
export const Died = taggedStruct("Died", {
    duration_millis: S.Number,
    defect: S.String,
})
export const Interrupted = taggedStruct("Interrupted", {
    duration_millis: S.Number,
})

export const ExampleState = S.Union([
    Idle,
    Running,
    Succeeded,
    Failed,
    Died,
    Interrupted,
])
export type ExampleState = typeof ExampleState.Type

// The Command's verdict on one run, before it is folded into ExampleState.
// PORT NOTE: the source reused the tag names `Succeeded`/`Failed`/`Died` for
// both unions with different fields. Distinct tags here, so neither union can
// ever decode the other's members.
export const RunSucceeded = taggedStruct("RunSucceeded", { value: ResultValue })
export const RunFailed = taggedStruct("RunFailed", { error: S.String })
export const RunDied = taggedStruct("RunDied", { defect: S.String })

export const RunOutcome = S.Union([RunSucceeded, RunFailed, RunDied])
export type RunOutcome = typeof RunOutcome.Type

// The highlight overlay's spring. The original animates the box with real
// spring physics, not an ease — it was caught mid-run at scale 1.00458, past
// its target, which only a spring does. Position and velocity live in the Model
// and are integrated by the same 16ms tick that drives the elapsed counter.
export const Spring = S.Struct({
    position: S.Number,
    velocity: S.Number,
})
export type Spring = typeof Spring.Type

export const spring_at_rest = Spring.make({ position: 0, velocity: 0 })

// Measured from the DOM, as the original does — it unions the rects of the
// token spans covering the range, subtracts the container origin and pads by
// (-8, -6, +16, +12). Arithmetic in `ch` was my invention and it silently
// required that lines never wrap.
export const HighlightRect = S.Struct({
    x: S.Number,
    y: S.Number,
    width: S.Number,
    height: S.Number,
})
export type HighlightRect = typeof HighlightRect.Type

// One measured box per snippet target — the result, plus one per step. All of
// them are measured together and the view picks whichever is active, because a
// Mount captures its args at mount time and cannot be re-pointed at a
// different range later.
export const TargetRect = S.Struct({
    target: S.String,
    rect: HighlightRect,
})
export type TargetRect = typeof TargetRect.Type

// The bubble above the node. `text` is what gets drawn — for the `death`
// variant the original replaces the message with random glitch characters, so
// that substitution happens once when the notification is raised rather than in
// the view, which must stay pure.
export const NotificationVariant = S.Literals(["info", "failure", "death"])
export type NotificationVariant = typeof NotificationVariant.Type

export const Notification = S.Struct({
    id: S.String,
    text: S.String,
    label: S.String,
    variant: NotificationVariant,
    duration_millis: S.Number,
    show_on_hover: S.Boolean,
})
export type Notification = typeof Notification.Type

export const ConcurrencyStep = S.Struct({
    index: S.Number,
    label: S.String,
    state: ExampleState,
})
export type ConcurrencyStep = typeof ConcurrencyStep.Type

// The scope panel. `Idle` means the example has no scope on screen at all, so
// the Model carries one of these unconditionally rather than an Option.
export const ScopeState = S.Literals([
    "Idle",
    "Acquiring",
    "Active",
    "Releasing",
    "Released",
])
export type ScopeState = typeof ScopeState.Type

export const scope_state_of = (phase: ScopePhase): ScopeState => phase

export const FinalizerState = S.Literals(["Pending", "Running", "Completed"])
export type FinalizerState = typeof FinalizerState.Type

export const Finalizer = S.Struct({
    id: S.String,
    name: S.String,
    state: FinalizerState,
})
export type Finalizer = typeof Finalizer.Type

// The ref panel. `just_changed` drives the flash, and is cleared by its own
// delayed command the way a notification dismisses itself.
export const RefValue = S.Struct({
    name: S.String,
    value: S.String,
    just_changed: S.Boolean,
})
export type RefValue = typeof RefValue.Type

export const Model = S.Struct({
    route: ExampleRoute,
    state: ExampleState,
    next_run_id: S.Number,
    selected_example_key: ExampleKey,
    options: ExampleOptions,
    concurrency_steps: S.Array(ConcurrencyStep),
    scope_state: ScopeState,
    finalizers: S.Array(Finalizer),
    ref_value: S.Option(RefValue),
    sound_preference: SoundPreference,
    // `System` defers to this, which a subscription keeps in step with the
    // media query.
    prefers_reduced_motion: S.Boolean,
    highlight: Spring,
    highlight_rects: S.Array(TargetRect),
    // Which step's code the highlight is pointing at, if the pointer is over a
    // step node. `hover_token` lets a pending hide be cancelled by a new hover.
    hovered_step: S.Option(S.Number),
    hover_token: S.Number,
    // Kept after auto-dismissal: `show_on_hover` brings the same notification
    // back while the node is hovered.
    notification: S.Option(Notification),
    is_notification_visible: S.Boolean,
    is_node_hovered: S.Boolean,
    // The heading button has its own hover: it swaps the sparkle for the
    // action it would take, which is how the gesture is discoverable.
    is_control_hovered: S.Boolean,
    code: S.Array(CodeLine),
})
export type Model = typeof Model.Type

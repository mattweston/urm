import type { ResultValue } from "../result.ts"

// A run's visible progress, described as data.
//
// The source drives the node timeline from the example's own `build` — each
// step is an Effect and the UI observes it. This port reimplements the programs
// inside `RunExample`, so the nodes have to be lit on a schedule that matches.
// Expressing that schedule as events rather than Commands keeps the dependency
// one-directional: `update.ts` imports the catalog, so a catalog file must not
// reach back for `StartConcurrencyStep` and friends. `update.ts` is the only
// place that maps an event onto the Command carrying it.

// Steps settle just before the run's own Effect resolves, so the node is
// already in its final state when the result appears. `All` is deliberately
// exempt — its steps land exactly on the boundary.
export const STEP_SETTLE_LEAD_MILLIS = 10

export const NOTIFICATION_DURATION_MILLIS = 2_000

export type ScopePhase =
    | "Idle"
    | "Acquiring"
    | "Active"
    | "Releasing"
    | "Released"

// A run's *steps* are the nodes; a run's scope and its ref are drawn beside
// them, so their events carry no step index.
export type StepEvent =
    | Readonly<{ kind: "start"; index: number; at_millis: number }>
    | Readonly<{
          kind: "complete"
          index: number
          at_millis: number
          value: ResultValue
      }>
    | Readonly<{
          kind: "fail"
          index: number
          at_millis: number
          error: string
      }>
    | Readonly<{ kind: "interrupt"; index: number; at_millis: number }>
    | Readonly<{
          kind: "notify"
          at_millis: number
          message: string
          variant: "info" | "failure" | "death"
          duration_millis: number
          show_on_hover: boolean
      }>
    | Readonly<{ kind: "ref"; at_millis: number; value: string }>
    | Readonly<{ kind: "scope"; at_millis: number; phase: ScopePhase }>
    | Readonly<{
          kind: "finalizer_added"
          at_millis: number
          id: string
          name: string
      }>
    | Readonly<{ kind: "finalizer_running"; at_millis: number; id: string }>
    | Readonly<{ kind: "finalizer_completed"; at_millis: number; id: string }>

// Only the four step events address a node by index; the rest are about the
// run as a whole. Narrowing here keeps every consumer from re-deriving it.
export type IndexedStepEvent = Extract<StepEvent, { index: number }>

export const is_indexed_step = (event: StepEvent): event is IndexedStepEvent =>
    event.kind === "start" ||
    event.kind === "complete" ||
    event.kind === "fail" ||
    event.kind === "interrupt"

export const started = (index: number, at_millis: number): StepEvent => ({
    kind: "start",
    index,
    at_millis,
})

export const completed = (
    index: number,
    at_millis: number,
    value: ResultValue
): StepEvent => ({ kind: "complete", index, at_millis, value })

export const failed = (
    index: number,
    at_millis: number,
    error: string
): StepEvent => ({ kind: "fail", index, at_millis, error })

export const interrupted = (index: number, at_millis: number): StepEvent => ({
    kind: "interrupt",
    index,
    at_millis,
})

export const notified = (
    at_millis: number,
    message: string,
    options?: {
        readonly variant?: "info" | "failure" | "death"
        readonly duration_millis?: number
        readonly show_on_hover?: boolean
    }
): StepEvent => ({
    kind: "notify",
    at_millis,
    message,
    variant: options?.variant ?? "failure",
    duration_millis: options?.duration_millis ?? NOTIFICATION_DURATION_MILLIS,
    show_on_hover: options?.show_on_hover ?? true,
})

export const ref_set = (at_millis: number, value: string): StepEvent => ({
    kind: "ref",
    at_millis,
    value,
})

export const scope_phase = (
    at_millis: number,
    phase: ScopePhase
): StepEvent => ({ kind: "scope", at_millis, phase })

export const finalizer_added = (
    at_millis: number,
    id: string,
    name: string
): StepEvent => ({ kind: "finalizer_added", at_millis, id, name })

export const finalizer_running = (
    at_millis: number,
    id: string
): StepEvent => ({ kind: "finalizer_running", at_millis, id })

export const finalizer_completed = (
    at_millis: number,
    id: string
): StepEvent => ({ kind: "finalizer_completed", at_millis, id })

// Finalizers run LIFO, one at a time, and each takes this long on screen —
// upstream's `runFinalizers` awaits 800ms per card.
export const FINALIZER_RUN_MILLIS = 800

// Walks a scope's registered finalizers in reverse, emitting the running and
// completed events for each. Returns the events and the time it ends, so the
// caller can place whatever follows the release.
export const release_scope = (
    from_millis: number,
    finalizer_ids: ReadonlyArray<string>
): { readonly events: ReadonlyArray<StepEvent>; readonly ends_at: number } => {
    const events: Array<StepEvent> = [scope_phase(from_millis, "Releasing")]
    let at = from_millis

    for (const id of finalizer_ids.toReversed()) {
        events.push(finalizer_running(at, id))
        at += FINALIZER_RUN_MILLIS
        events.push(finalizer_completed(at, id))
    }

    events.push(scope_phase(at, "Released"))

    return { events, ends_at: at }
}

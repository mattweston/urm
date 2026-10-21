import { Effect, Scheduler, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL SCHEDULER PROGRAMS
// -----------------------------------------------------------------------------

export const default_scheduler_program = Effect.gen(function* () {
    const scheduler = yield* Scheduler.Scheduler
    const maxOpsBeforeYield = yield* Scheduler.MaxOpsBeforeYield
    const preventSchedulerYield = yield* Scheduler.PreventSchedulerYield

    return {
        executionMode: scheduler.executionMode,
        mixed: scheduler instanceof Scheduler.MixedScheduler,
        maxOpsBeforeYield,
        preventSchedulerYield,
    } as const
})

export const scheduler_override_program = Effect.gen(function* () {
    const defaultMode = yield* Effect.map(
        Scheduler.Scheduler,
        (scheduler: Scheduler.Scheduler) => scheduler.executionMode
    )

    const syncMode = yield* Effect.provideService(
        Effect.map(
            Scheduler.Scheduler,
            (scheduler: Scheduler.Scheduler) => scheduler.executionMode
        ),
        Scheduler.Scheduler,
        new Scheduler.MixedScheduler("sync")
    )

    return {
        defaultMode,
        syncMode,
    } as const
})

export const dispatcher_order_example = (): ReadonlyArray<string> => {
    const scheduler = new Scheduler.MixedScheduler(
        "async",
        (_task: () => void): (() => void) =>
            () =>
                undefined
    )
    const dispatcher = scheduler.makeDispatcher()
    const order: Array<string> = []

    dispatcher.scheduleTask(() => order.push("priority-10"), 10)
    dispatcher.scheduleTask(() => order.push("priority-0"), 0)
    dispatcher.scheduleTask(() => order.push("priority-5:a"), 5)
    dispatcher.scheduleTask(() => order.push("priority-5:b"), 5)

    dispatcher.flush()

    return order
}

export const flush_example = (): Readonly<{
    before: ReadonlyArray<string>
    after: ReadonlyArray<string>
}> => {
    const scheduler = new Scheduler.MixedScheduler(
        "async",
        (_task: () => void): (() => void) =>
            () =>
                undefined
    )
    const dispatcher = scheduler.makeDispatcher()
    const events: Array<string> = []

    dispatcher.scheduleTask(() => events.push("ran"), 0)
    const before = events.slice()
    dispatcher.flush()
    const after = events.slice()

    return {
        before,
        after,
    }
}

type YieldProbe = Parameters<Scheduler.Scheduler["shouldYield"]>[0]

const yield_probe = (
    currentOpCount: number,
    maxOpsBeforeYield: number
): YieldProbe =>
    ({
        currentOpCount,
        maxOpsBeforeYield,
    }) as unknown as YieldProbe

export const should_yield_example = (): Readonly<{
    below: boolean
    atBudget: boolean
    above: boolean
}> => {
    const scheduler = new Scheduler.MixedScheduler()

    return {
        below: scheduler.shouldYield(yield_probe(2047, 2048)),
        atBudget: scheduler.shouldYield(yield_probe(2048, 2048)),
        above: scheduler.shouldYield(yield_probe(4096, 2048)),
    }
}

export const yield_reference_program = Effect.gen(function* () {
    const defaults = {
        maxOpsBeforeYield: yield* Scheduler.MaxOpsBeforeYield,
        preventSchedulerYield: yield* Scheduler.PreventSchedulerYield,
    } as const

    const tunedBudget = yield* Effect.provideService(
        Scheduler.MaxOpsBeforeYield,
        Scheduler.MaxOpsBeforeYield,
        128
    )

    const disabledChecks = yield* Effect.provideService(
        Scheduler.PreventSchedulerYield,
        Scheduler.PreventSchedulerYield,
        true
    )

    return {
        defaults,
        tunedBudget,
        disabledChecks,
    } as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Service"),
    S.Literal("Queue"),
    S.Literal("Priority"),
    S.Literal("Yield"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Service",
    "Queue",
    "Priority",
    "Yield",
]

export const ServiceCase = S.Union([
    S.Literal("Default"),
    S.Literal("Override"),
    S.Literal("Interface"),
    S.Literal("Boundary"),
])
export type ServiceCase = typeof ServiceCase.Type

export const service_cases: ReadonlyArray<ServiceCase> = [
    "Default",
    "Override",
    "Interface",
    "Boundary",
]

export const QueueCase = S.Union([
    S.Literal("Dispatcher"),
    S.Literal("Schedule"),
    S.Literal("Flush"),
    S.Literal("Mode"),
])
export type QueueCase = typeof QueueCase.Type

export const queue_cases: ReadonlyArray<QueueCase> = [
    "Dispatcher",
    "Schedule",
    "Flush",
    "Mode",
]

export const PriorityCase = S.Union([
    S.Literal("LowerFirst"),
    S.Literal("FIFO"),
    S.Literal("Buckets"),
    S.Literal("Example"),
])
export type PriorityCase = typeof PriorityCase.Type

export const priority_cases: ReadonlyArray<PriorityCase> = [
    "LowerFirst",
    "FIFO",
    "Buckets",
    "Example",
]

export const YieldCase = S.Union([
    S.Literal("Budget"),
    S.Literal("Threshold"),
    S.Literal("Disable"),
    S.Literal("Fairness"),
])
export type YieldCase = typeof YieldCase.Type

export const yield_cases: ReadonlyArray<YieldCase> = [
    "Budget",
    "Threshold",
    "Disable",
    "Fairness",
]

export const Model = S.Struct({
    stage: Stage,
    serviceCase: ServiceCase,
    queueCase: QueueCase,
    priorityCase: PriorityCase,
    yieldCase: YieldCase,
})
export type Model = typeof Model.Type

export type StageDetails = Readonly<{
    eyebrow: string
    title: string
    description: string
    code: string
    apis: ReadonlyArray<string>
    notice: string
}>

export const stage_details: Record<Stage, StageDetails> = {
    Service: {
        eyebrow: "the runtime reads its scheduler from a Context.Reference",
        title: "Treat Scheduler as a replaceable runtime service",
        description:
            "Scheduler.Scheduler is both the scheduler interface name and the Context.Reference used by Effect fibers. The default reference creates a MixedScheduler, while tests or runtime setup can provide a custom implementation or a differently configured MixedScheduler for a scoped effect.",
        code: `const current =
    yield* Scheduler.Scheduler

const mode =
    yield* Effect.provideService(
        Effect.map(
            Scheduler.Scheduler,
            scheduler =>
                scheduler.executionMode
        ),
        Scheduler.Scheduler,
        new Scheduler.MixedScheduler(
            "sync"
        )
    )`,
        apis: [
            "Scheduler.Scheduler",
            "Scheduler.MixedScheduler",
            "Effect.provideService",
        ],
        notice: "The service controls fiber scheduling policy. Keep scheduler objects on the runtime side of a Foldkit feature; the pure Model should contain only UI-visible data derived from runtime behavior.",
    },

    Queue: {
        eyebrow:
            "a scheduler creates dispatchers that own queued runnable tasks",
        title: "Queue work through SchedulerDispatcher",
        description:
            "makeDispatcher returns a SchedulerDispatcher. scheduleTask enqueues a callback with a numeric priority, while flush synchronously drains pending work. MixedScheduler normally arranges asynchronous dispatch, but flush is useful for deterministic tests and low-level integrations.",
        code: `const scheduler =
    new Scheduler.MixedScheduler()

const dispatcher =
    scheduler.makeDispatcher()

dispatcher.scheduleTask(
    () => runWork(),
    0
)

dispatcher.flush()`,
        apis: [
            "Scheduler.SchedulerDispatcher",
            "Scheduler.MixedScheduler.makeDispatcher",
            "scheduleTask",
            "flush",
        ],
        notice: "SchedulerDispatcher is deliberately small. It is low-level runtime machinery, not an application task queue: it schedules runnable callbacks, not Effect values, retries, or business jobs.",
    },

    Priority: {
        eyebrow:
            "numeric priority chooses buckets; insertion order breaks ties",
        title: "Lower priority numbers run first, equal priorities stay FIFO",
        description:
            "MixedScheduler groups pending callbacks into ordered priority buckets. Smaller numeric values are drained first. Within one numeric priority, callbacks are appended and retain first-in-first-out order.",
        code: `dispatcher.scheduleTask(
    () => order.push("p10"),
    10
)
dispatcher.scheduleTask(
    () => order.push("p0"),
    0
)
dispatcher.scheduleTask(
    () => order.push("p5-a"),
    5
)
dispatcher.scheduleTask(
    () => order.push("p5-b"),
    5
)

dispatcher.flush()
// p0, p5-a, p5-b, p10`,
        apis: [
            "Scheduler.MixedScheduler",
            "Scheduler.SchedulerDispatcher",
            "scheduleTask",
            "flush",
        ],
        notice: "Do not read 'higher priority' as a larger number here. MixedScheduler sorts numeric priorities ascending: 0 runs before 5, and 5 runs before 10.",
    },

    Yield: {
        eyebrow: "cooperative fairness is controlled by an operation budget",
        title: "Tune how often fibers yield without confusing tuning with disabling",
        description:
            "MixedScheduler.shouldYield compares a fiber's current operation count with its max operation budget. MaxOpsBeforeYield defaults to 2048 and tunes that budget. PreventSchedulerYield is a separate runtime reference: when true, the fiber run loop bypasses scheduler yield checks entirely.",
        code: `yield* Effect.provideService(
    Scheduler.MaxOpsBeforeYield,
    Scheduler.MaxOpsBeforeYield,
    128
)

yield* Effect.provideService(
    Scheduler.PreventSchedulerYield,
    Scheduler.PreventSchedulerYield,
    true
)`,
        apis: [
            "Scheduler.MaxOpsBeforeYield",
            "Scheduler.PreventSchedulerYield",
            "Scheduler.Scheduler.shouldYield",
        ],
        notice: "Prefer tuning MaxOpsBeforeYield when you need a different throughput/fairness tradeoff. PreventSchedulerYield disables cooperative yield checks and can let long-running fibers monopolize the JavaScript thread.",
    },
}

// -----------------------------------------------------------------------------
// VISUAL SNAPSHOTS
// -----------------------------------------------------------------------------

export type Snapshot = Readonly<{
    input: string
    operation: string
    result: string
    invariant: string
    implementation: string
    guidance: string
}>

export const service_snapshot = (model: Model): Snapshot => {
    switch (model.serviceCase) {
        case "Default":
            return {
                input: "yield* Scheduler.Scheduler",
                operation: "resolve Context.Reference default",
                result: 'MixedScheduler("async")',
                invariant: "runtime scheduling is a service lookup",
                implementation: "defaultValue creates a new MixedScheduler",
                guidance:
                    "Use the default unless you have a concrete runtime or testing reason to change scheduling behavior.",
            }

        case "Override":
            return {
                input: 'new MixedScheduler("sync")',
                operation: "Effect.provideService(Scheduler.Scheduler, custom)",
                result: "override is scoped to the provided effect",
                invariant: "no process-global scheduler mutation is required",
                implementation:
                    "Context.Reference participates in the fiber context",
                guidance:
                    "Override scheduler policy at a runtime boundary or in focused tests rather than deep in domain logic.",
            }

        case "Interface":
            return {
                input: "Scheduler.Scheduler implementation",
                operation: "executionMode + shouldYield + makeDispatcher",
                result: "custom scheduling strategy",
                invariant: "the interface is intentionally small",
                implementation:
                    "MixedScheduler is only the default implementation",
                guidance:
                    "Implement Scheduler only when dispatch and yield policy genuinely need to differ from MixedScheduler.",
            }

        case "Boundary":
            return {
                input: "Foldkit feature",
                operation: "runtime owns scheduler; messages carry outcomes",
                result: "pure UI Model",
                invariant: "scheduler state is not serializable feature state",
                implementation: "provide Scheduler at the Effect runtime edge",
                guidance:
                    "Keep framework scheduling separate from the Model / Message / update loop.",
            }
    }
}

export const queue_snapshot = (model: Model): Snapshot => {
    switch (model.queueCase) {
        case "Dispatcher":
            return {
                input: "MixedScheduler",
                operation: "makeDispatcher()",
                result: "SchedulerDispatcher",
                invariant: "dispatcher owns its pending task buckets",
                implementation: "MixedSchedulerDispatcher is internal",
                guidance:
                    "Use the interface rather than relying on the unexported concrete dispatcher class.",
            }

        case "Schedule":
            return {
                input: "callback + numeric priority",
                operation: "dispatcher.scheduleTask(callback, priority)",
                result: "callback queued",
                invariant: "scheduling does not return an Effect",
                implementation:
                    "the first pending task arranges an async drain",
                guidance:
                    "This API is for runtime callbacks; use Effect combinators for application-level asynchronous work.",
            }

        case "Flush":
            return {
                input: "pending dispatcher tasks",
                operation: "dispatcher.flush()",
                result: "all queued work drained synchronously",
                invariant: "flush is deterministic for already queued tasks",
                implementation:
                    "pending scheduled drain is cancelled before direct draining",
                guidance:
                    "flush is especially useful in scheduler tests where queued work must complete before assertions.",
            }

        case "Mode":
            return {
                input: 'MixedScheduler("sync" | "async")',
                operation: "choose dispatcher wake-up strategy",
                result: "microtask-like sync mode or async setImmediate/setTimeout mode",
                invariant: "executionMode describes scheduler dispatch mode",
                implementation: "constructor chooses the setImmediate function",
                guidance:
                    "Do not confuse sync execution mode with running arbitrary Effects via Effect.runSync.",
            }
    }
}

export const priority_snapshot = (model: Model): Snapshot => {
    switch (model.priorityCase) {
        case "LowerFirst":
            return {
                input: "priorities 10, 0, 5",
                operation: "ordered bucket insertion",
                result: "0 → 5 → 10",
                invariant: "smaller numeric priority runs first",
                implementation: "PriorityBuckets keeps buckets ascending",
                guidance:
                    "Document your priority convention when application adapters assign numbers.",
            }

        case "FIFO":
            return {
                input: "p5:a then p5:b",
                operation: "append both to the same priority bucket",
                result: "p5:a → p5:b",
                invariant: "equal priorities preserve insertion order",
                implementation: "bucket task arrays use push",
                guidance:
                    "Equal priority is stable, so enqueue order can be used as the tie-breaker.",
            }

        case "Buckets":
            return {
                input: "many scheduled callbacks",
                operation: "group by numeric priority",
                result: "one task array per priority",
                invariant: "priority sorting happens at bucket level",
                implementation:
                    "a drain swaps the pending bucket array out before running",
                guidance:
                    "New tasks scheduled during a drain can be collected for a subsequent dispatch cycle.",
            }

        case "Example":
            return {
                input: "10, 0, 5:a, 5:b",
                operation: "schedule then flush",
                result: "0, 5:a, 5:b, 10",
                invariant: "priority first, FIFO second",
                implementation: "matches dispatcher_order_example",
                guidance:
                    "This ordering is the most useful concrete rule to remember from the dispatcher implementation.",
            }
    }
}

export const yield_snapshot = (model: Model): Snapshot => {
    switch (model.yieldCase) {
        case "Budget":
            return {
                input: "Scheduler.MaxOpsBeforeYield",
                operation: "read current fiber reference",
                result: "2048 by default",
                invariant: "budget is scoped through Context.Reference",
                implementation: "reference is fiber-cached",
                guidance:
                    "Tune the operation budget only after measuring a real fairness or throughput issue.",
            }

        case "Threshold":
            return {
                input: "currentOpCount >= maxOpsBeforeYield",
                operation: "MixedScheduler.shouldYield(fiber)",
                result: "true at and above the budget",
                invariant: "comparison is inclusive at the threshold",
                implementation: "shouldYield performs a direct >= comparison",
                guidance:
                    "The scheduler answers whether a yield is due; the fiber run loop decides when to consult it.",
            }

        case "Disable":
            return {
                input: "PreventSchedulerYield = true",
                operation: "fiber run loop skips shouldYield",
                result: "automatic scheduler yield checks bypassed",
                invariant: "this is not the same as a very large budget",
                implementation: "runtime reference gates the check itself",
                guidance:
                    "Reserve this for controlled workloads because one busy fiber can monopolize the JavaScript thread.",
            }

        case "Fairness":
            return {
                input: "CPU-bound runnable fiber",
                operation: "periodic cooperative yield",
                result: "other runnable work gets a chance to proceed",
                invariant:
                    "yielding trades some throughput for responsiveness/fairness",
                implementation: "operation count feeds scheduler policy",
                guidance:
                    "Prefer cooperative tuning over disabling yields when latency for other fibers matters.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedSchedulerStage: {
        stage: Stage,
    },
    SelectedSchedulerServiceCase: {
        serviceCase: ServiceCase,
    },
    SelectedSchedulerQueueCase: {
        queueCase: QueueCase,
    },
    SelectedSchedulerPriorityCase: {
        priorityCase: PriorityCase,
    },
    SelectedSchedulerYieldCase: {
        yieldCase: YieldCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Service",
    serviceCase: "Default",
    queueCase: "Dispatcher",
    priorityCase: "Example",
    yieldCase: "Budget",
})

type StagePayload = Readonly<{ stage: Stage }>
type ServiceCasePayload = Readonly<{ serviceCase: ServiceCase }>
type QueueCasePayload = Readonly<{ queueCase: QueueCase }>
type PriorityCasePayload = Readonly<{ priorityCase: PriorityCase }>
type YieldCasePayload = Readonly<{ yieldCase: YieldCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedSchedulerStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedSchedulerServiceCase: ({
            serviceCase,
        }: ServiceCasePayload) => ({
            model: evo(model, {
                serviceCase: () => serviceCase,
            }),
        }),

        SelectedSchedulerQueueCase: ({ queueCase }: QueueCasePayload) => ({
            model: evo(model, {
                queueCase: () => queueCase,
            }),
        }),

        SelectedSchedulerPriorityCase: ({
            priorityCase,
        }: PriorityCasePayload) => ({
            model: evo(model, {
                priorityCase: () => priorityCase,
            }),
        }),

        SelectedSchedulerYieldCase: ({ yieldCase }: YieldCasePayload) => ({
            model: evo(model, {
                yieldCase: () => yieldCase,
            }),
        }),
    })

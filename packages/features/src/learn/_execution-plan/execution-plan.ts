import { Context, Effect, ExecutionPlan, Exit, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// SERVICES + REAL PLANS
// -----------------------------------------------------------------------------

export type BackendName = "primary" | "secondary" | "backup" | "rescue"

export type BackendShape = Readonly<{
    name: BackendName
}>

export class Backend extends Context.Service<Backend, BackendShape>()(
    "ExecutionPlanDemo/Backend"
) {}

export type RetryGateShape = Readonly<{
    allow: boolean
}>

export class RetryGate extends Context.Service<RetryGate, RetryGateShape>()(
    "ExecutionPlanDemo/RetryGate"
) {}

const backend_context = (name: BackendName) =>
    Context.make(Backend, {
        name,
    })

export const primary_context = backend_context("primary")

export const secondary_context = backend_context("secondary")

export const backup_context = backend_context("backup")

export const rescue_context = backend_context("rescue")

export const fallback_plan = ExecutionPlan.make(
    {
        provide: primary_context,
        attempts: 2,
    },
    {
        provide: backup_context,
        attempts: 1,
    }
)

export const first_plan = ExecutionPlan.make(
    {
        provide: primary_context,
        attempts: 1,
    },
    {
        provide: secondary_context,
        attempts: 1,
    }
)

export const second_plan = ExecutionPlan.make(
    {
        provide: backup_context,
        attempts: 1,
    },
    {
        provide: rescue_context,
        attempts: 1,
    }
)

export const merged_plan = ExecutionPlan.merge(first_plan, second_plan)

export const gated_plan = ExecutionPlan.make(
    {
        provide: primary_context,
        attempts: 2,
        while: (_error: string) =>
            Effect.map(RetryGate, (gate: RetryGateShape) => gate.allow),
    },
    {
        provide: backup_context,
        attempts: 1,
    }
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Steps"),
    S.Literal("Run"),
    S.Literal("Events"),
    S.Literal("Merge"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = ["Steps", "Run", "Events", "Merge"]

export const RunCase = S.Union([
    S.Literal("FirstSuccess"),
    S.Literal("FallbackSuccess"),
    S.Literal("Exhausted"),
])
export type RunCase = typeof RunCase.Type

export const Model = S.Struct({
    stage: Stage,
    runCase: RunCase,
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
    Steps: {
        eyebrow: "ordered fallback",
        title: "A plan is a non-empty sequence of resource-backed steps",
        description:
            "Each step provides a Context or Layer and can limit attempts, gate retries with while, or attach a Schedule. The runtime stays on a step until its policy is exhausted before falling through.",
        code: `const plan =
    ExecutionPlan.make(
        {
            provide: primaryContext,
            attempts: 2
        },
        {
            provide: backupContext,
            attempts: 1
        }
    )

ExecutionPlan.isExecutionPlan(plan)
// true`,
        apis: [
            "ExecutionPlan.make",
            "ExecutionPlan.isExecutionPlan",
            "ExecutionPlan.TypeId",
            "ExecutionPlan.ExecutionPlan",
        ],
        notice: "attempts must be greater than zero. A step with no attempts, while, or schedule gets one normal execution before the plan advances.",
    },

    Run: {
        eyebrow: "Effect.withExecutionPlan",
        title: "The same Effect is retried with different provided resources",
        description:
            "The workflow asks for Backend once in its type. The plan decides which concrete Backend is provided for each attempt until one execution succeeds or every step fails.",
        code: `const workflow =
    Effect.gen(function* () {
        const backend =
            yield* Backend

        const metadata =
            yield*
                ExecutionPlan.CurrentMetadata

        if (backend.name === "primary") {
            return yield*
                Effect.fail("unavailable")
        }

        return \`\${backend.name}:ok\`
    })

Effect.withExecutionPlan(
    workflow,
    plan
)`,
        apis: [
            "Effect.withExecutionPlan",
            "ExecutionPlan.CurrentMetadata",
            "ExecutionPlan.Metadata",
        ],
        notice: "CurrentMetadata.attempt is cumulative across the whole plan. stepIndex is zero-based, while the lifecycle event's stepAttempt is one-based within the active step.",
    },

    Events: {
        eyebrow: "attempt lifecycle",
        title: "Every attempt emits start plus one terminal event",
        description:
            "withExecutionPlan can receive an onEvent Effect. AttemptStart is followed by AttemptFailure or AttemptSuccess, with cumulative and per-step attempt numbers kept separately.",
        code: `const events:
    Array<
        ExecutionPlan.Event<string>
    > = []

yield* Effect.withExecutionPlan(
    workflow,
    plan,
    {
        onEvent: (event) =>
            Effect.sync(() => {
                events.push(event)
            })
    }
)

// Start 1 / step 0 / stepTry 1
// Failure
// Start 2 / step 0 / stepTry 2
// Failure
// Start 3 / step 1 / stepTry 1
// Success`,
        apis: [
            "ExecutionPlan.Event",
            "ExecutionPlan.AttemptStart",
            "ExecutionPlan.AttemptFailure",
            "ExecutionPlan.AttemptSuccess",
            "ExecutionPlan.CurrentMetadata",
        ],
        notice: "AttemptFailure carries the full Cause, including defects and interruption. Event durations use elapsed monotonic time, so the visual demo focuses on stable attempt metadata rather than wall-clock values.",
    },

    Merge: {
        eyebrow: "compose + close requirements",
        title: "merge concatenates plans; captureRequirements closes over services",
        description:
            "Plans can be built independently and concatenated in order. If while predicates, schedules, or Layers need services, captureRequirements records the current context so the captured plan requires none later.",
        code: `const merged =
    ExecutionPlan.merge(
        primaryPlan,
        fallbackPlan
    )

const captured =
    yield* gatedPlan
        .captureRequirements
        .pipe(
            Effect.provideService(
                RetryGate,
                { allow: true }
            )
        )

// captured requirements -> never`,
        apis: [
            "ExecutionPlan.merge",
            "ExecutionPlan.captureRequirements",
            "ExecutionPlan.make",
            "ExecutionPlan.make.StepProvides",
            "ExecutionPlan.make.StepInput",
        ],
        notice: "merge preserves plan order by concatenating step arrays. captureRequirements does not run the plan; it rewrites Layers and while predicates so their current requirements are already provided.",
    },
}

// -----------------------------------------------------------------------------
// WORKFLOW + EVENT HELPERS
// -----------------------------------------------------------------------------

export type StableEvent = Readonly<{
    tag: "AttemptStart" | "AttemptSuccess" | "AttemptFailure"
    attempt: number
    stepAttempt: number
    stepIndex: number
}>

const stable_event = (event: ExecutionPlan.Event<string>): StableEvent => ({
    tag: event._tag,
    attempt: event.attempt,
    stepAttempt: event.stepAttempt,
    stepIndex: event.stepIndex,
})

const backend_for_step = (stepIndex: number): BackendName =>
    stepIndex === 0 ? "primary" : "backup"

const should_fail = (runCase: RunCase, backend: BackendName): boolean =>
    runCase === "Exhausted"
        ? true
        : runCase === "FallbackSuccess"
          ? backend === "primary"
          : false

const make_workflow = (runCase: RunCase, metadataReads: Array<string>) =>
    Effect.gen(function* () {
        const backend = yield* Backend

        const metadata = yield* ExecutionPlan.CurrentMetadata

        yield* Effect.sync(() => {
            metadataReads.push(
                `attempt ${metadata.attempt} · step ${metadata.stepIndex} · ${backend.name}`
            )
        })

        if (should_fail(runCase, backend.name)) {
            return yield* Effect.fail(`unavailable:${backend.name}`)
        }

        return `${backend.name}:success`
    })

const run_case = (
    runCase: RunCase
): Readonly<{
    exit: Exit.Exit<string, string>
    events: ReadonlyArray<StableEvent>
    metadataReads: ReadonlyArray<string>
}> => {
    const events: Array<ExecutionPlan.Event<string>> = []

    const metadataReads: Array<string> = []

    const effect = Effect.withExecutionPlan(
        make_workflow(runCase, metadataReads),
        fallback_plan,
        {
            onEvent: (event: ExecutionPlan.Event<string>) =>
                Effect.sync(() => {
                    events.push(event)
                }),
        }
    ).pipe(Effect.exit)

    return {
        exit: Effect.runSync(effect),
        events: events.map(stable_event),
        metadataReads,
    }
}

// -----------------------------------------------------------------------------
// SNAPSHOTS: STEPS
// -----------------------------------------------------------------------------

export type StepSnapshot = Readonly<{
    index: number
    backend: BackendName
    attempts: number
    hasWhile: boolean
    hasSchedule: boolean
}>

export type StepsSnapshot = Readonly<{
    typeId: string
    isExecutionPlan: boolean
    stepCount: number
    steps: ReadonlyArray<StepSnapshot>
}>

export const steps_snapshot = (): StepsSnapshot => ({
    typeId: ExecutionPlan.TypeId,
    isExecutionPlan: ExecutionPlan.isExecutionPlan(fallback_plan),
    stepCount: fallback_plan.steps.length,
    steps: fallback_plan.steps.map(
        (step: (typeof fallback_plan.steps)[number], index: number) => ({
            index,
            backend: backend_for_step(index),
            attempts: step.attempts ?? 1,
            hasWhile: step.while !== undefined,
            hasSchedule: step.schedule !== undefined,
        })
    ),
})

// -----------------------------------------------------------------------------
// SNAPSHOTS: RUN
// -----------------------------------------------------------------------------

export type RunSnapshot = Readonly<{
    mode: RunCase
    exitTag: string
    result: string
    attemptCount: number
    finalStep: string
    metadataReads: string
}>

export const run_snapshot = (model: Model): RunSnapshot => {
    const run = run_case(model.runCase)

    const starts = run.events.filter(
        (event: StableEvent) => event.tag === "AttemptStart"
    )

    const finalEvent = run.events[run.events.length - 1]

    return {
        mode: model.runCase,
        exitTag: run.exit._tag,
        result: Exit.isSuccess(run.exit) ? run.exit.value : "plan exhausted",
        attemptCount: starts.length,
        finalStep:
            finalEvent === undefined
                ? "—"
                : `${finalEvent.stepIndex} · ${backend_for_step(
                      finalEvent.stepIndex
                  )}`,
        metadataReads: run.metadataReads.join("\n"),
    }
}

// -----------------------------------------------------------------------------
// SNAPSHOTS: EVENTS
// -----------------------------------------------------------------------------

export type EventsSnapshot = Readonly<{
    result: string
    defaultMetadata: string
    metadataReads: ReadonlyArray<string>
    events: ReadonlyArray<StableEvent>
}>

export const events_snapshot = (): EventsSnapshot => {
    const run = run_case("FallbackSuccess")

    const defaultMetadata = Effect.runSync(ExecutionPlan.CurrentMetadata)

    return {
        result: Exit.isSuccess(run.exit) ? run.exit.value : "failure",
        defaultMetadata: `attempt ${defaultMetadata.attempt} · step ${defaultMetadata.stepIndex}`,
        metadataReads: run.metadataReads,
        events: run.events,
    }
}

// -----------------------------------------------------------------------------
// SNAPSHOTS: MERGE + CAPTURE REQUIREMENTS
// -----------------------------------------------------------------------------

export type MergeSnapshot = Readonly<{
    firstSteps: number
    secondSteps: number
    mergedSteps: number
    mergedOrder: string
    capturedIsPlan: boolean
    capturedSteps: number
    runWithoutGate: string
    gateValueCaptured: boolean
}>

export const merge_snapshot = (): MergeSnapshot => {
    const captured = Effect.runSync(
        gated_plan.captureRequirements.pipe(
            Effect.provideService(RetryGate, {
                allow: true,
            })
        )
    )

    const metadataReads: Array<string> = []

    const result = Effect.runSync(
        Effect.withExecutionPlan(
            make_workflow("FallbackSuccess", metadataReads),
            captured
        )
    )

    return {
        firstSteps: first_plan.steps.length,
        secondSteps: second_plan.steps.length,
        mergedSteps: merged_plan.steps.length,
        mergedOrder: "primary → secondary → backup → rescue",
        capturedIsPlan: ExecutionPlan.isExecutionPlan(captured),
        capturedSteps: captured.steps.length,
        runWithoutGate: result,
        gateValueCaptured: true,
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedExecutionPlanStage: {
        stage: Stage,
    },
    SelectedExecutionPlanRunCase: {
        runCase: RunCase,
    },
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Steps",
    runCase: "FallbackSuccess",
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

type StagePayload = Readonly<{
    stage: Stage
}>

type RunCasePayload = Readonly<{
    runCase: RunCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedExecutionPlanStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedExecutionPlanRunCase: ({ runCase }: RunCasePayload) => ({
            model: modifyFields(model, {
                runCase: () => runCase,
            }),
        }),
    })

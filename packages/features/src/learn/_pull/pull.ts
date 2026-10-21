import { Cause, Effect, Exit, Pull, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL PULL VALUES
// -----------------------------------------------------------------------------

export const success_pull: Pull.Pull<number, string, string> =
    Effect.succeed(42)

export const failure_pull: Pull.Pull<number, string, string> =
    Effect.fail("boom")

export const done_pull: Pull.Pull<number, string, string> =
    Cause.done("end-of-input")

export type DemoSuccess = Pull.Success<typeof success_pull>

export type DemoError = Pull.Error<typeof failure_pull>

export type DemoLeftover = Pull.Leftover<typeof done_pull>

export type DemoServices = Pull.Services<typeof success_pull>

export type DemoWithoutDone = Pull.ExcludeDone<string | Cause.Done<string>>

export const done_signal = Cause.Done("leftover")

export const done_cause = Cause.fail(done_signal)

export const ordinary_cause = Cause.fail("ordinary failure")

export const mixed_cause = Cause.fromReasons<string | Cause.Done<string>>([
    ...done_cause.reasons,
    ...ordinary_cause.reasons,
])

export const recovered_done = Pull.catchDone(done_pull, (leftover: string) =>
    Effect.succeed(`done:${leftover}`)
)

export const matched_success = Pull.matchEffect(success_pull, {
    onSuccess: (value: number) => Effect.succeed(`success:${value}`),
    onFailure: (cause: Cause.Cause<string>) =>
        Effect.succeed(`failure:${cause.reasons.length}`),
    onDone: (leftover: string) => Effect.succeed(`done:${leftover}`),
})

export const matched_done = Pull.matchEffect(done_pull, {
    onSuccess: (value: number) => Effect.succeed(`success:${value}`),
    onFailure: (cause: Cause.Cause<string>) =>
        Effect.succeed(`failure:${cause.reasons.length}`),
    onDone: (leftover: string) => Effect.succeed(`done:${leftover}`),
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Model"),
    S.Literal("Detect"),
    S.Literal("Filter"),
    S.Literal("Match"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Model",
    "Detect",
    "Filter",
    "Match",
]

export const ModelCase = S.Union([
    S.Literal("Pull"),
    S.Literal("Types"),
    S.Literal("Done"),
])
export type ModelCase = typeof ModelCase.Type

export const DetectCase = S.Union([
    S.Literal("Cause"),
    S.Literal("Reason"),
    S.Literal("Exclude"),
])
export type DetectCase = typeof DetectCase.Type

export const FilterCase = S.Union([
    S.Literal("Done"),
    S.Literal("Leftover"),
    S.Literal("NoDone"),
])
export type FilterCase = typeof FilterCase.Type

export const MatchCase = S.Union([
    S.Literal("Match"),
    S.Literal("Catch"),
    S.Literal("Exit"),
])
export type MatchCase = typeof MatchCase.Type

export const Model = S.Struct({
    stage: Stage,
    modelCase: ModelCase,
    detectCase: DetectCase,
    filterCase: FilterCase,
    matchCase: MatchCase,
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
    Model: {
        eyebrow: "one pull step · three semantic outcomes",
        title: "Model a low-level stream pull as value, ordinary failure, or graceful Done completion",
        description:
            "Pull<A, E, Done, R> extends Effect<A, E | Cause.Done<Done>, R>. A successful Effect emits one value. E represents a real failure. Cause.Done carries normal end-of-input, optionally with a leftover/final value.",
        code: `const value:
    Pull.Pull<
        number,
        string,
        string
    > =
    Effect.succeed(
        42
    )

const failure:
    Pull.Pull<
        number,
        string,
        string
    > =
    Effect.fail(
        "boom"
    )

const done:
    Pull.Pull<
        number,
        string,
        string
    > =
    Cause.done(
        "end-of-input"
    )`,
        apis: [
            "Pull.Pull",
            "Pull.Success",
            "Pull.Error",
            "Pull.Leftover",
            "Pull.Services",
            "Pull.ExcludeDone",
        ],
        notice: "Cause.Done appears in the Effect error channel as an implementation mechanism, but Pull treats it as graceful completion rather than an ordinary failure.",
    },

    Detect: {
        eyebrow: "recognize completion inside Cause",
        title: "Detect Done at the whole-cause or individual-failure-reason level",
        description:
            "isDoneCause scans cause.reasons for a Done failure. isDoneFailure is the narrower guard for one Cause.Reason: it must be a Fail reason whose error satisfies Cause.isDone. ExcludeDone removes Done from an error union at the type level.",
        code: `const doneSignal =
    Cause.Done(
        "leftover"
    )

const doneCause =
    Cause.fail(
        doneSignal
    )

Pull.isDoneCause(
    doneCause
)
// true

Pull.isDoneFailure(
    doneCause.reasons[0]!
)
// true

type Ordinary =
    Pull.ExcludeDone<
        string |
        Cause.Done<string>
    >
// string`,
        apis: [
            "Pull.isDoneCause",
            "Pull.isDoneFailure",
            "Pull.ExcludeDone",
            "Cause.Done",
        ],
        notice: "isDoneCause answers only whether a Done reason exists. It does not by itself tell you whether the same Cause also contains a real non-interruption failure; filterDone handles that distinction.",
    },

    Filter: {
        eyebrow: "separate normal completion from genuine failure",
        title: "Filter a Cause into Done, leftover, or non-Done branches without losing real failures",
        description:
            "filterDone succeeds only when a Done signal exists and there are no other non-interruption failures. If Done is mixed with a real failure, it removes the Done reason and returns the remaining Cause as failure. filterDoneLeftover extracts only Done.value; filterNoDone accepts causes with no Done at all.",
        code: `const doneOnly =
    Cause.fail(
        Cause.Done(
            "tail"
        )
    )

Pull.filterDone(
    doneOnly
)
// Success(Done("tail"))

Pull.filterDoneLeftover(
    doneOnly
)
// Success("tail")

Pull.filterNoDone(
    Cause.fail(
        "boom"
    )
)
// Success(Cause("boom"))`,
        apis: [
            "Pull.filterDone",
            "Pull.filterDoneVoid",
            "Pull.filterNoDone",
            "Pull.filterDoneLeftover",
        ],
        notice: "A Done signal merged with a genuine failure is not silently converted into success. The Done reason is stripped and the real failure Cause is preserved.",
    },

    Match: {
        eyebrow: "handle completion separately from failure",
        title: "Recover Done, convert it to Exit success, or pattern-match all three Pull outcomes",
        description:
            "catchDone handles only graceful completion and leaves ordinary errors in the error channel. doneExitFromCause converts Done-only Cause into Exit success. matchEffect exposes success, ordinary-failure Cause, and Done leftover as three explicit effectful branches.",
        code: `const result =
    Pull.matchEffect(
        pull,
        {
            onSuccess:
                (
                    value
                ) =>
                    Effect.succeed(
                        \`value:\${value}\`
                    ),
            onFailure:
                (
                    cause
                ) =>
                    Effect.succeed(
                        \`failure:\${cause}\`
                    ),
            onDone:
                (
                    leftover
                ) =>
                    Effect.succeed(
                        \`done:\${leftover}\`
                    )
        }
    )

const recovered =
    Pull.catchDone(
        pull,
        (
            leftover
        ) =>
            Effect.succeed(
                leftover
            )
    )`,
        apis: ["Pull.catchDone", "Pull.doneExitFromCause", "Pull.matchEffect"],
        notice: "matchEffect is the clearest high-level destructor when all three outcomes matter. Current Channel code uses it to flush buffered data before re-emitting Cause.done(leftover).",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type ModelSnapshot = Readonly<{
    mode: ModelCase
    model: string
    success: string
    failure: string
    done: string
    extractors: string
    services: string
}>

export const model_snapshot = (model: Model): ModelSnapshot => ({
    mode: model.modelCase,
    model: "Pull<A,E,Done,R> = Effect<A, E | Cause.Done<Done>, R>",
    success: "Effect.succeed(42) → emitted A",
    failure: 'Effect.fail("boom") → ordinary E',
    done: 'Cause.done("end-of-input") → graceful completion',
    extractors: "Success · Error · Leftover · Services",
    services: "type-only extraction · no runtime wrapper",
})

export type DetectSnapshot = Readonly<{
    mode: DetectCase
    doneCause: boolean
    normalCause: boolean
    doneReason: boolean
    tag: string
    excludes: string
}>

export const detect_snapshot = (model: Model): DetectSnapshot => ({
    mode: model.detectCase,
    doneCause: Pull.isDoneCause(done_cause),
    normalCause: Pull.isDoneCause(ordinary_cause),
    doneReason: Pull.isDoneFailure(done_cause.reasons[0]!),
    tag: done_signal._tag,
    excludes: "string | Done<string> → string",
})

export type FilterSnapshot = Readonly<{
    mode: FilterCase
    done: string
    leftover: string
    noDone: string
    mixed: string
    voidVariant: string
}>

export const filter_snapshot = (model: Model): FilterSnapshot => {
    const done = Pull.filterDone(done_cause)

    const leftover = Pull.filterDoneLeftover(done_cause)

    const noDone = Pull.filterNoDone(ordinary_cause)

    const mixed = Pull.filterDone(mixed_cause)

    return {
        mode: model.filterCase,
        done: Result.isSuccess(done)
            ? `Success(Done(${done.success.value}))`
            : "Failure",
        leftover: Result.isSuccess(leftover)
            ? `Success(${leftover.success})`
            : "Failure",
        noDone: Result.isSuccess(noDone)
            ? "Success(non-Done Cause)"
            : "Failure",
        mixed: Result.isFailure(mixed)
            ? "Failure(real Cause, Done stripped)"
            : "Success",
        voidVariant: "filterDoneVoid ignores the Done payload type",
    }
}

export type MatchSnapshot = Readonly<{
    mode: MatchCase
    success: string
    done: string
    catchDone: string
    exit: string
    realUse: string
}>

export const match_snapshot = (model: Model): MatchSnapshot => {
    const exit = Pull.doneExitFromCause(done_cause)

    return {
        mode: model.matchCase,
        success: 'matchEffect(success) → onSuccess("42")',
        done: 'matchEffect(done) → onDone("end-of-input")',
        catchDone: "catchDone recovers Done · ordinary E remains",
        exit: Exit.isSuccess(exit)
            ? `Exit.Success(${exit.value})`
            : "Exit.Failure",
        realUse: "Channel transforms use matchEffect and doneExitFromCause",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedPullStage: {
        stage: Stage,
    },
    SelectedPullModelCase: {
        modelCase: ModelCase,
    },
    SelectedPullDetectCase: {
        detectCase: DetectCase,
    },
    SelectedPullFilterCase: {
        filterCase: FilterCase,
    },
    SelectedPullMatchCase: {
        matchCase: MatchCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Model",
    modelCase: "Pull",
    detectCase: "Cause",
    filterCase: "Done",
    matchCase: "Match",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type ModelCasePayload = Readonly<{
    modelCase: ModelCase
}>

type DetectCasePayload = Readonly<{
    detectCase: DetectCase
}>

type FilterCasePayload = Readonly<{
    filterCase: FilterCase
}>

type MatchCasePayload = Readonly<{
    matchCase: MatchCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedPullStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedPullModelCase: ({ modelCase }: ModelCasePayload) => ({
            model: evo(model, {
                modelCase: () => modelCase,
            }),
        }),

        SelectedPullDetectCase: ({ detectCase }: DetectCasePayload) => ({
            model: evo(model, {
                detectCase: () => detectCase,
            }),
        }),

        SelectedPullFilterCase: ({ filterCase }: FilterCasePayload) => ({
            model: evo(model, {
                filterCase: () => filterCase,
            }),
        }),

        SelectedPullMatchCase: ({ matchCase }: MatchCasePayload) => ({
            model: evo(model, {
                matchCase: () => matchCase,
            }),
        }),
    })

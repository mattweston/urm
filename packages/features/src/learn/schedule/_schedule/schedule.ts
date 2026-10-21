import {
    Data,
    Duration,
    Effect,
    Match as M,
    Schedule,
    Schema as S,
} from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Schedule examples
// -----------------------------------------------------------------------------

// recurs(n) means n recurrences after the initial Effect execution.
// Used with repeat/retry, recurs(3) therefore allows up to 4 executions total.
export const ThreeRecurrences = Schedule.recurs(3)

// Fixed spacing measured after each action completes.
export const EverySecond = Schedule.spaced("1 second")

// Increasing retry delays.
export const ExponentialBackoff = Schedule.exponential("100 millis").pipe(
    Schedule.upTo({ times: 4 })
)

export const FibonacciBackoff = Schedule.fibonacci("100 millis").pipe(
    Schedule.upTo({ times: 5 })
)

// Randomly vary delays by roughly ±20% to avoid synchronized retries.
export const JitteredBackoff = ExponentialBackoff.pipe(Schedule.jittered)

// Limit an otherwise unbounded schedule.
export const Limited = Schedule.forever.pipe(Schedule.upTo({ times: 3 }))

// Run one policy to completion, then switch to another policy.
export const QuickThenSlow = Schedule.concat(
    Schedule.recurs(1),
    Schedule.spaced("1 second").pipe(Schedule.upTo({ times: 2 }))
)

export class RequestError extends Data.TaggedError("RequestError")<{
    readonly attempt: number
}> {}

// Effect.retry feeds failures into the Schedule.
export const retry_example = Effect.gen(function* () {
    let attempt = 0

    const request = Effect.suspend(() => {
        attempt += 1

        return attempt < 3
            ? Effect.fail(new RequestError({ attempt }))
            : Effect.succeed("ok")
    })

    return yield* Effect.retry(request, Schedule.recurs(3))
})

// Effect.repeat feeds successful outputs into the Schedule.
export const repeat_example = Effect.sync(() => "tick").pipe(
    Effect.repeat(Schedule.recurs(2))
)

// Schedule output can be transformed from its metadata.
export const LabelledAttempts = Schedule.recurs(3).pipe(
    Schedule.map(({ attempt }) => `recurrence ${attempt}`)
)

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Recurs"),
    S.Literal("Backoff"),
    S.Literal("Compose"),
    S.Literal("Run"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Recurs",
    "Backoff",
    "Compose",
    "Run",
]

export const BackoffKind = S.Union([
    S.Literal("Spaced"),
    S.Literal("Exponential"),
    S.Literal("Fibonacci"),
])
export type BackoffKind = typeof BackoffKind.Type

export const ComposeKind = S.Union([S.Literal("Limit"), S.Literal("Concat")])
export type ComposeKind = typeof ComposeKind.Type

export const RunKind = S.Union([S.Literal("Retry"), S.Literal("Repeat")])
export type RunKind = typeof RunKind.Type

export const Model = S.Struct({
    stage: Stage,

    recurrence_limit: S.Number,
    recurrence_step: S.Number,

    backoff_kind: BackoffKind,
    backoff_step: S.Number,

    compose_kind: ComposeKind,
    compose_step: S.Number,

    run_kind: RunKind,
    run_step: S.Number,
})
export type Model = typeof Model.Type

export const SelectedScheduleStage = taggedStruct("SelectedScheduleStage", {
    stage: Stage,
})

export const SelectedRecurrenceLimit = taggedStruct("SelectedRecurrenceLimit", {
    limit: S.Number,
})
export const ClickedAdvanceRecurrence = taggedStruct("ClickedAdvanceRecurrence")
export const ClickedResetRecurrence = taggedStruct("ClickedResetRecurrence")

export const SelectedBackoffKind = taggedStruct("SelectedBackoffKind", {
    kind: BackoffKind,
})
export const ClickedAdvanceBackoff = taggedStruct("ClickedAdvanceBackoff")
export const ClickedResetBackoff = taggedStruct("ClickedResetBackoff")

export const SelectedComposeKind = taggedStruct("SelectedComposeKind", {
    kind: ComposeKind,
})
export const ClickedAdvanceCompose = taggedStruct("ClickedAdvanceCompose")
export const ClickedResetCompose = taggedStruct("ClickedResetCompose")

export const SelectedScheduleRunKind = taggedStruct("SelectedScheduleRunKind", {
    kind: RunKind,
})
export const ClickedAdvanceScheduleRun = taggedStruct(
    "ClickedAdvanceScheduleRun"
)
export const ClickedResetScheduleRun = taggedStruct("ClickedResetScheduleRun")

export const Message = S.Union([
    SelectedScheduleStage,

    SelectedRecurrenceLimit,
    ClickedAdvanceRecurrence,
    ClickedResetRecurrence,

    SelectedBackoffKind,
    ClickedAdvanceBackoff,
    ClickedResetBackoff,

    SelectedComposeKind,
    ClickedAdvanceCompose,
    ClickedResetCompose,

    SelectedScheduleRunKind,
    ClickedAdvanceScheduleRun,
    ClickedResetScheduleRun,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Recurs",

    recurrence_limit: 3,
    recurrence_step: 0,

    backoff_kind: "Exponential",
    backoff_step: 0,

    compose_kind: "Limit",
    compose_step: 0,

    run_kind: "Retry",
    run_step: 0,
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedScheduleStage: ({ stage }) => ({
                model: modifyFields(model, { stage: () => stage }),
                commands: [],
            }),

            SelectedRecurrenceLimit: ({ limit }) => ({
                model: modifyFields(model, {
                    recurrence_limit: () => limit,
                    recurrence_step: () => 0,
                }),
                commands: [],
            }),

            ClickedAdvanceRecurrence: () => ({
                model: modifyFields(model, {
                    recurrence_step: (step) =>
                        Math.min(model.recurrence_limit + 1, step + 1),
                }),
                commands: [],
            }),

            ClickedResetRecurrence: () => ({
                model: modifyFields(model, { recurrence_step: () => 0 }),
                commands: [],
            }),

            SelectedBackoffKind: ({ kind }) => ({
                model: modifyFields(model, {
                    backoff_kind: () => kind,
                    backoff_step: () => 0,
                }),
                commands: [],
            }),

            ClickedAdvanceBackoff: () => ({
                model: modifyFields(model, {
                    backoff_step: (step) => Math.min(5, step + 1),
                }),
                commands: [],
            }),

            ClickedResetBackoff: () => ({
                model: modifyFields(model, { backoff_step: () => 0 }),
                commands: [],
            }),

            SelectedComposeKind: ({ kind }) => ({
                model: modifyFields(model, {
                    compose_kind: () => kind,
                    compose_step: () => 0,
                }),
                commands: [],
            }),

            ClickedAdvanceCompose: () => ({
                model: modifyFields(model, {
                    compose_step: (step) =>
                        Math.min(
                            model.compose_kind === "Limit" ? 4 : 3,
                            step + 1
                        ),
                }),
                commands: [],
            }),

            ClickedResetCompose: () => ({
                model: modifyFields(model, { compose_step: () => 0 }),
                commands: [],
            }),

            SelectedScheduleRunKind: ({ kind }) => ({
                model: modifyFields(model, {
                    run_kind: () => kind,
                    run_step: () => 0,
                }),
                commands: [],
            }),

            ClickedAdvanceScheduleRun: () => ({
                model: modifyFields(model, {
                    run_step: (step) =>
                        Math.min(model.run_kind === "Retry" ? 3 : 3, step + 1),
                }),
                commands: [],
            }),

            ClickedResetScheduleRun: () => ({
                model: modifyFields(model, { run_step: () => 0 }),
                commands: [],
            }),
        })
    )

export const total_executions = (recurrence_limit: number): number =>
    recurrence_limit + 1

export const backoff_delays = (kind: BackoffKind): ReadonlyArray<number> => {
    switch (kind) {
        case "Spaced":
            return [100, 100, 100, 100, 100]
        case "Exponential":
            return [100, 200, 400, 800, 1600]
        case "Fibonacci":
            return [100, 100, 200, 300, 500]
    }
}

export const compose_labels = (kind: ComposeKind): ReadonlyArray<string> =>
    kind === "Limit"
        ? ["initial", "recur 1", "recur 2", "recur 3"]
        : ["quick recurrence", "slow recurrence 1", "slow recurrence 2"]

export const run_events = (
    kind: RunKind
): ReadonlyArray<
    Readonly<{
        label: string
        outcome: "Success" | "Failure"
        schedule_input: string
    }>
> =>
    kind === "Retry"
        ? [
              {
                  label: "request #1",
                  outcome: "Failure",
                  schedule_input: "RequestError(1)",
              },
              {
                  label: "request #2",
                  outcome: "Failure",
                  schedule_input: "RequestError(2)",
              },
              {
                  label: "request #3",
                  outcome: "Success",
                  schedule_input: "— stop retrying —",
              },
          ]
        : [
              {
                  label: "task #1",
                  outcome: "Success",
                  schedule_input: '"tick"',
              },
              {
                  label: "task #2",
                  outcome: "Success",
                  schedule_input: '"tick"',
              },
              {
                  label: "task #3",
                  outcome: "Success",
                  schedule_input: '"tick"',
              },
          ]

export const duration_label = (millis: number): string =>
    Duration.toMillis(Duration.millis(millis)) >= 1000
        ? `${millis / 1000}s`
        : `${millis}ms`

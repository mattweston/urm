import { Clock, Effect, Schema as S } from "effect"
import { TestClock } from "effect/testing"
import { Command, type Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Clock examples
// -----------------------------------------------------------------------------

export const readWallClock = Effect.gen(function* () {
    const millis = yield* Clock.currentTimeMillis
    const nanos = yield* Clock.currentTimeNanos

    return {
        millis,
        nanos,
    }
})

export const measureElapsed = Effect.gen(function* () {
    const start = yield* Clock.monotonicTimeNanos

    yield* Effect.sleep("250 millis")

    const end = yield* Clock.monotonicTimeNanos

    return end - start
})

// Full service access when several operations are needed together.
export const viaClockWith = Clock.clockWith((clock) =>
    Effect.sync(() => ({
        millis: clock.currentTimeMillisUnsafe(),
        nanos: clock.currentTimeNanosUnsafe(),
        monotonic: clock.monotonicTimeNanosUnsafe(),
    }))
)

// A completely deterministic Clock implementation.
export const fixedClock: Clock.Clock = {
    currentTimeMillisUnsafe: () => 1_000,

    currentTimeMillis: Effect.succeed(1_000),

    currentTimeNanosUnsafe: () => 1_000_000_000n,

    currentTimeNanos: Effect.succeed(1_000_000_000n),

    monotonicTimeNanosUnsafe: () => 500_000_000n,

    monotonicTimeNanos: Effect.succeed(500_000_000n),

    // A custom Clock controls sleep semantics too.
    sleep: (_duration) => Effect.void,
}

export const fixedClockProgram = Effect.provideService(
    readWallClock,
    Clock.Clock,
    fixedClock
)

// TestClock owns deterministic test time and scheduled sleeps.
export const testClockSketch = Effect.gen(function* () {
    const before = yield* Clock.currentTimeMillis

    const sleeper = yield* Effect.sleep("5 seconds").pipe(
        Effect.as("woke"),
        Effect.forkChild
    )

    yield* TestClock.adjust("5 seconds")

    const after = yield* Clock.currentTimeMillis

    return {
        before,
        after,
        sleeper,
    }
}).pipe(Effect.provide(TestClock.layer()))

// -----------------------------------------------------------------------------
// Foldkit teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Wall", "Monotonic", "Sleep", "Test"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Wall",
    "Monotonic",
    "Sleep",
    "Test",
]

export const TestStep = S.Union([
    S.Literal(0),
    S.Literal(1),
    S.Literal(2),
    S.Literal(3),
])
export type TestStep = typeof TestStep.Type

export const Model = S.Struct({
    stage: Stage,

    wallMillis: S.Number,
    wallNanos: S.String,

    elapsedNanos: S.String,
    elapsedStatus: S.String,

    sleepStartedAt: S.Number,
    sleepFinishedAt: S.Number,
    sleepStatus: S.String,

    fixedClockMillis: S.Number,
    fixedClockNanos: S.String,

    testStep: TestStep,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedClockStage: {
        stage: Stage,
    },

    ClickedReadWallClock: {},
    CompletedReadWallClock: {
        millis: S.Number,
        nanos: S.String,
    },

    ClickedMeasureElapsed: {},
    CompletedMeasureElapsed: {
        elapsedNanos: S.String,
    },

    ClickedSleep: {},
    CompletedSleep: {
        startedAt: S.Number,
        finishedAt: S.Number,
    },

    ClickedReadFixedClock: {},
    CompletedReadFixedClock: {
        millis: S.Number,
        nanos: S.String,
    },

    ClickedAdvanceTestClock: {},
    ClickedResetTestClock: {},

    ClickedResetClockDemo: {},
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Wall",

    wallMillis: 0,
    wallNanos: "—",

    elapsedNanos: "—",
    elapsedStatus: "ready",

    sleepStartedAt: 0,
    sleepFinishedAt: 0,
    sleepStatus: "ready",

    fixedClockMillis: 0,
    fixedClockNanos: "—",

    testStep: 0,
})

// -----------------------------------------------------------------------------
// Real Commands
// -----------------------------------------------------------------------------

export const ReadWallClock = Command.define("ReadWallClock", {
    messages: [Message.CompletedReadWallClock],

    execute: Effect.gen(function* () {
        const millis = yield* Clock.currentTimeMillis
        const nanos = yield* Clock.currentTimeNanos

        return Message.CompletedReadWallClock({
            millis,
            nanos: nanos.toString(),
        })
    }),
})

export const MeasureElapsed = Command.define("MeasureElapsed", {
    messages: [Message.CompletedMeasureElapsed],

    execute: Effect.gen(function* () {
        const start = yield* Clock.monotonicTimeNanos

        yield* Effect.sleep("250 millis")

        const end = yield* Clock.monotonicTimeNanos

        return Message.CompletedMeasureElapsed({
            elapsedNanos: (end - start).toString(),
        })
    }),
})

export const SleepDemo = Command.define("SleepDemo", {
    messages: [Message.CompletedSleep],

    execute: Effect.gen(function* () {
        const startedAt = yield* Clock.currentTimeMillis

        yield* Effect.sleep("750 millis")

        const finishedAt = yield* Clock.currentTimeMillis

        return Message.CompletedSleep({
            startedAt,
            finishedAt,
        })
    }),
})

export const ReadFixedClock = Command.define("ReadFixedClock", {
    messages: [Message.CompletedReadFixedClock],

    execute: Effect.gen(function* () {
        const result = yield* fixedClockProgram

        return Message.CompletedReadFixedClock({
            millis: result.millis,
            nanos: result.nanos.toString(),
        })
    }),
})

type UpdateReturn = Update.Return<Model, Message>

const nextTestStep = (step: TestStep): TestStep =>
    step === 0 ? 1 : step === 1 ? 2 : step === 2 ? 3 : 3

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedClockStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        ClickedReadWallClock: () => ({
            model,
            commands: [ReadWallClock()],
        }),

        CompletedReadWallClock: ({ millis, nanos }) => ({
            model: evo(model, {
                wallMillis: () => millis,
                wallNanos: () => nanos,
            }),
        }),

        ClickedMeasureElapsed: () => ({
            model: evo(model, {
                elapsedStatus: () => "measuring 250ms sleep…",
            }),
            commands: [MeasureElapsed()],
        }),

        CompletedMeasureElapsed: ({ elapsedNanos }) => ({
            model: evo(model, {
                elapsedNanos: () => elapsedNanos,
                elapsedStatus: () => "completed",
            }),
        }),

        ClickedSleep: () => ({
            model: evo(model, {
                sleepStatus: () => "sleeping 750ms…",
            }),
            commands: [SleepDemo()],
        }),

        CompletedSleep: ({ startedAt, finishedAt }) => ({
            model: evo(model, {
                sleepStartedAt: () => startedAt,
                sleepFinishedAt: () => finishedAt,
                sleepStatus: () => "completed",
            }),
        }),

        ClickedReadFixedClock: () => ({
            model,
            commands: [ReadFixedClock()],
        }),

        CompletedReadFixedClock: ({ millis, nanos }) => ({
            model: evo(model, {
                fixedClockMillis: () => millis,
                fixedClockNanos: () => nanos,
            }),
        }),

        ClickedAdvanceTestClock: () => ({
            model: evo(model, {
                testStep: nextTestStep,
            }),
        }),

        ClickedResetTestClock: () => ({
            model: evo(model, {
                testStep: () => 0,
            }),
        }),

        ClickedResetClockDemo: () => ({
            model: init,
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const wallFacts = (
    model: Model
): ReadonlyArray<readonly [string, string]> => [
    [
        "currentTimeMillis",
        model.wallMillis === 0 ? "not read yet" : String(model.wallMillis),
    ],
    ["currentTimeNanos", model.wallNanos],
    ["meaning", "Unix wall-clock timestamp"],
    ["warning", "can jump when system clock is corrected"],
]

export const monotonicFacts = (
    model: Model
): ReadonlyArray<readonly [string, string]> => [
    ["API", "Clock.monotonicTimeNanos"],
    [
        "elapsed",
        model.elapsedNanos === "—"
            ? "not measured"
            : `${model.elapsedNanos} ns`,
    ],
    ["status", model.elapsedStatus],
    ["meaning", "subtract two readings from the same clock"],
]

export const sleepFacts = (
    model: Model
): ReadonlyArray<readonly [string, string]> => [
    ["API", 'Effect.sleep("750 millis")'],
    [
        "started",
        model.sleepStartedAt === 0 ? "—" : String(model.sleepStartedAt),
    ],
    [
        "finished",
        model.sleepFinishedAt === 0 ? "—" : String(model.sleepFinishedAt),
    ],
    ["status", model.sleepStatus],
]

export const testClockSteps = (): ReadonlyArray<
    Readonly<{
        title: string
        detail: string
    }>
> => [
    {
        title: "1 · install TestClock",
        detail: "Effect.provide(program, TestClock.layer())",
    },
    {
        title: "2 · fork sleeper",
        detail: 'Effect.sleep("5 seconds") does not wait in real time',
    },
    {
        title: "3 · adjust time",
        detail: 'TestClock.adjust("5 seconds") runs due sleepers',
    },
    {
        title: "4 · assert",
        detail: "Clock time advanced deterministically; test completes immediately",
    },
]

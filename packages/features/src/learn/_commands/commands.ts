import { Effect, Schema as S } from "effect"
import { Command, type Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { defineTaggedUnion } from "foldkit/schema"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Foldkit Commands
// -----------------------------------------------------------------------------

export const WeatherState = defineTaggedUnion({
    Idle: {},
    Loading: {
        zipCode: S.String,
    },
    Success: {
        zipCode: S.String,
        temperatureF: S.Number,
    },
    Failure: {
        zipCode: S.String,
        error: S.String,
    },
})
export type WeatherState = typeof WeatherState.Type

export const JobState = defineTaggedUnion({
    Idle: {},
    Running: {
        jobId: S.Number,
    },
    Cancelling: {
        jobId: S.Number,
    },
    Cancelled: {
        jobId: S.Number,
    },
    Completed: {
        jobId: S.Number,
    },
})
export type JobState = typeof JobState.Type

export const Stage = S.Literals(["OneShot", "Args", "Test", "Interrupt"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "OneShot",
    "Args",
    "Test",
    "Interrupt",
]

export const ZipCode = S.Literals(["90210", "10001", "00000"])
export type ZipCode = typeof ZipCode.Type

export const Model = S.Struct({
    stage: Stage,

    count: S.Number,
    resetPending: S.Boolean,

    zipCode: ZipCode,
    weather: WeatherState,

    testZipCode: ZipCode,
    testStep: S.Number,

    jobId: S.Number,
    job: JobState,
    lastInterruptOutcome: S.String,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedCommandsStage: {
        stage: Stage,
    },

    ClickedResetAfterDelay: {},
    CompletedDelayReset: {},

    SelectedZipCode: {
        zipCode: ZipCode,
    },
    ClickedLookupWeather: {},
    SucceededLookupWeather: {
        zipCode: S.String,
        temperatureF: S.Number,
    },
    FailedLookupWeather: {
        zipCode: S.String,
        error: S.String,
    },

    SelectedTestZipCode: {
        zipCode: ZipCode,
    },
    ClickedAdvanceCommandTest: {},
    ClickedResetCommandTest: {},

    ClickedStartLongTask: {},
    ClickedCancelLongTask: {},
    CompletedLongTask: {
        jobId: S.Number,
    },
    CompletedCancelLongTask: {
        jobId: S.Number,
        outcome: Command.Interruptible.Outcome,
    },

    ClickedResetCommandsDemo: {},
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "OneShot",

    count: 5,
    resetPending: false,

    zipCode: "90210",
    weather: WeatherState.Idle(),

    testZipCode: "90210",
    testStep: 0,

    jobId: 7,
    job: JobState.Idle(),
    lastInterruptOutcome: "none",
})

// -----------------------------------------------------------------------------
// 1. One-shot Command with no args
// -----------------------------------------------------------------------------

export const DelayReset = Command.define("DelayReset", {
    messages: [Message.CompletedDelayReset],

    execute: Effect.sleep("900 millis").pipe(
        Effect.as(Message.CompletedDelayReset())
    ),
})

// -----------------------------------------------------------------------------
// 2. Command with args and explicit success / failure Messages
//
// This demo intentionally uses a deterministic fake lookup so the downloaded
// lesson works without an external service. Replace this Effect with HttpClient
// in a real application; the Command shape stays the same.
// -----------------------------------------------------------------------------

export const LookupWeather = Command.define("LookupWeather", {
    args: {
        zipCode: S.String,
    },

    messages: [Message.SucceededLookupWeather, Message.FailedLookupWeather],

    execute: ({ zipCode }) =>
        Effect.gen(function* () {
            yield* Effect.sleep("650 millis")

            if (zipCode === "00000") {
                return Message.FailedLookupWeather({
                    zipCode,
                    error: "Weather service rejected this demo ZIP",
                })
            }

            const temperatureF = zipCode === "90210" ? 78 : 64

            return Message.SucceededLookupWeather({
                zipCode,
                temperatureF,
            })
        }),
})

// -----------------------------------------------------------------------------
// 3. Interruptible Command keyed by a Model identity
// -----------------------------------------------------------------------------

export const LongTask = Command.define("LongTask", {
    args: {
        jobId: S.Number,
    },

    messages: [Message.CompletedLongTask],

    interrupt: {
        keyFields: ["jobId"],
        toKey: ({ jobId }) => String(jobId),
    },

    execute: ({ jobId }) =>
        Effect.sleep("4 seconds").pipe(
            Effect.as(
                Message.CompletedLongTask({
                    jobId,
                })
            )
        ),
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedCommandsStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        // update does not sleep. It only returns DelayReset as data.
        ClickedResetAfterDelay: () => ({
            model: evo(model, {
                resetPending: () => true,
            }),
            commands: [DelayReset()],
        }),

        // Runtime executes DelayReset, then dispatches this fact.
        CompletedDelayReset: () => ({
            model: evo(model, {
                count: () => 0,
                resetPending: () => false,
            }),
        }),

        SelectedZipCode: ({ zipCode }) => ({
            model: evo(model, {
                zipCode: () => zipCode,
            }),
        }),

        ClickedLookupWeather: () => ({
            model: evo(model, {
                weather: () =>
                    WeatherState.Loading({
                        zipCode: model.zipCode,
                    }),
            }),
            commands: [
                LookupWeather({
                    zipCode: model.zipCode,
                }),
            ],
        }),

        SucceededLookupWeather: ({ zipCode, temperatureF }) => ({
            model: evo(model, {
                weather: () =>
                    WeatherState.Success({
                        zipCode,
                        temperatureF,
                    }),
            }),
        }),

        FailedLookupWeather: ({ zipCode, error }) => ({
            model: evo(model, {
                weather: () =>
                    WeatherState.Failure({
                        zipCode,
                        error,
                    }),
            }),
        }),

        SelectedTestZipCode: ({ zipCode }) => ({
            model: evo(model, {
                testZipCode: () => zipCode,
                testStep: () => 0,
            }),
        }),

        ClickedAdvanceCommandTest: () => ({
            model: evo(model, {
                testStep: (step) => Math.min(4, step + 1),
            }),
        }),

        ClickedResetCommandTest: () => ({
            model: evo(model, {
                testStep: () => 0,
            }),
        }),

        ClickedStartLongTask: () => ({
            model: evo(model, {
                job: () =>
                    JobState.Running({
                        jobId: model.jobId,
                    }),
                lastInterruptOutcome: () => "none",
            }),
            commands: [
                LongTask({
                    jobId: model.jobId,
                }),
            ],
        }),

        ClickedCancelLongTask: () =>
            JobState.match<UpdateReturn>(model.job, {
                Idle: () => ({
                    model,
                }),

                Running: ({ jobId }) => ({
                    model: evo(model, {
                        job: () =>
                            JobState.Cancelling({
                                jobId,
                            }),
                    }),
                    commands: [
                        LongTask.Interrupt(
                            {
                                jobId,
                            },
                            (outcome) =>
                                Message.CompletedCancelLongTask({
                                    jobId,
                                    outcome,
                                })
                        ),
                    ],
                }),

                Cancelling: () => ({
                    model,
                }),

                Cancelled: () => ({
                    model,
                }),

                Completed: () => ({
                    model,
                }),
            }),

        CompletedLongTask: ({ jobId }) => ({
            model: evo(model, {
                job: () =>
                    JobState.Completed({
                        jobId,
                    }),
            }),
        }),

        CompletedCancelLongTask: ({ jobId, outcome }) =>
            Command.Interruptible.Outcome.match<UpdateReturn>(outcome, {
                Interrupted: () => ({
                    model: evo(model, {
                        job: () =>
                            JobState.Cancelled({
                                jobId,
                            }),
                        lastInterruptOutcome: () => "Interrupted",
                    }),
                }),

                NotFound: () => ({
                    model: evo(model, {
                        lastInterruptOutcome: () => "NotFound",
                    }),
                }),
            }),

        ClickedResetCommandsDemo: () => ({
            model: init,
        }),
    })

// -----------------------------------------------------------------------------
// Pure helpers for the visual lesson
// -----------------------------------------------------------------------------

export const oneShotFlow = (
    model: Model
): ReadonlyArray<
    Readonly<{
        label: string
        value: string
        active: boolean
    }>
> => [
    {
        label: "Message",
        value: "ClickedResetAfterDelay",
        active: true,
    },
    {
        label: "update return",
        value: "commands: [DelayReset()]",
        active: model.resetPending,
    },
    {
        label: "runtime",
        value: "sleep 900ms",
        active: model.resetPending,
    },
    {
        label: "result Message",
        value: "CompletedDelayReset",
        active: model.count === 0 && !model.resetPending,
    },
]

export const weatherLabel = (state: WeatherState): string =>
    WeatherState.match(state, {
        Idle: () => "Idle",
        Loading: ({ zipCode }) => `Loading ${zipCode}…`,
        Success: ({ zipCode, temperatureF }) =>
            `${zipCode} → ${temperatureF}°F`,
        Failure: ({ zipCode, error }) => `${zipCode} → ${error}`,
    })

export const commandInstance = (zipCode: ZipCode) => {
    const command = LookupWeather({
        zipCode,
    })

    return {
        name: command.name,
        args: command.args,
        hasEffect: command.effect !== undefined,
    }
}

export const testSteps = (
    zipCode: ZipCode
): ReadonlyArray<
    Readonly<{
        title: string
        detail: string
    }>
> => {
    const resultMessage =
        zipCode === "00000"
            ? Message.FailedLookupWeather({
                  zipCode,
                  error: "Weather service rejected this demo ZIP",
              })
            : Message.SucceededLookupWeather({
                  zipCode,
                  temperatureF: zipCode === "90210" ? 78 : 64,
              })

    return [
        {
            title: "1 · dispatch Message",
            detail: "ClickedLookupWeather",
        },
        {
            title: "2 · inspect returned Command",
            detail: `LookupWeather({ zipCode: "${zipCode}" })`,
        },
        {
            title: "3 · expect exact Command",
            detail: `Command.expectExact(LookupWeather({ zipCode: "${zipCode}" }))`,
        },
        {
            title: "4 · resolve without running Effect",
            detail: `Command.resolve(LookupWeather, ${resultMessage._tag}(...))`,
        },
    ]
}

export const jobLabel = (job: JobState): string =>
    JobState.match(job, {
        Idle: () => "Idle",
        Running: ({ jobId }) => `Running job ${jobId}`,
        Cancelling: ({ jobId }) => `Cancelling job ${jobId}`,
        Cancelled: ({ jobId }) => `Cancelled job ${jobId}`,
        Completed: ({ jobId }) => `Completed job ${jobId}`,
    })

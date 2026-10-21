import { Context, Data, Effect, Layer, Match as M, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 examples
// -----------------------------------------------------------------------------

export class Config extends Context.Service<
    Config,
    {
        readonly prefix: string
    }
>()("learn/Effect/Config") {}

export class ParseError extends Data.TaggedError("ParseError")<{
    readonly input: string
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
    readonly age: number
}> {}

export class RequestError extends Data.TaggedError("RequestError")<{
    readonly cause: unknown
}> {}

export const ConfigLive = Layer.succeed(Config, {
    prefix: "[demo] ",
})

// -----------------------------------------------------------------------------
// A / E / R channels
// -----------------------------------------------------------------------------

export const pure_value = Effect.succeed(42)
// Effect<number, never, never>

export const typed_failure = Effect.fail(new ParseError({ input: "oops" }))
// Effect<never, ParseError, never>

export const needs_config = Effect.gen(function* () {
    const config = yield* Config
    return `${config.prefix}ready`
})
// Effect<string, never, Config>

export const needs_config_and_can_fail = Effect.gen(function* () {
    const config = yield* Config

    const age = yield* Effect.fail(new ParseError({ input: "oops" }))

    return `${config.prefix}${age}`
})
// Effect<never, ParseError, Config>

// -----------------------------------------------------------------------------
// Constructors: descriptions are lazy until a runtime executes them
// -----------------------------------------------------------------------------

export const succeed_example = Effect.succeed(42)

export const sync_example = Effect.sync(() => {
    return "computed when run"
})

export const parse_json = (input: string) =>
    Effect.try({
        try: () => JSON.parse(input) as unknown,
        catch: () => new ParseError({ input }),
    })

export const async_value = Effect.promise(() => Promise.resolve("async ok"))

export const async_request = Effect.tryPromise({
    try: () => Promise.resolve({ ok: true }),
    catch: (cause) => new RequestError({ cause }),
})

// -----------------------------------------------------------------------------
// Composition
// -----------------------------------------------------------------------------

export const parse_age = (input: string): Effect.Effect<number, ParseError> =>
    Effect.try({
        try: () => {
            const value = Number(input)
            if (!Number.isFinite(value)) {
                throw new Error("not finite")
            }
            return value
        },
        catch: () => new ParseError({ input }),
    })

export const validate_age = (
    age: number
): Effect.Effect<number, ValidationError> =>
    age >= 18 ? Effect.succeed(age) : Effect.fail(new ValidationError({ age }))

export const composed_with_pipe = Effect.succeed("36").pipe(
    Effect.flatMap(parse_age),
    Effect.flatMap(validate_age),
    Effect.map((age) => `age:${age}`)
)
// Effect<string, ParseError | ValidationError, never>

export const composed_with_gen = Effect.gen(function* () {
    const age = yield* parse_age("36")
    const validAge = yield* validate_age(age)

    return `age:${validAge}`
})

export const combined = Effect.all({
    user: Effect.succeed("Ada"),
    age: parse_age("36"),
})
// Effect<{ user: string; age: number }, ParseError, never>

// -----------------------------------------------------------------------------
// Recovery, services, and execution boundaries
// -----------------------------------------------------------------------------

export const make_program = (input: string) =>
    Effect.gen(function* () {
        const config = yield* Config
        const age = yield* parse_age(input)

        return `${config.prefix}age:${age}`
    })
// Effect<string, ParseError, Config>

export const recovered_program = (input: string) =>
    make_program(input).pipe(
        Effect.catchTag("ParseError", () => Effect.succeed("fallback age"))
    )
// Effect<string, never, Config>

export const runnable_program = (input: string) =>
    recovered_program(input).pipe(Effect.provide(ConfigLive))
// Effect<string, never, never>

export const run_as_promise = (input: string) =>
    Effect.runPromise(runnable_program(input))
// Promise<string>

export const run_as_exit = (input: string) =>
    Effect.runPromiseExit(runnable_program(input))
// Promise<Exit<string, never>>

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Channels"),
    S.Literal("Build"),
    S.Literal("Compose"),
    S.Literal("Run"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Channels",
    "Build",
    "Compose",
    "Run",
]

export const ChannelCase = S.Union([
    S.Literal("Pure"),
    S.Literal("Failure"),
    S.Literal("Service"),
    S.Literal("Both"),
])
export type ChannelCase = typeof ChannelCase.Type

export const BuildMode = S.Union([
    S.Literal("Succeed"),
    S.Literal("Sync"),
    S.Literal("Try"),
    S.Literal("TryPromise"),
])
export type BuildMode = typeof BuildMode.Type

export const ComposeMode = S.Union([
    S.Literal("Map"),
    S.Literal("FlatMap"),
    S.Literal("Gen"),
    S.Literal("All"),
])
export type ComposeMode = typeof ComposeMode.Type

export const ComposeInput = S.Union([
    S.Literal("36"),
    S.Literal("15"),
    S.Literal("oops"),
])
export type ComposeInput = typeof ComposeInput.Type

export const RunInput = S.Union([S.Literal("36"), S.Literal("oops")])
export type RunInput = typeof RunInput.Type

export const Model = S.Struct({
    stage: Stage,

    channel_case: ChannelCase,

    build_mode: BuildMode,
    build_has_run: S.Boolean,
    build_valid_input: S.Boolean,

    compose_mode: ComposeMode,
    compose_input: ComposeInput,

    run_input: RunInput,
    run_step: S.Number,
})
export type Model = typeof Model.Type

export const SelectedEffectStage = taggedStruct("SelectedEffectStage", {
    stage: Stage,
})

export const SelectedEffectChannelCase = taggedStruct(
    "SelectedEffectChannelCase",
    { channel_case: ChannelCase }
)

export const SelectedEffectBuildMode = taggedStruct("SelectedEffectBuildMode", {
    build_mode: BuildMode,
})

export const ClickedRunEffectConstructor = taggedStruct(
    "ClickedRunEffectConstructor"
)

export const ClickedResetEffectConstructor = taggedStruct(
    "ClickedResetEffectConstructor"
)

export const ToggledEffectBuildInput = taggedStruct("ToggledEffectBuildInput")

export const SelectedEffectComposeMode = taggedStruct(
    "SelectedEffectComposeMode",
    { compose_mode: ComposeMode }
)

export const SelectedEffectComposeInput = taggedStruct(
    "SelectedEffectComposeInput",
    { compose_input: ComposeInput }
)

export const SelectedEffectRunInput = taggedStruct("SelectedEffectRunInput", {
    run_input: RunInput,
})

export const ClickedAdvanceEffectRun = taggedStruct("ClickedAdvanceEffectRun")

export const ClickedResetEffectRun = taggedStruct("ClickedResetEffectRun")

export const Message = S.Union([
    SelectedEffectStage,

    SelectedEffectChannelCase,

    SelectedEffectBuildMode,
    ClickedRunEffectConstructor,
    ClickedResetEffectConstructor,
    ToggledEffectBuildInput,

    SelectedEffectComposeMode,
    SelectedEffectComposeInput,

    SelectedEffectRunInput,
    ClickedAdvanceEffectRun,
    ClickedResetEffectRun,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Channels",

    channel_case: "Both",

    build_mode: "Sync",
    build_has_run: false,
    build_valid_input: true,

    compose_mode: "Gen",
    compose_input: "36",

    run_input: "oops",
    run_step: 0,
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedEffectStage: ({ stage }) => ({
                model: evo(model, {
                    stage: () => stage,
                }),
                commands: [],
            }),

            SelectedEffectChannelCase: ({ channel_case }) => ({
                model: evo(model, {
                    channel_case: () => channel_case,
                }),
                commands: [],
            }),

            SelectedEffectBuildMode: ({ build_mode }) => ({
                model: evo(model, {
                    build_mode: () => build_mode,
                    build_has_run: () => false,
                }),
                commands: [],
            }),

            ClickedRunEffectConstructor: () => ({
                model: evo(model, {
                    build_has_run: () => true,
                }),
                commands: [],
            }),

            ClickedResetEffectConstructor: () => ({
                model: evo(model, {
                    build_has_run: () => false,
                }),
                commands: [],
            }),

            ToggledEffectBuildInput: () => ({
                model: evo(model, {
                    build_valid_input: (value) => !value,
                    build_has_run: () => false,
                }),
                commands: [],
            }),

            SelectedEffectComposeMode: ({ compose_mode }) => ({
                model: evo(model, {
                    compose_mode: () => compose_mode,
                }),
                commands: [],
            }),

            SelectedEffectComposeInput: ({ compose_input }) => ({
                model: evo(model, {
                    compose_input: () => compose_input,
                }),
                commands: [],
            }),

            SelectedEffectRunInput: ({ run_input }) => ({
                model: evo(model, {
                    run_input: () => run_input,
                    run_step: () => 0,
                }),
                commands: [],
            }),

            ClickedAdvanceEffectRun: () => ({
                model: evo(model, {
                    run_step: (step) => Math.min(4, step + 1),
                }),
                commands: [],
            }),

            ClickedResetEffectRun: () => ({
                model: evo(model, {
                    run_step: () => 0,
                }),
                commands: [],
            }),
        })
    )

export const channel_type = (
    channel_case: ChannelCase
): Readonly<{
    code: string
    success: string
    error: string
    services: string
}> => {
    switch (channel_case) {
        case "Pure":
            return {
                code: "Effect.succeed(42)",
                success: "number",
                error: "never",
                services: "never",
            }

        case "Failure":
            return {
                code: "Effect.fail(new ParseError(...))",
                success: "never",
                error: "ParseError",
                services: "never",
            }

        case "Service":
            return {
                code: "Effect.gen(... yield* Config ...)",
                success: "string",
                error: "never",
                services: "Config",
            }

        case "Both":
            return {
                code: "Effect<string, ParseError, Config>",
                success: "string",
                error: "ParseError",
                services: "Config",
            }
    }
}

export const build_description = (
    model: Model
): Readonly<{
    code: string
    before: string
    after: string
    detail: string
    failed: boolean
}> => {
    const valid = model.build_valid_input

    switch (model.build_mode) {
        case "Succeed":
            return {
                code: "Effect.succeed(42)",
                before: "Success value stored in an Effect description.",
                after: model.build_has_run ? "42" : "not executed",
                detail: "succeed is already pure: there is no thunk to evaluate.",
                failed: false,
            }

        case "Sync":
            return {
                code: 'Effect.sync(() => "computed")',
                before: "Thunk has not run yet.",
                after: model.build_has_run
                    ? '"computed"'
                    : "thunk not evaluated",
                detail: "sync defers a synchronous side effect until the Effect is executed.",
                failed: false,
            }

        case "Try":
            return {
                code: "Effect.try(() => JSON.parse(input))",
                before: "Throwing code has not run yet.",
                after: !model.build_has_run
                    ? "parser not evaluated"
                    : valid
                      ? 'Success({ "ok": true })'
                      : "Failure(ParseError)",
                detail: "try catches synchronous throws and moves them into the typed error channel.",
                failed: model.build_has_run && !valid,
            }

        case "TryPromise":
            return {
                code: "Effect.tryPromise({ try, catch })",
                before: "Promise thunk has not run yet.",
                after: !model.build_has_run
                    ? "promise not started"
                    : valid
                      ? 'Success({ "ok": true })'
                      : "Failure(RequestError)",
                detail: "tryPromise starts the promise only when run and maps rejection / throws into E.",
                failed: model.build_has_run && !valid,
            }
    }
}

export const compose_output = (
    model: Model
): Readonly<{
    type: string
    output: string
    failed: boolean
    detail: string
}> => {
    const input = model.compose_input

    const parsed = Number(input)

    const parseFailed = !Number.isFinite(parsed)

    const validationFailed = !parseFailed && parsed < 18

    const failed = parseFailed || validationFailed

    const finalOutput = parseFailed
        ? "Failure(ParseError)"
        : validationFailed
          ? "Failure(ValidationError)"
          : model.compose_mode === "All"
            ? `Success({ user: "Ada", age: ${parsed} })`
            : `Success("age:${parsed}")`

    switch (model.compose_mode) {
        case "Map":
            return {
                type: "Effect<string, never, never>",
                output: `Success("age:${input}")`,
                failed: false,
                detail: "map transforms A only. The callback cannot introduce a new Effect error or service requirement.",
            }

        case "FlatMap":
            return {
                type: "Effect<string, ParseError | ValidationError, never>",
                output: finalOutput,
                failed,
                detail: "flatMap sequences an Effect-returning function, so new E and R channels are merged into the program type.",
            }

        case "Gen":
            return {
                type: "Effect<string, ParseError | ValidationError, never>",
                output: finalOutput,
                failed,
                detail: "Effect.gen is sequential flatMap-style composition with yield* syntax and automatic E/R accumulation.",
            }

        case "All":
            return {
                type: "Effect<{ user: string; age: number }, ParseError, never>",
                output: parseFailed
                    ? "Failure(ParseError)"
                    : `Success({ user: "Ada", age: ${parsed} })`,
                failed: parseFailed,
                detail: "Effect.all combines independent Effects into one tuple/struct and merges their error/service channels.",
            }
    }
}

export const run_stage = (
    model: Model
): ReadonlyArray<
    Readonly<{
        label: string
        type: string
        value: string
        detail: string
    }>
> => {
    const invalid = model.run_input === "oops"

    return [
        {
            label: "raw",
            type: "Effect<string, ParseError, Config>",
            value: invalid
                ? "would fail ParseError"
                : 'would succeed "[demo] age:36"',
            detail: "Program still has a typed error and a Config requirement.",
        },
        {
            label: "catchTag",
            type: "Effect<string, never, Config>",
            value: invalid ? 'recovered → "fallback age"' : "success unchanged",
            detail: "catchTag handles ParseError, removing that handled error from E.",
        },
        {
            label: "provide",
            type: "Effect<string, never, never>",
            value: "ConfigLive supplied",
            detail: "Effect.provide supplies the service and removes Config from R.",
        },
        {
            label: "runPromiseExit",
            type: "Promise<Exit<string, never>>",
            value: invalid
                ? 'Exit.Success("fallback age")'
                : 'Exit.Success("[demo] age:36")',
            detail: "The runtime executes the fully provided Effect. runPromiseExit resolves with Exit rather than rejecting on typed failure.",
        },
    ]
}

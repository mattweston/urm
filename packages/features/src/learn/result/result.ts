import { Match as M, Option, pipe, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Result examples
// -----------------------------------------------------------------------------

export const success = Result.succeed(42)
export const failure = Result.fail("not found")

// Convert nullish / optional input into Result.
export const from_some = Result.fromOption(
    Option.some("Ada"),
    () => "missing user"
)

export const from_none = Result.fromOption(
    Option.none<string>(),
    () => "missing user"
)

// Safely capture synchronous exceptions.
export const parsed_ok = Result.try({
    try: () => JSON.parse('{"name":"Ada"}') as unknown,
    catch: () => "invalid json",
})

export const parsed_bad = Result.try({
    try: () => JSON.parse("not json") as unknown,
    catch: () => "invalid json",
})

// Transform either channel independently.
export const mapped_success = pipe(
    Result.succeed(3),
    Result.map((n) => n * 2)
)

export const mapped_error = pipe(
    Result.fail("not found"),
    Result.mapError((error) => `User lookup failed: ${error}`)
)

// flatMap sequences another computation that may fail.
export const positive = (n: number) =>
    n > 0 ? Result.succeed(n) : Result.fail(`${n} is not positive`)

export const doubled_positive = pipe(
    Result.succeed(5),
    Result.flatMap(positive),
    Result.map((n) => n * 2)
)

// Match collapses both branches to one plain value.
export const formatted_success = Result.match(Result.succeed(42), {
    onSuccess: (value) => `value: ${value}`,
    onFailure: (error: string) => `error: ${error}`,
})

export const formatted_failure = Result.match(Result.fail("timeout"), {
    onSuccess: (value: number) => `value: ${value}`,
    onFailure: (error) => `error: ${error}`,
})

// getOrElse unwraps success or supplies a fallback.
export const fallback = Result.getOrElse(Result.fail("missing"), () => 0)

// all collects independent Results and fails on the first Failure.
export const combined_success = Result.all({
    user: Result.succeed("Ada"),
    age: Result.succeed(36),
})

export const combined_failure = Result.all({
    user: Result.succeed("Ada"),
    age: Result.fail("age unavailable"),
})

// Result.gen gives yield* syntax, but remains eager and synchronous.
export const generated = Result.gen(function* () {
    const user = yield* Result.succeed("Ada")
    const age = yield* Result.succeed(36)

    return `${user} is ${age}`
})

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Construct"),
    S.Literal("Transform"),
    S.Literal("Recover"),
    S.Literal("Combine"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Construct",
    "Transform",
    "Recover",
    "Combine",
]

export const ConstructMode = S.Union([
    S.Literal("Success"),
    S.Literal("Failure"),
    S.Literal("Option"),
    S.Literal("Try"),
])
export type ConstructMode = typeof ConstructMode.Type

export const TransformInput = S.Union([
    S.Literal("Positive"),
    S.Literal("Negative"),
])
export type TransformInput = typeof TransformInput.Type

export const RecoverMode = S.Union([
    S.Literal("Match"),
    S.Literal("Fallback"),
    S.Literal("MapError"),
])
export type RecoverMode = typeof RecoverMode.Type

export const CombineMode = S.Union([S.Literal("All"), S.Literal("Gen")])
export type CombineMode = typeof CombineMode.Type

export const Model = S.Struct({
    stage: Stage,

    construct_mode: ConstructMode,
    option_present: S.Boolean,
    try_valid_json: S.Boolean,

    transform_input: TransformInput,
    transform_step: S.Number,

    recover_mode: RecoverMode,
    recover_success: S.Boolean,

    combine_mode: CombineMode,
    combine_age_ok: S.Boolean,
})
export type Model = typeof Model.Type

export const SelectedResultStage = taggedStruct("SelectedResultStage", {
    stage: Stage,
})

export const SelectedResultConstructMode = taggedStruct(
    "SelectedResultConstructMode",
    { mode: ConstructMode }
)
export const ClickedToggleResultOption = taggedStruct(
    "ClickedToggleResultOption"
)
export const ClickedToggleResultTryJson = taggedStruct(
    "ClickedToggleResultTryJson"
)

export const SelectedResultTransformInput = taggedStruct(
    "SelectedResultTransformInput",
    { input: TransformInput }
)
export const ClickedAdvanceResultTransform = taggedStruct(
    "ClickedAdvanceResultTransform"
)
export const ClickedResetResultTransform = taggedStruct(
    "ClickedResetResultTransform"
)

export const SelectedResultRecoverMode = taggedStruct(
    "SelectedResultRecoverMode",
    { mode: RecoverMode }
)
export const ClickedToggleResultRecoverBranch = taggedStruct(
    "ClickedToggleResultRecoverBranch"
)

export const SelectedResultCombineMode = taggedStruct(
    "SelectedResultCombineMode",
    { mode: CombineMode }
)
export const ClickedToggleResultCombineAge = taggedStruct(
    "ClickedToggleResultCombineAge"
)

export const Message = S.Union([
    SelectedResultStage,

    SelectedResultConstructMode,
    ClickedToggleResultOption,
    ClickedToggleResultTryJson,

    SelectedResultTransformInput,
    ClickedAdvanceResultTransform,
    ClickedResetResultTransform,

    SelectedResultRecoverMode,
    ClickedToggleResultRecoverBranch,

    SelectedResultCombineMode,
    ClickedToggleResultCombineAge,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Construct",

    construct_mode: "Success",
    option_present: true,
    try_valid_json: true,

    transform_input: "Positive",
    transform_step: 0,

    recover_mode: "Match",
    recover_success: false,

    combine_mode: "All",
    combine_age_ok: true,
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedResultStage: ({ stage }) => ({
                model: modifyFields(model, { stage: () => stage }),
                commands: [],
            }),

            SelectedResultConstructMode: ({ mode }) => ({
                model: modifyFields(model, { construct_mode: () => mode }),
                commands: [],
            }),

            ClickedToggleResultOption: () => ({
                model: modifyFields(model, {
                    option_present: (present) => !present,
                }),
                commands: [],
            }),

            ClickedToggleResultTryJson: () => ({
                model: modifyFields(model, {
                    try_valid_json: (valid) => !valid,
                }),
                commands: [],
            }),

            SelectedResultTransformInput: ({ input }) => ({
                model: modifyFields(model, {
                    transform_input: () => input,
                    transform_step: () => 0,
                }),
                commands: [],
            }),

            ClickedAdvanceResultTransform: () => ({
                model: modifyFields(model, {
                    transform_step: (step) => Math.min(3, step + 1),
                }),
                commands: [],
            }),

            ClickedResetResultTransform: () => ({
                model: modifyFields(model, { transform_step: () => 0 }),
                commands: [],
            }),

            SelectedResultRecoverMode: ({ mode }) => ({
                model: modifyFields(model, { recover_mode: () => mode }),
                commands: [],
            }),

            ClickedToggleResultRecoverBranch: () => ({
                model: modifyFields(model, {
                    recover_success: (success) => !success,
                }),
                commands: [],
            }),

            SelectedResultCombineMode: ({ mode }) => ({
                model: modifyFields(model, { combine_mode: () => mode }),
                commands: [],
            }),

            ClickedToggleResultCombineAge: () => ({
                model: modifyFields(model, {
                    combine_age_ok: (ok) => !ok,
                }),
                commands: [],
            }),
        })
    )

export const construct_result = (
    model: Model
): Result.Result<string | number | unknown, string> => {
    switch (model.construct_mode) {
        case "Success":
            return Result.succeed(42)
        case "Failure":
            return Result.fail("not found")
        case "Option":
            return Result.fromOption(
                model.option_present
                    ? Option.some("Ada")
                    : Option.none<string>(),
                () => "missing user"
            )
        case "Try":
            return Result.try({
                try: () =>
                    JSON.parse(
                        model.try_valid_json ? '{"name":"Ada"}' : "not json"
                    ) as unknown,
                catch: () => "invalid json",
            })
    }
}

export const transform_input_value = (model: Model): number =>
    model.transform_input === "Positive" ? 5 : -2

export const transform_result = (
    model: Model
): Result.Result<number, string> => {
    const initial = Result.succeed(transform_input_value(model))

    if (model.transform_step === 0) {
        return initial
    }

    const validated = Result.flatMap(initial, positive)

    if (model.transform_step === 1) {
        return validated
    }

    const doubled = Result.map(validated, (n) => n * 2)

    if (model.transform_step === 2) {
        return doubled
    }

    return Result.mapError(doubled, (error) => `Validation: ${error}`)
}

export const recover_source = (model: Model): Result.Result<number, string> =>
    model.recover_success ? Result.succeed(42) : Result.fail("timeout")

export const recover_output = (model: Model): string => {
    const source = recover_source(model)

    switch (model.recover_mode) {
        case "Match":
            return Result.match(source, {
                onSuccess: (value) => `value: ${value}`,
                onFailure: (error) => `error: ${error}`,
            })
        case "Fallback":
            return String(Result.getOrElse(source, () => 0))
        case "MapError": {
            const mapped = Result.mapError(
                source,
                (error) => `Network: ${error}`
            )
            return Result.isSuccess(mapped)
                ? `Success(${mapped.success})`
                : `Failure("${mapped.failure}")`
        }
    }
}

export const combine_result = (
    model: Model
): Result.Result<Readonly<{ user: string; age: number }> | string, string> => {
    if (model.combine_mode === "All") {
        return Result.all({
            user: Result.succeed("Ada"),
            age: model.combine_age_ok
                ? Result.succeed(36)
                : Result.fail("age unavailable"),
        })
    }

    return Result.gen(function* () {
        const user = yield* Result.succeed("Ada")
        const age = yield* model.combine_age_ok
            ? Result.succeed(36)
            : Result.fail("age unavailable")
        return `${user} is ${age}`
    })
}

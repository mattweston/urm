import { flow, Function as Fn, Match as M, pipe, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Function examples
// -----------------------------------------------------------------------------

// pipe applies a known value through unary functions immediately.
export const piped_value = pipe(
    3,
    (n) => n + 1,
    (n) => n * 2,
    (n) => `result:${n}`
)
// "result:8"

// flow creates a reusable function.
// Its first function may accept multiple arguments; later steps are unary.
export const makeDisplayName = flow(
    (first: string, last: string) => `${first} ${last}`,
    (name) => name.trim(),
    (name) => name.toUpperCase()
)

export const display_name = makeDisplayName("Ada", "Lovelace")
// "ADA LOVELACE"

// dual is how many Effect APIs support both data-first and data-last forms.
export const add = Fn.dual<
    (that: number) => (self: number) => number,
    (self: number, that: number) => number
>(2, (self, that) => self + that)

export const data_first = add(2, 3)
// 5

export const data_last = pipe(2, add(3))
// 5

// Small adapters.
export const same_value = Fn.identity({ id: "u-1" })

export const always_ready = Fn.constant("ready")

export const ready_1 = always_ready()
export const ready_2 = always_ready()

const subtractStringLength = (n: number) => (text: string) => n - text.length

export const flipped = Fn.flip(subtractStringLength)

export const flipped_result = flipped("hello")(8)
// 3

export const addTupled = Fn.tupled((a: number, b: number) => a + b)

export const tupled_result = addTupled([2, 3])
// 5

export const multiplyUntupled = Fn.untupled(
    (pair: readonly [number, number]) => pair[0] * pair[1]
)

export const untupled_result = multiplyUntupled(4, 5)
// 20

export const applied_length = pipe(
    (text: string) => text.length,
    Fn.apply("hello")
)
// 5

// Type-only helpers.
export const literal_five = Fn.satisfies<number>()(5 as const)
// retains type 5

export const cast_example = Fn.cast<unknown, string>("hello")
// runtime value is unchanged; cast performs no validation

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Pipe"),
    S.Literal("Flow"),
    S.Literal("Dual"),
    S.Literal("Adapters"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = ["Pipe", "Flow", "Dual", "Adapters"]

export const PipeInput = S.Union([S.Literal(1), S.Literal(3), S.Literal(10)])
export type PipeInput = typeof PipeInput.Type

export const DualStyle = S.Union([
    S.Literal("DataFirst"),
    S.Literal("DataLast"),
])
export type DualStyle = typeof DualStyle.Type

export const AdapterMode = S.Union([
    S.Literal("Identity"),
    S.Literal("Constant"),
    S.Literal("Flip"),
    S.Literal("Tupled"),
    S.Literal("Untupled"),
    S.Literal("Apply"),
])
export type AdapterMode = typeof AdapterMode.Type

export const Model = S.Struct({
    stage: Stage,

    pipe_input: PipeInput,
    pipe_step: S.Number,

    flow_first: S.String,
    flow_last: S.String,

    dual_style: DualStyle,
    dual_self: S.Number,
    dual_that: S.Number,

    adapter_mode: AdapterMode,
})
export type Model = typeof Model.Type

export const SelectedFunctionStage = taggedStruct("SelectedFunctionStage", {
    stage: Stage,
})

export const SelectedFunctionPipeInput = taggedStruct(
    "SelectedFunctionPipeInput",
    { pipe_input: PipeInput }
)

export const ClickedAdvanceFunctionPipe = taggedStruct(
    "ClickedAdvanceFunctionPipe"
)

export const ClickedResetFunctionPipe = taggedStruct("ClickedResetFunctionPipe")

export const UpdatedFunctionFlowFirst = taggedStruct(
    "UpdatedFunctionFlowFirst",
    { value: S.String }
)

export const UpdatedFunctionFlowLast = taggedStruct("UpdatedFunctionFlowLast", {
    value: S.String,
})

export const SelectedFunctionDualStyle = taggedStruct(
    "SelectedFunctionDualStyle",
    { dual_style: DualStyle }
)

export const SelectedFunctionDualSelf = taggedStruct(
    "SelectedFunctionDualSelf",
    { value: S.Number }
)

export const SelectedFunctionDualThat = taggedStruct(
    "SelectedFunctionDualThat",
    { value: S.Number }
)

export const SelectedFunctionAdapterMode = taggedStruct(
    "SelectedFunctionAdapterMode",
    { adapter_mode: AdapterMode }
)

export const Message = S.Union([
    SelectedFunctionStage,

    SelectedFunctionPipeInput,
    ClickedAdvanceFunctionPipe,
    ClickedResetFunctionPipe,

    UpdatedFunctionFlowFirst,
    UpdatedFunctionFlowLast,

    SelectedFunctionDualStyle,
    SelectedFunctionDualSelf,
    SelectedFunctionDualThat,

    SelectedFunctionAdapterMode,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Pipe",

    pipe_input: 3,
    pipe_step: 0,

    flow_first: "Ada",
    flow_last: "Lovelace",

    dual_style: "DataLast",
    dual_self: 2,
    dual_that: 3,

    adapter_mode: "Identity",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedFunctionStage: ({ stage }) => ({
                model: evo(model, {
                    stage: () => stage,
                }),
                commands: [],
            }),

            SelectedFunctionPipeInput: ({ pipe_input }) => ({
                model: evo(model, {
                    pipe_input: () => pipe_input,
                    pipe_step: () => 0,
                }),
                commands: [],
            }),

            ClickedAdvanceFunctionPipe: () => ({
                model: evo(model, {
                    pipe_step: (step) => Math.min(3, step + 1),
                }),
                commands: [],
            }),

            ClickedResetFunctionPipe: () => ({
                model: evo(model, {
                    pipe_step: () => 0,
                }),
                commands: [],
            }),

            UpdatedFunctionFlowFirst: ({ value }) => ({
                model: evo(model, {
                    flow_first: () => value,
                }),
                commands: [],
            }),

            UpdatedFunctionFlowLast: ({ value }) => ({
                model: evo(model, {
                    flow_last: () => value,
                }),
                commands: [],
            }),

            SelectedFunctionDualStyle: ({ dual_style }) => ({
                model: evo(model, {
                    dual_style: () => dual_style,
                }),
                commands: [],
            }),

            SelectedFunctionDualSelf: ({ value }) => ({
                model: evo(model, {
                    dual_self: () => value,
                }),
                commands: [],
            }),

            SelectedFunctionDualThat: ({ value }) => ({
                model: evo(model, {
                    dual_that: () => value,
                }),
                commands: [],
            }),

            SelectedFunctionAdapterMode: ({ adapter_mode }) => ({
                model: evo(model, {
                    adapter_mode: () => adapter_mode,
                }),
                commands: [],
            }),
        })
    )

export const pipe_values = (
    input: PipeInput
): readonly [number, number, number, string] => {
    const plusOne = input + 1
    const doubled = plusOne * 2
    const output = `result:${doubled}`

    return [input, plusOne, doubled, output]
}

export const flow_output = (model: Model): string =>
    makeDisplayName(model.flow_first, model.flow_last)

export const dual_output = (
    model: Model
): Readonly<{
    expression: string
    output: number
}> =>
    model.dual_style === "DataFirst"
        ? {
              expression: `add(${model.dual_self}, ${model.dual_that})`,
              output: add(model.dual_self, model.dual_that),
          }
        : {
              expression: `pipe(${model.dual_self}, add(${model.dual_that}))`,
              output: pipe(model.dual_self, add(model.dual_that)),
          }

export const adapter_output = (
    mode: AdapterMode
): Readonly<{
    expression: string
    output: string
    detail: string
}> => {
    switch (mode) {
        case "Identity":
            return {
                expression: 'Function.identity({ id: "u-1" })',
                output: '{ id: "u-1" }',
                detail: "identity returns exactly the value it receives. It is useful when an API requires a transformation but you intentionally want no change.",
            }

        case "Constant":
            return {
                expression: 'Function.constant("ready")()',
                output: '"ready"',
                detail: "constant(value) creates a zero-argument thunk that returns the same value every time.",
            }

        case "Flip":
            return {
                expression:
                    'Function.flip((n) => (text) => n - text.length)("hello")(8)',
                output: String(flipped_result),
                detail: "flip swaps the two curried argument groups, which is handy when an existing function has the right logic but the wrong argument order for a pipeline.",
            }

        case "Tupled":
            return {
                expression: "Function.tupled((a, b) => a + b)([2, 3])",
                output: String(tupled_result),
                detail: "tupled adapts an n-argument function into a function that accepts one tuple of arguments.",
            }

        case "Untupled":
            return {
                expression: "Function.untupled(([a, b]) => a * b)(4, 5)",
                output: String(untupled_result),
                detail: "untupled adapts a tuple-argument function back into a normal multi-argument function.",
            }

        case "Apply":
            return {
                expression:
                    'pipe((text) => text.length, Function.apply("hello"))',
                output: String(applied_length),
                detail: "apply(value) turns a value into a function-transformer: apply(a)(f) is just f(a).",
            }
    }
}

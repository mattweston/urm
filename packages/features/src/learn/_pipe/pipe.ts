import { Effect, flow, Match as M, Pipeable, pipe, Schema as S } from "effect"
import type { Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 pipe / Pipeable examples
// -----------------------------------------------------------------------------

export const immediate_value = pipe(
    1,
    (n) => n + 1,
    (n) => n * 2,
    (n) => `result: ${n}`
)

export const effect_with_function_pipe = pipe(
    Effect.succeed(1),
    Effect.map((n) => n + 1),
    Effect.flatMap((n) => Effect.succeed(n * 2))
)

export const effect_with_method_pipe = Effect.succeed(1).pipe(
    Effect.map((n) => n + 1),
    Effect.flatMap((n) => Effect.succeed(n * 2))
)

// Effect implements Pipeable, which is why the method form above exists.
export type EffectIsPipeable = Effect.Effect<number> & Pipeable.Pipeable

// Pipeable.Class adds the standard .pipe(...) method to your own class.
export class NumberBox extends Pipeable.Class {
    constructor(readonly value: number) {
        super()
    }
}

export const number_box_result = new NumberBox(5).pipe(
    (box) => box.value,
    (n) => n + 2,
    (n) => n * 3
)

// Pipeable.Mixin can add the same behavior to an existing class.
class PlainPoint {
    // This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
    constructor(readonly x: number) {}
}

export const Point = Pipeable.Mixin(PlainPoint)

export const point_result = new Point(4).pipe(
    (point) => point.x,
    (x) => x * 10
)

// pipeArguments is the low-level helper used by Pipeable implementations.
export class ManualBox {
    constructor(readonly value: number) {}

    pipe(..._fns: ReadonlyArray<(value: any) => any>): unknown {
        return Pipeable.pipeArguments(this, arguments)
    }
}

export const manual_box_result = new ManualBox(3).pipe(
    (box: ManualBox) => box.value,
    (n: number) => n - 1
)

// pipe applies a value immediately.
// flow creates a reusable function from the same left-to-right idea.
export const slugify = flow(
    (value: string) => value.trim(),
    (value) => value.toLowerCase(),
    (value) => value.replace(/\s+/g, "-")
)

export const slug = slugify("  Ada Lovelace  ")

// -----------------------------------------------------------------------------
// Visual teaching model
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Value"),
    S.Literal("Effect"),
    S.Literal("Custom"),
    S.Literal("Flow"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Value",
    "Effect",
    "Custom",
    "Flow",
]

export const EffectSyntax = S.Union([
    S.Literal("Function"),
    S.Literal("Method"),
])
export type EffectSyntax = typeof EffectSyntax.Type

export const CustomKind = S.Union([
    S.Literal("Class"),
    S.Literal("Mixin"),
    S.Literal("Manual"),
])
export type CustomKind = typeof CustomKind.Type

export const Step = S.Union([
    S.Literal(0),
    S.Literal(1),
    S.Literal(2),
    S.Literal(3),
])
export type Step = typeof Step.Type

export const Model = S.Struct({
    stage: Stage,

    value_step: Step,

    effect_syntax: EffectSyntax,
    effect_has_run: S.Boolean,

    custom_kind: CustomKind,
    custom_has_run: S.Boolean,

    flow_input: S.String,
})
export type Model = typeof Model.Type

export const SelectedPipeStage = taggedStruct("SelectedPipeStage", {
    stage: Stage,
})

export const ClickedAdvancePipeValue = taggedStruct("ClickedAdvancePipeValue")
export const ClickedResetPipeValue = taggedStruct("ClickedResetPipeValue")

export const SelectedEffectPipeSyntax = taggedStruct(
    "SelectedEffectPipeSyntax",
    {
        syntax: EffectSyntax,
    }
)
export const ClickedRunEffectPipe = taggedStruct("ClickedRunEffectPipe")
export const ClickedResetEffectPipe = taggedStruct("ClickedResetEffectPipe")

export const SelectedCustomPipeableKind = taggedStruct(
    "SelectedCustomPipeableKind",
    { kind: CustomKind }
)
export const ClickedRunCustomPipeable = taggedStruct("ClickedRunCustomPipeable")
export const ClickedResetCustomPipeable = taggedStruct(
    "ClickedResetCustomPipeable"
)

export const UpdatedPipeFlowInput = taggedStruct("UpdatedPipeFlowInput", {
    value: S.String,
})

export const Message = S.Union([
    SelectedPipeStage,

    ClickedAdvancePipeValue,
    ClickedResetPipeValue,

    SelectedEffectPipeSyntax,
    ClickedRunEffectPipe,
    ClickedResetEffectPipe,

    SelectedCustomPipeableKind,
    ClickedRunCustomPipeable,
    ClickedResetCustomPipeable,

    UpdatedPipeFlowInput,
])
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Value",

    value_step: 0,

    effect_syntax: "Method",
    effect_has_run: false,

    custom_kind: "Class",
    custom_has_run: false,

    flow_input: "  Ada Lovelace  ",
})

type UpdateReturn = Update.Return<Model, Message>

const next_step = (step: Step): Step =>
    step === 0 ? 1 : step === 1 ? 2 : step === 2 ? 3 : 3

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SelectedPipeStage: ({ stage }) => ({
                model: evo(model, { stage: () => stage }),
                commands: [],
            }),

            ClickedAdvancePipeValue: () => ({
                model: evo(model, {
                    value_step: (step) => next_step(step),
                }),
                commands: [],
            }),

            ClickedResetPipeValue: () => ({
                model: evo(model, { value_step: () => 0 }),
                commands: [],
            }),

            SelectedEffectPipeSyntax: ({ syntax }) => ({
                model: evo(model, {
                    effect_syntax: () => syntax,
                    effect_has_run: () => false,
                }),
                commands: [],
            }),

            ClickedRunEffectPipe: () => ({
                model: evo(model, { effect_has_run: () => true }),
                commands: [],
            }),

            ClickedResetEffectPipe: () => ({
                model: evo(model, { effect_has_run: () => false }),
                commands: [],
            }),

            SelectedCustomPipeableKind: ({ kind }) => ({
                model: evo(model, {
                    custom_kind: () => kind,
                    custom_has_run: () => false,
                }),
                commands: [],
            }),

            ClickedRunCustomPipeable: () => ({
                model: evo(model, { custom_has_run: () => true }),
                commands: [],
            }),

            ClickedResetCustomPipeable: () => ({
                model: evo(model, { custom_has_run: () => false }),
                commands: [],
            }),

            UpdatedPipeFlowInput: ({ value }) => ({
                model: evo(model, { flow_input: () => value }),
                commands: [],
            }),
        })
    )

export type ValuePipeline = Readonly<{
    input: string
    add: string
    multiply: string
    output: string
}>

export const value_pipeline = (): ValuePipeline => ({
    input: "1",
    add: "2",
    multiply: "4",
    output: "result: 4",
})

export const custom_result = (
    kind: CustomKind
): Readonly<{
    source: string
    output: string
}> => {
    switch (kind) {
        case "Class":
            return {
                source: "new NumberBox(5)",
                output: "21",
            }
        case "Mixin":
            return {
                source: "new Point(4)",
                output: "40",
            }
        case "Manual":
            return {
                source: "new ManualBox(3)",
                output: "2",
            }
    }
}

export const flow_result = (input: string): string => slugify(input)

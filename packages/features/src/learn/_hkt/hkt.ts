import { Effect, Option, Schema as S } from "effect"
import type { HKT } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// TYPE LAMBDAS
// -----------------------------------------------------------------------------

interface HktSlots {
    readonly In: unknown
    readonly Out2: unknown
    readonly Out1: unknown
    readonly Target: unknown
}

export interface ArrayTypeLambda extends HKT.TypeLambda, HktSlots {
    readonly type: ReadonlyArray<this["Target"]>
}

export interface OptionTypeLambda extends HKT.TypeLambda, HktSlots {
    readonly type: Option.Option<this["Target"]>
}

export interface EffectTypeLambda extends HKT.TypeLambda, HktSlots {
    readonly type: Effect.Effect<this["Target"], this["Out2"], this["Out1"]>
}

export interface FunctionTypeLambda extends HKT.TypeLambda, HktSlots {
    readonly type: (input: this["In"]) => this["Target"]
}

export interface IdentityTypeLambda extends HKT.TypeLambda, HktSlots {
    readonly type: this["Target"]
}

// -----------------------------------------------------------------------------
// TYPE-CLASS EXAMPLE
// -----------------------------------------------------------------------------

export interface Functor<F extends HKT.TypeLambda> extends HKT.TypeClass<F> {
    readonly [HKT.URI]?: F

    readonly map: <A, B>(
        self: HKT.Kind<F, never, never, never, A>,
        f: (value: A) => B
    ) => HKT.Kind<F, never, never, never, B>
}

export const arrayFunctor: Functor<ArrayTypeLambda> = {
    map: <A, B>(self: ReadonlyArray<A>, f: (value: A) => B): ReadonlyArray<B> =>
        self.map(f),
}

export const optionFunctor: Functor<OptionTypeLambda> = {
    map: <A, B>(self: Option.Option<A>, f: (value: A) => B): Option.Option<B> =>
        Option.match(self, {
            onNone: () => Option.none<B>(),
            onSome: (value: A) => Option.some(f(value)),
        }),
}

export const mapWith = <F extends HKT.TypeLambda, A, B>(
    functor: Functor<F>,
    self: HKT.Kind<F, never, never, never, A>,
    f: (value: A) => B
): HKT.Kind<F, never, never, never, B> => functor.map(self, f)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Lambda"),
    S.Literal("Kind"),
    S.Literal("TypeClass"),
    S.Literal("Variance"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Lambda",
    "Kind",
    "TypeClass",
    "Variance",
]

export const LambdaCase = S.Union([
    S.Literal("Array"),
    S.Literal("Option"),
    S.Literal("Effect"),
    S.Literal("Function"),
])
export type LambdaCase = typeof LambdaCase.Type

export const KindCase = S.Union([
    S.Literal("Array"),
    S.Literal("Option"),
    S.Literal("Effect"),
    S.Literal("Function"),
])
export type KindCase = typeof KindCase.Type

export const TypeClassCase = S.Union([
    S.Literal("Array"),
    S.Literal("Option"),
    S.Literal("Generic"),
])
export type TypeClassCase = typeof TypeClassCase.Type

export const VarianceCase = S.Union([
    S.Literal("Target"),
    S.Literal("Input"),
    S.Literal("Outputs"),
])
export type VarianceCase = typeof VarianceCase.Type

export const Model = S.Struct({
    stage: Stage,
    lambdaCase: LambdaCase,
    kindCase: KindCase,
    typeClassCase: TypeClassCase,
    varianceCase: VarianceCase,
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
    Lambda: {
        eyebrow: "encode a type constructor",
        title: "TypeLambda gives TypeScript a name for a generic type shape",
        description:
            "TypeScript cannot directly pass Option<_>, Array<_>, or Effect<_, _, _> as a type parameter. A TypeLambda represents that shape by defining type in terms of four named channels.",
        code: `interface OptionTypeLambda
    extends HKT.TypeLambda
{
    readonly type:
        Option.Option<
            this["Target"]
        >
}

interface EffectTypeLambda
    extends HKT.TypeLambda
{
    readonly type:
        Effect.Effect<
            this["Target"],
            this["Out2"],
            this["Out1"]
        >
}`,
        apis: ["HKT.TypeLambda"],
        notice: "TypeLambda is compile-time machinery. The fields In, Out2, Out1, and Target are placeholders that Kind later substitutes with concrete type arguments.",
    },

    Kind: {
        eyebrow: "apply the type lambda",
        title: "Kind substitutes concrete arguments and recovers the real container type",
        description:
            'Kind<F, In, Out2, Out1, Target> intersects F with the supplied channels and reads F["type"]. For Option or Array only Target matters; Effect uses Target, Out2, and Out1; a function lambda can consume In.',
        code: `type OptionString =
    HKT.Kind<
        OptionTypeLambda,
        never,
        never,
        never,
        string
    >
// Option.Option<string>

type EffectValue =
    HKT.Kind<
        EffectTypeLambda,
        never,
        "ParseError",
        "Config",
        number
    >
// Effect<number, "ParseError", "Config">`,
        apis: ["HKT.Kind", "HKT.TypeLambda"],
        notice: "Kind is entirely type-level: there is no runtime allocation or wrapper. The resulting type is the original constructor shape with the supplied channels substituted into it.",
    },

    TypeClass: {
        eyebrow: "generic operations over F",
        title: "TypeClass lets one interface describe operations across many constructors",
        description:
            "A type class is parameterized by a TypeLambda. Its methods use Kind to say “the same container shape, but with a different Target.” The demo implements one Functor interface for Array and Option.",
        code: `interface Functor<
    F extends HKT.TypeLambda
> extends HKT.TypeClass<F> {
    readonly [HKT.URI]?: F

    map<A, B>(
        self:
            HKT.Kind<
                F,
                never,
                never,
                never,
                A
            >,
        f: (value: A) => B
    ):
        HKT.Kind<
            F,
            never,
            never,
            never,
            B
        >
}`,
        apis: ["HKT.TypeClass", "HKT.URI", "HKT.Kind"],
        notice: "URI is a declared unique symbol used to associate a TypeClass with its TypeLambda. It is intended for typing and has no runtime behavior in this module.",
    },

    Variance: {
        eyebrow: "four type channels",
        title: "In, Out2, Out1, and Target let one HKT encoding cover richer constructors",
        description:
            "TypeLambda has four channels so generic abstractions are not limited to unary containers. Effect maps success to Target, error to Out2, and requirements to Out1. Function-like shapes can use In as an input.",
        code: `interface FunctionTypeLambda
    extends HKT.TypeLambda
{
    readonly type: (
        input: this["In"]
    ) => this["Target"]
}

type Renderer =
    HKT.Kind<
        FunctionTypeLambda,
        { id: number },
        never,
        never,
        string
    >
// (input: { id: number }) => string`,
        apis: ["HKT.TypeLambda", "HKT.Kind"],
        notice: "The HKT fallback representation marks In contravariant, Out2 and Out1 covariant, and Target invariant. Custom TypeLambda.type definitions choose how those channels appear in the concrete type.",
    },
}

// -----------------------------------------------------------------------------
// LAMBDA SNAPSHOT
// -----------------------------------------------------------------------------

export type LambdaSnapshot = Readonly<{
    mode: LambdaCase
    constructor: string
    uses: string
    concreteExample: string
    purpose: string
}>

export const lambda_snapshot = (model: Model): LambdaSnapshot => {
    if (model.lambdaCase === "Option") {
        return {
            mode: model.lambdaCase,
            constructor: "Option.Option<Target>",
            uses: "Target",
            concreteExample: "Option<string>",
            purpose: "unary optional container",
        }
    }

    if (model.lambdaCase === "Effect") {
        return {
            mode: model.lambdaCase,
            constructor: "Effect<Target, Out2, Out1>",
            uses: "Target · Out2 · Out1",
            concreteExample: 'Effect<number, "ParseError", "Config">',
            purpose: "success + error + requirements",
        }
    }

    if (model.lambdaCase === "Function") {
        return {
            mode: model.lambdaCase,
            constructor: "(In) => Target",
            uses: "In · Target",
            concreteExample: "({ id: number }) => string",
            purpose: "contravariant input + result",
        }
    }

    return {
        mode: model.lambdaCase,
        constructor: "ReadonlyArray<Target>",
        uses: "Target",
        concreteExample: "ReadonlyArray<string>",
        purpose: "unary collection",
    }
}

// -----------------------------------------------------------------------------
// KIND SNAPSHOT
// -----------------------------------------------------------------------------

type ArrayString = HKT.Kind<ArrayTypeLambda, never, never, never, string>

type OptionNumber = HKT.Kind<OptionTypeLambda, never, never, never, number>

type EffectString = HKT.Kind<EffectTypeLambda, never, never, never, string>

type Renderer = HKT.Kind<
    FunctionTypeLambda,
    Readonly<{
        id: number
    }>,
    never,
    never,
    string
>

const array_string: ArrayString = ["alpha", "beta"]

const option_number: OptionNumber = Option.some(42)

const effect_string: EffectString = Effect.succeed("ok")

const renderer: Renderer = (
    input: Readonly<{
        id: number
    }>
) => `item-${input.id}`

export type KindSnapshot = Readonly<{
    mode: KindCase
    typeExpression: string
    resolved: string
    runtimeWitness: string
    substitutedChannels: string
}>

export const kind_snapshot = (model: Model): KindSnapshot => {
    if (model.kindCase === "Option") {
        return {
            mode: model.kindCase,
            typeExpression: "Kind<OptionTL, never, never, never, number>",
            resolved: "Option.Option<number>",
            runtimeWitness: Option.match(option_number, {
                onNone: () => "None",
                onSome: (value: number) => `Some(${value})`,
            }),
            substitutedChannels: "Target = number",
        }
    }

    if (model.kindCase === "Effect") {
        return {
            mode: model.kindCase,
            typeExpression: "Kind<EffectTL, never, never, never, string>",
            resolved: "Effect<string, never, never>",
            runtimeWitness: Effect.runSync(effect_string),
            substitutedChannels:
                "Target = string · Out2 = never · Out1 = never",
        }
    }

    if (model.kindCase === "Function") {
        return {
            mode: model.kindCase,
            typeExpression:
                "Kind<FunctionTL, { id: number }, never, never, string>",
            resolved: "({ id: number }) => string",
            runtimeWitness: renderer({
                id: 7,
            }),
            substitutedChannels: "In = { id: number } · Target = string",
        }
    }

    return {
        mode: model.kindCase,
        typeExpression: "Kind<ArrayTL, never, never, never, string>",
        resolved: "ReadonlyArray<string>",
        runtimeWitness: `[${array_string.join(", ")}]`,
        substitutedChannels: "Target = string",
    }
}

// -----------------------------------------------------------------------------
// TYPECLASS SNAPSHOT
// -----------------------------------------------------------------------------

export type TypeClassSnapshot = Readonly<{
    mode: TypeClassCase
    abstraction: string
    input: string
    output: string
    sameOperation: string
    uriRole: string
}>

export const type_class_snapshot = (model: Model): TypeClassSnapshot => {
    if (model.typeClassCase === "Option") {
        const output = optionFunctor.map(
            Option.some(3),
            (value: number) => `n=${value * 2}`
        )

        return {
            mode: model.typeClassCase,
            abstraction: "Functor<OptionTypeLambda>",
            input: "Some(3)",
            output: Option.match(output, {
                onNone: () => "None",
                onSome: (value: string) => `Some(${value})`,
            }),
            sameOperation: "map<A, B>",
            uriRole: "links TypeClass<F> to F",
        }
    }

    if (model.typeClassCase === "Generic") {
        const arrayOutput = mapWith(
            arrayFunctor,
            [1, 2, 3],
            (value: number) => value * 10
        )

        const optionOutput = mapWith(
            optionFunctor,
            Option.some(5),
            (value: number) => value * 10
        )

        return {
            mode: model.typeClassCase,
            abstraction: "mapWith<F extends TypeLambda>",
            input: "Array(1,2,3) + Some(5)",
            output: `Array=[${arrayOutput.join(", ")}] · Option=${Option.match(
                optionOutput,
                {
                    onNone: () => "None",
                    onSome: (value: number) => `Some(${value})`,
                }
            )}`,
            sameOperation: "one helper, two container shapes",
            uriRole: "compile-time association only",
        }
    }

    const output = arrayFunctor.map(
        [1, 2, 3],
        (value: number) => `n=${value * 2}`
    )

    return {
        mode: model.typeClassCase,
        abstraction: "Functor<ArrayTypeLambda>",
        input: "[1, 2, 3]",
        output: `[${output.join(", ")}]`,
        sameOperation: "map<A, B>",
        uriRole: "links TypeClass<F> to F",
    }
}

// -----------------------------------------------------------------------------
// VARIANCE SNAPSHOT
// -----------------------------------------------------------------------------

export type VarianceSnapshot = Readonly<{
    mode: VarianceCase
    channel: string
    role: string
    typeLambdaUse: string
    example: string
    fallbackMarker: string
}>

export const variance_snapshot = (model: Model): VarianceSnapshot => {
    if (model.varianceCase === "Input") {
        return {
            mode: model.varianceCase,
            channel: "In",
            role: "contravariant input channel",
            typeLambdaUse: '(input: this["In"]) => this["Target"]',
            example: "Renderer: { id: number } → string",
            fallbackMarker: "Types.Contravariant<In>",
        }
    }

    if (model.varianceCase === "Outputs") {
        return {
            mode: model.varianceCase,
            channel: "Out2 + Out1",
            role: "covariant auxiliary output channels",
            typeLambdaUse: 'Effect<this["Target"], this["Out2"], this["Out1"]>',
            example: 'Effect<string, "ParseError", "Config">',
            fallbackMarker: "Types.Covariant<Out2 / Out1>",
        }
    }

    return {
        mode: model.varianceCase,
        channel: "Target",
        role: "invariant main value channel",
        typeLambdaUse: 'Array<this["Target"]> / Option<this["Target"]>',
        example: "Array<string> · Option<number>",
        fallbackMarker: "Types.Invariant<Target>",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedHktStage: {
        stage: Stage,
    },
    SelectedHktLambdaCase: {
        lambdaCase: LambdaCase,
    },
    SelectedHktKindCase: {
        kindCase: KindCase,
    },
    SelectedHktTypeClassCase: {
        typeClassCase: TypeClassCase,
    },
    SelectedHktVarianceCase: {
        varianceCase: VarianceCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Lambda",
    lambdaCase: "Array",
    kindCase: "Array",
    typeClassCase: "Array",
    varianceCase: "Target",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type LambdaCasePayload = Readonly<{
    lambdaCase: LambdaCase
}>

type KindCasePayload = Readonly<{
    kindCase: KindCase
}>

type TypeClassCasePayload = Readonly<{
    typeClassCase: TypeClassCase
}>

type VarianceCasePayload = Readonly<{
    varianceCase: VarianceCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedHktStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedHktLambdaCase: ({ lambdaCase }: LambdaCasePayload) => ({
            model: modifyFields(model, {
                lambdaCase: () => lambdaCase,
            }),
        }),

        SelectedHktKindCase: ({ kindCase }: KindCasePayload) => ({
            model: modifyFields(model, {
                kindCase: () => kindCase,
            }),
        }),

        SelectedHktTypeClassCase: ({
            typeClassCase,
        }: TypeClassCasePayload) => ({
            model: modifyFields(model, {
                typeClassCase: () => typeClassCase,
            }),
        }),

        SelectedHktVarianceCase: ({ varianceCase }: VarianceCasePayload) => ({
            model: modifyFields(model, {
                varianceCase: () => varianceCase,
            }),
        }),
    })

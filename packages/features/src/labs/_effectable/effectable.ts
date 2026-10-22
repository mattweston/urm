import { Context, Data, Effect, Effectable, Exit, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL EFFECTABLE EXAMPLES
// -----------------------------------------------------------------------------

export class TextLength extends Effectable.Class<number> {
    constructor(readonly text: string) {
        super()
    }

    asEffect() {
        return Effect.succeed(this.text.length)
    }
}

export class ScaleError extends Data.TaggedError("ScaleError")<{
    readonly value: number
}> {}

export class Multiplier extends Context.Service<Multiplier, number>()(
    "EffectableDemo/Multiplier"
) {}

export class ScaleValue extends Effectable.Class<
    number,
    ScaleError,
    Multiplier
> {
    constructor(readonly value: number) {
        super()
    }

    asEffect() {
        const value = this.value

        return Effect.gen(function* () {
            const multiplier = yield* Multiplier

            if (value < 0) {
                return yield* new ScaleError({
                    value,
                })
            }

            return value * multiplier
        })
    }
}

export class Box {
    constructor(readonly value: number) {}

    double() {
        return this.value * 2
    }
}

export class EffectBox extends Effectable.Mixin(Box) {
    override asEffect() {
        return Effect.succeed(this.value)
    }
}

export interface PrimitiveNumber extends Effect.Effect<number> {
    readonly value: number
}

export const PrimitiveNumberPrototype = Effectable.Prototype<PrimitiveNumber>({
    label: "PrimitiveNumber",
    evaluate(_fiber) {
        return Effect.succeed(this.value)
    },
})

export const make_primitive_number = (value: number): PrimitiveNumber =>
    Object.assign(Object.create(PrimitiveNumberPrototype), {
        value,
    }) as PrimitiveNumber

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Class"),
    S.Literal("Yield"),
    S.Literal("Mixin"),
    S.Literal("Prototype"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Class",
    "Yield",
    "Mixin",
    "Prototype",
]

export const ClassCase = S.Union([
    S.Literal("Effect"),
    S.Literal("Foldkit"),
    S.Literal("Empty"),
])
export type ClassCase = typeof ClassCase.Type

export const YieldCase = S.Union([S.Literal("Success"), S.Literal("Failure")])
export type YieldCase = typeof YieldCase.Type

export const MixinCase = S.Union([S.Literal("Two"), S.Literal("Five")])
export type MixinCase = typeof MixinCase.Type

export const PrototypeCase = S.Union([
    S.Literal("Seven"),
    S.Literal("FortyTwo"),
])
export type PrototypeCase = typeof PrototypeCase.Type

export const Model = S.Struct({
    stage: Stage,
    classCase: ClassCase,
    yieldCase: YieldCase,
    mixinCase: MixinCase,
    prototypeCase: PrototypeCase,
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
    Class: {
        eyebrow: "class-based effect values",
        title: "A domain object can be an Effect",
        description:
            "Extend Effectable.Class and implement asEffect(). Instances keep your own fields and methods while participating in the Effect protocol.",
        code: `class TextLength
    extends Effectable.Class<number> {

    constructor(readonly text: string) {
        super()
    }

    asEffect() {
        return Effect.succeed(
            this.text.length
        )
    }
}

const length =
    new TextLength("Effect")

Effect.isEffect(length) // true
Effect.runSync(length)  // 6`,
        apis: [
            "Effectable.Class",
            "Effect.isEffect",
            "Effect.runSync",
            "Effect.map",
        ],
        notice: "Effectable.Class is intentionally thin: the success, error, and service channels are exactly the channels returned by asEffect().",
    },

    Yield: {
        eyebrow: "native Effect composition",
        title: "Effectable values can be yielded directly",
        description:
            "Because the instance really implements Effect, yield* works inside Effect.gen. Errors and service requirements from asEffect() remain visible in the resulting Effect type.",
        code: `class ScaleValue extends
    Effectable.Class<
        number,
        ScaleError,
        Multiplier
    > {

    asEffect() {
        return Effect.gen(function* () {
            const by =
                yield* Multiplier

            if (this.value < 0) {
                return yield*
                    new ScaleError({
                        value: this.value
                    })
            }

            return this.value * by
        })
    }
}

const program = Effect.gen(function* () {
    const scaled =
        yield* new ScaleValue(7)

    return scaled + 1
})`,
        apis: [
            "Effectable.Class",
            "Effect.gen",
            "Effect.provideService",
            "Effect.exit",
        ],
        notice: "Effectable does not erase Effect's A / E / R channels. A custom class can fail, require services, be mapped, provided, forked, or yielded like any ordinary Effect.",
    },

    Mixin: {
        eyebrow: "adapt an existing class",
        title: "Mixin adds Effect behavior without changing the base class",
        description:
            "Effectable.Mixin preserves constructor parameters and ordinary instance members, while the original class and its prototype remain untouched.",
        code: `class Box {
    constructor(
        readonly value: number
    ) {}

    double() {
        return this.value * 2
    }
}

class EffectBox extends
    Effectable.Mixin(Box) {

    asEffect() {
        return Effect.succeed(
            this.value
        )
    }
}

const box = new EffectBox(2)

box instanceof Box        // true
box.double()              // 4
Effect.isEffect(box)      // true
Effect.runSync(box)       // 2`,
        apis: ["Effectable.Mixin", "Effect.isEffect", "Effect.runSync"],
        notice: "Mixin inserts the Effect prototype into the subclass chain. Effect prototype members such as pipe, toString, toJSON, the iterator, and custom inspect can shadow same-named methods on the wrapped base prototype.",
    },

    Prototype: {
        eyebrow: "low-level primitive",
        title: "Prototype is the escape hatch beneath Class and Mixin",
        description:
            "Prototype builds the Effect protocol directly from a label and an evaluator. The evaluator runs with the custom value as this and receives the current fiber.",
        code: `interface PrimitiveNumber
    extends Effect.Effect<number> {
    readonly value: number
}

const proto =
    Effectable.Prototype<PrimitiveNumber>({
        label: "PrimitiveNumber",

        evaluate(fiber) {
            return Effect.succeed(
                this.value
            )
        }
    })

const value = Object.assign(
    Object.create(proto),
    { value: 42 }
) as PrimitiveNumber

Effect.isEffect(value) // true
Effect.runSync(value)  // 42`,
        apis: ["Effectable.Prototype", "Effect.isEffect", "Effect.runSync"],
        notice: "Prototype is a low-level API for library authors and specialized primitives. Prefer Class or Mixin when a normal class model is enough; Prototype exposes the current fiber because it sits directly on the evaluation path.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

const text_for_case = (classCase: ClassCase): string =>
    classCase === "Effect" ? "Effect" : classCase === "Foldkit" ? "Foldkit" : ""

export type ClassSnapshot = Readonly<{
    text: string
    isEffect: boolean
    runResult: number
    mappedResult: number
    pipeAvailable: boolean
}>

export const class_snapshot = (model: Model): ClassSnapshot => {
    const text = text_for_case(model.classCase)

    const value = new TextLength(text)

    return {
        text,
        isEffect: Effect.isEffect(value),
        runResult: Effect.runSync(value),
        mappedResult: Effect.runSync(
            value.pipe(Effect.map((length) => length * 2))
        ),
        pipeAvailable: typeof value.pipe === "function",
    }
}

export type YieldSnapshot = Readonly<{
    input: number
    multiplier: number
    isEffect: boolean
    requiredService: string
    exitTag: string
    result: string
    errorChannel: string
    yieldedDirectly: boolean
}>

export const yield_snapshot = (model: Model): YieldSnapshot => {
    const input = model.yieldCase === "Success" ? 7 : -2

    const multiplier = 3

    const scale = new ScaleValue(input)

    const program = Effect.gen(function* () {
        const scaled = yield* scale

        return scaled + 1
    }).pipe(Effect.provideService(Multiplier, multiplier), Effect.exit)

    const exit = Effect.runSync(program)

    return {
        input,
        multiplier,
        isEffect: Effect.isEffect(scale),
        requiredService: "Multiplier",
        exitTag: exit._tag,
        result: Exit.isSuccess(exit)
            ? String(exit.value)
            : `ScaleError(${input})`,
        errorChannel:
            model.yieldCase === "Success"
                ? "ScaleError (unused)"
                : "ScaleError",
        yieldedDirectly: true,
    }
}

const mixin_value = (mixinCase: MixinCase): number =>
    mixinCase === "Two" ? 2 : 5

export type MixinSnapshot = Readonly<{
    value: number
    baseIsEffect: boolean
    mixedIsEffect: boolean
    instanceOfBase: boolean
    instanceOfMixed: boolean
    doubleResult: number
    runResult: number
    originalPrototypeChanged: boolean
}>

export const mixin_snapshot = (model: Model): MixinSnapshot => {
    const value = mixin_value(model.mixinCase)

    const base = new Box(value)

    const mixed = new EffectBox(value)

    return {
        value,
        baseIsEffect: Effect.isEffect(base),
        mixedIsEffect: Effect.isEffect(mixed),
        instanceOfBase: mixed instanceof Box,
        instanceOfMixed: mixed instanceof EffectBox,
        doubleResult: mixed.double(),
        runResult: Effect.runSync(mixed),
        originalPrototypeChanged: Effect.isEffect(new Box(value)),
    }
}

const primitive_value = (prototypeCase: PrototypeCase): number =>
    prototypeCase === "Seven" ? 7 : 42

export type PrototypeSnapshot = Readonly<{
    value: number
    isEffect: boolean
    runResult: number
    mappedResult: number
    yieldedResult: number
    evaluatorReceivesFiber: boolean
}>

export const prototype_snapshot = (model: Model): PrototypeSnapshot => {
    const value = primitive_value(model.prototypeCase)

    const primitive = make_primitive_number(value)

    const yieldedResult = Effect.runSync(
        Effect.gen(function* () {
            const result = yield* primitive

            return result + 1
        })
    )

    return {
        value,
        isEffect: Effect.isEffect(primitive),
        runResult: Effect.runSync(primitive),
        mappedResult: Effect.runSync(
            primitive.pipe(Effect.map((number) => number * 10))
        ),
        yieldedResult,
        evaluatorReceivesFiber: true,
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedEffectableStage: {
        stage: Stage,
    },
    SelectedEffectableClassCase: {
        classCase: ClassCase,
    },
    SelectedEffectableYieldCase: {
        yieldCase: YieldCase,
    },
    SelectedEffectableMixinCase: {
        mixinCase: MixinCase,
    },
    SelectedEffectablePrototypeCase: {
        prototypeCase: PrototypeCase,
    },
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Class",
    classCase: "Effect",
    yieldCase: "Success",
    mixinCase: "Two",
    prototypeCase: "Seven",
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedEffectableStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedEffectableClassCase: ({ classCase }) => ({
            model: modifyFields(model, {
                classCase: () => classCase,
            }),
        }),

        SelectedEffectableYieldCase: ({ yieldCase }) => ({
            model: modifyFields(model, {
                yieldCase: () => yieldCase,
            }),
        }),

        SelectedEffectableMixinCase: ({ mixinCase }) => ({
            model: modifyFields(model, {
                mixinCase: () => mixinCase,
            }),
        }),

        SelectedEffectablePrototypeCase: ({ prototypeCase }) => ({
            model: modifyFields(model, {
                prototypeCase: () => prototypeCase,
            }),
        }),
    })

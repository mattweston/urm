import { Option, Result, Schema as S, Utils } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Utils examples
// -----------------------------------------------------------------------------

export const single_shot = new Utils.SingleShotGen<string, number>("hello")
export const single_shot_first = single_shot.next(0)
export const single_shot_second = single_shot.next(42)

// [Symbol.iterator]() deliberately returns a fresh iterator rather than the
// already-consumed instance.
export const single_shot_fresh = single_shot[Symbol.iterator]().next(0)

// Utils.Gen is the reusable type-level signature behind generator APIs such as
// Option.gen and Result.gen.
export const option_gen: Utils.Gen<Option.OptionTypeLambda> = Option.gen
export const result_gen: Utils.Gen<Result.ResultTypeLambda> = Result.gen

export const generated_option = option_gen(function* () {
    const left = yield* Option.some(2)
    const right = yield* Option.some(3)
    return left + right
})

export const generated_result = result_gen(function* () {
    const left = yield* Result.succeed(2)
    const right = yield* Result.succeed(3)
    return left + right
})

// Variance is a type-level marker. This runtime object is only a concrete
// witness of that interface so the individual variance slots can be inspected.
export const variance_witness: Utils.Variance<
    Option.OptionTypeLambda,
    unknown,
    string,
    "ParseError"
> = {
    _F: (value) => value,
    _R: () => {},
    _O: () => "output",
    _E: () => "ParseError",
}

export const variance_outputs = {
    output: variance_witness._O(undefined as never),
    error: variance_witness._E(undefined as never),
}

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["SingleShot", "Gen", "Variance"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = ["SingleShot", "Gen", "Variance"]

export const SingleValue = S.Literals(["hello", "effect", "yield*"])
export type SingleValue = typeof SingleValue.Type

export const ReturnValue = S.Literals([7, 42, 99])
export type ReturnValue = typeof ReturnValue.Type

export const GenKind = S.Literals(["Option", "Result"])
export type GenKind = typeof GenKind.Type

export const VarianceSlot = S.Literals(["F", "R", "O", "E"])
export type VarianceSlot = typeof VarianceSlot.Type

export const Model = S.Struct({
    stage: Stage,
    singleValue: SingleValue,
    returnValue: ReturnValue,
    genKind: GenKind,
    genFails: S.Boolean,
    varianceSlot: VarianceSlot,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedUtilsStage: {
        stage: Stage,
    },
    SelectedUtilsSingleValue: {
        singleValue: SingleValue,
    },
    SelectedUtilsReturnValue: {
        returnValue: ReturnValue,
    },
    SelectedUtilsGenKind: {
        genKind: GenKind,
    },
    ToggledUtilsGenFailure: {},
    SelectedUtilsVarianceSlot: {
        varianceSlot: VarianceSlot,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "SingleShot",
    singleValue: "hello",
    returnValue: 42,
    genKind: "Option",
    genFails: false,
    varianceSlot: "O",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
    Message.match<UpdateReturn>(message, {
        SelectedUtilsStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedUtilsSingleValue: ({ singleValue }) => ({
            model: modifyFields(model, {
                singleValue: () => singleValue,
            }),
        }),

        SelectedUtilsReturnValue: ({ returnValue }) => ({
            model: modifyFields(model, {
                returnValue: () => returnValue,
            }),
        }),

        SelectedUtilsGenKind: ({ genKind }) => ({
            model: modifyFields(model, {
                genKind: () => genKind,
            }),
        }),

        ToggledUtilsGenFailure: () => ({
            model: modifyFields(model, {
                genFails: (value) => !value,
            }),
        }),

        SelectedUtilsVarianceSlot: ({ varianceSlot }) => ({
            model: modifyFields(model, {
                varianceSlot: () => varianceSlot,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export type SingleShotTrace = Readonly<{
    first: string
    second: string
    third: string
    fresh: string
}>

const iterator_result_label = <T, A>(result: IteratorResult<T, A>): string =>
    JSON.stringify(result)

export const singleShotTrace = (
    value: SingleValue,
    returnValue: ReturnValue
): SingleShotTrace => {
    const iterator = new Utils.SingleShotGen<SingleValue, number>(value)

    const first = iterator.next(0)
    const second = iterator.next(returnValue)
    const third = iterator.next(returnValue + 1)
    const fresh = iterator[Symbol.iterator]().next(0)

    return {
        first: iterator_result_label(first),
        second: iterator_result_label(second),
        third: iterator_result_label(third),
        fresh: iterator_result_label(fresh),
    }
}

export const optionGenResult = (shouldFail: boolean): Option.Option<number> =>
    option_gen(function* () {
        const left = yield* Option.some(2)

        if (shouldFail) {
            return yield* Option.none<number>()
        }

        const right = yield* Option.some(3)
        return left + right
    })

export const resultGenResult = (
    shouldFail: boolean
): Result.Result<number, string> =>
    result_gen(function* () {
        const left = yield* Result.succeed(2)

        if (shouldFail) {
            return yield* Result.fail("boom")
        }

        const right = yield* Result.succeed(3)
        return left + right
    })

export const genResultLabel = (kind: GenKind, shouldFail: boolean): string => {
    if (kind === "Option") {
        return Option.match(optionGenResult(shouldFail), {
            onNone: () => "Option.none()",
            onSome: (value) => `Option.some(${value})`,
        })
    }

    return Result.match(resultGenResult(shouldFail), {
        onFailure: (error) => `Result.fail(${JSON.stringify(error)})`,
        onSuccess: (value) => `Result.succeed(${value})`,
    })
}

export const genRule = (kind: GenKind): string =>
    kind === "Option"
        ? "Option.gen stops at the first None; otherwise yielded values are fed back into the generator."
        : "Result.gen stops at the first Failure; otherwise success values are fed back into the generator."

export type VarianceDetails = Readonly<{
    label: string
    signature: string
    direction: string
    role: string
}>

export const varianceDetails = (slot: VarianceSlot): VarianceDetails => {
    switch (slot) {
        case "F":
            return {
                label: "_F · type constructor",
                signature: "Types.Invariant<F>",
                direction: "invariant",
                role: "The TypeLambda itself must match exactly; Gen cannot silently swap one constructor for another.",
            }
        case "R":
            return {
                label: "_R · input / requirements",
                signature: "Types.Contravariant<R>",
                direction: "contravariant",
                role: "The input or environment channel flows in the opposite subtype direction.",
            }
        case "O":
            return {
                label: "_O · output channel",
                signature: "Types.Covariant<O>",
                direction: "covariant",
                role: "Additional output information widens in the ordinary subtype direction.",
            }
        case "E":
            return {
                label: "_E · error channel",
                signature: "Types.Covariant<E>",
                direction: "covariant",
                role: "Error information is accumulated as an output-like channel during generator inference.",
            }
    }
}

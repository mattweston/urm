import { Combiner, Reducer, Schema as S, UndefinedOr } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 UndefinedOr examples
// -----------------------------------------------------------------------------

export const mapped_defined = UndefinedOr.map(4, (value) => value * 2)
export const mapped_undefined = UndefinedOr.map(
    undefined as number | undefined,
    (value) => value * 2
)

export const matched_defined = UndefinedOr.match(4, {
    onUndefined: () => "missing",
    onDefined: (value) => `value:${value}`,
})

export const matched_undefined = UndefinedOr.match(
    undefined as number | undefined,
    {
        onUndefined: () => "missing",
        onDefined: (value) => `value:${value}`,
    }
)

export const parse_number = UndefinedOr.liftThrowable((text: string) => {
    const value: unknown = JSON.parse(text)
    if (typeof value !== "number") {
        throw new TypeError("Expected a JSON number")
    }
    return value
})

export const parsed_number = parse_number("42")
export const parsed_failure = parse_number("not-json")

export const Sum = Combiner.make<number>((self, that) => self + that)
export const SumReducer = Reducer.make<number>((self, that) => self + that, 0)

export const UndefinedOrSum = UndefinedOr.makeReducer(Sum)
export const UndefinedOrSumFailFast =
    UndefinedOr.makeReducerFailFast(SumReducer)
export const UndefinedOrSumCombinerFailFast =
    UndefinedOr.makeCombinerFailFast(Sum)

export const reduced_skipping_missing = UndefinedOrSum.combineAll([
    1,
    undefined,
    2,
    undefined,
    3,
])

export const reduced_fail_fast = UndefinedOrSumFailFast.combineAll([
    1,
    undefined,
    2,
    3,
])

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Map", "Match", "Throwable", "Reduce"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Map",
    "Match",
    "Throwable",
    "Reduce",
]

export const Presence = S.Literals(["Defined", "Undefined"])
export type Presence = typeof Presence.Type

export const Model = S.Struct({
    stage: Stage,
    presence: Presence,
    throwableInput: S.String,
    hasFirst: S.Boolean,
    hasSecond: S.Boolean,
    hasThird: S.Boolean,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedUndefinedOrStage: {
        stage: Stage,
    },
    SelectedUndefinedOrPresence: {
        presence: Presence,
    },
    UpdatedUndefinedOrThrowableInput: {
        value: S.String,
    },
    ToggledUndefinedOrFirst: {},
    ToggledUndefinedOrSecond: {},
    ToggledUndefinedOrThird: {},
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Map",
    presence: "Defined",
    throwableInput: "42",
    hasFirst: true,
    hasSecond: false,
    hasThird: true,
})

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedUndefinedOrStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),
        SelectedUndefinedOrPresence: ({ presence }) => ({
            model: modifyFields(model, {
                presence: () => presence,
            }),
        }),
        UpdatedUndefinedOrThrowableInput: ({ value }) => ({
            model: modifyFields(model, {
                throwableInput: () => value,
            }),
        }),
        ToggledUndefinedOrFirst: () => ({
            model: modifyFields(model, {
                hasFirst: (value) => !value,
            }),
        }),
        ToggledUndefinedOrSecond: () => ({
            model: modifyFields(model, {
                hasSecond: (value) => !value,
            }),
        }),
        ToggledUndefinedOrThird: () => ({
            model: modifyFields(model, {
                hasThird: (value) => !value,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const presenceValue = (presence: Presence): number | undefined =>
    presence === "Defined" ? 4 : undefined

export const valueLabel = (value: unknown): string =>
    value === undefined
        ? "undefined"
        : typeof value === "string"
          ? JSON.stringify(value)
          : String(value)

export const mapResult = (
    presence: Presence
): Readonly<{
    input: number | undefined
    output: number | undefined
    expression: string
}> => {
    const input = presenceValue(presence)
    return {
        input,
        output: UndefinedOr.map(input, (value) => value * 2),
        expression: "UndefinedOr.map(value, n => n * 2)",
    }
}

export const matchResult = (
    presence: Presence
): Readonly<{
    input: number | undefined
    output: string
}> => {
    const input = presenceValue(presence)
    return {
        input,
        output: UndefinedOr.match(input, {
            onUndefined: () => "onUndefined() → missing",
            onDefined: (value) => `onDefined(${value}) → ${value * 2}`,
        }),
    }
}

const thrownLabel = (thunk: () => unknown): string => {
    try {
        const value = thunk()
        return `returned ${valueLabel(value)}`
    } catch (error) {
        if (error instanceof Error) {
            return `threw ${error.name}: ${error.message}`
        }
        return `threw ${String(error)}`
    }
}

export const getterResults = (
    presence: Presence
): Readonly<{
    defaultGetter: string
    customGetter: string
}> => {
    const input = presenceValue(presence)
    return {
        defaultGetter: thrownLabel(() => UndefinedOr.getOrThrow(input)),
        customGetter: thrownLabel(() =>
            UndefinedOr.getOrThrowWith(
                input,
                () => new RangeError("Value was required")
            )
        ),
    }
}

export const throwableResult = (
    input: string
): Readonly<{
    output: number | undefined
    detail: string
}> => {
    const output = parse_number(input)
    return {
        output,
        detail:
            output === undefined
                ? "The wrapped function threw, so liftThrowable returned undefined and discarded the thrown error."
                : "The wrapped function completed normally, so its number result is preserved.",
    }
}

export const reducerValues = (
    model: Model
): ReadonlyArray<number | undefined> => [
    model.hasFirst ? 1 : undefined,
    model.hasSecond ? 2 : undefined,
    model.hasThird ? 3 : undefined,
]

export const reducerResults = (
    model: Model
): Readonly<{
    values: ReadonlyArray<number | undefined>
    keepDefined: number | undefined
    failFastReducer: number | undefined
    failFastCombiner: number | undefined
}> => {
    const values = reducerValues(model)
    const [first, second] = values

    return {
        values,
        keepDefined: UndefinedOrSum.combineAll(values),
        failFastReducer: UndefinedOrSumFailFast.combineAll(values),
        failFastCombiner: UndefinedOrSumCombinerFailFast.combine(first, second),
    }
}

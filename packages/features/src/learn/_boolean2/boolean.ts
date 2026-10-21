import { Boolean as Bool, Match, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Real Effect 4 Boolean examples
// -----------------------------------------------------------------------------

export const coercion_examples = {
    one: Bool.Boolean(1),
    zero: Bool.Boolean(0),
    nonEmptyFalse: Bool.Boolean("false"),
    emptyString: Bool.Boolean(""),
}

export const guard_examples = {
    boolean: Bool.isBoolean(true),
    string: Bool.isBoolean("true"),
}

export const logic_examples = {
    not: Bool.not(true),
    and: Bool.and(true, false),
    nand: Bool.nand(true, false),
    or: Bool.or(true, false),
    nor: Bool.nor(false, false),
    xor: Bool.xor(true, false),
    eqv: Bool.eqv(true, true),
    implies: Bool.implies(true, false),
}

export const matched = Bool.match(true, {
    onFalse: () => "off",
    onTrue: () => "on",
})

export const ordered = {
    falseBeforeTrue: Bool.Order(false, true),
    trueAfterFalse: Bool.Order(true, false),
    same: Bool.Order(true, true),
}

export const equivalent = {
    same: Bool.Equivalence(true, true),
    different: Bool.Equivalence(true, false),
}

export const aggregate_examples = {
    every: Bool.every([true, true, false]),
    some: Bool.some([false, false, true]),
    reducerAnd: Bool.ReducerAnd.combineAll([true, true, false]),
    reducerOr: Bool.ReducerOr.combineAll([false, false, true]),
}

// -----------------------------------------------------------------------------
// Teaching demo
// -----------------------------------------------------------------------------

export const Stage = S.Literals(["Coerce", "Logic", "Match", "Aggregate"])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Coerce",
    "Logic",
    "Match",
    "Aggregate",
]

export const CoerceCase = S.Literals([
    "True",
    "False",
    "One",
    "Zero",
    "FalseString",
    "EmptyString",
])
export type CoerceCase = typeof CoerceCase.Type

export const LogicMode = S.Literals([
    "And",
    "Nand",
    "Or",
    "Nor",
    "Xor",
    "Eqv",
    "Implies",
])
export type LogicMode = typeof LogicMode.Type

export const AggregatePreset = S.Literals([
    "AllTrue",
    "Mixed",
    "AllFalse",
    "Empty",
])
export type AggregatePreset = typeof AggregatePreset.Type

export const AggregateMode = S.Literals([
    "Every",
    "Some",
    "ReducerAnd",
    "ReducerOr",
])
export type AggregateMode = typeof AggregateMode.Type

export const Model = S.Struct({
    stage: Stage,

    coerceCase: CoerceCase,

    logicMode: LogicMode,
    logicLeft: S.Boolean,
    logicRight: S.Boolean,

    matchValue: S.Boolean,
    orderOther: S.Boolean,

    aggregatePreset: AggregatePreset,
    aggregateMode: AggregateMode,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
    SelectedBooleanStage: {
        stage: Stage,
    },

    SelectedBooleanCoerceCase: {
        coerceCase: CoerceCase,
    },

    SelectedBooleanLogicMode: {
        logicMode: LogicMode,
    },
    ToggledBooleanLogicLeft: {},
    ToggledBooleanLogicRight: {},

    ToggledBooleanMatchValue: {},
    ToggledBooleanOrderOther: {},

    SelectedBooleanAggregatePreset: {
        aggregatePreset: AggregatePreset,
    },
    SelectedBooleanAggregateMode: {
        aggregateMode: AggregateMode,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Coerce",

    coerceCase: "FalseString",

    logicMode: "Xor",
    logicLeft: true,
    logicRight: false,

    matchValue: true,
    orderOther: false,

    aggregatePreset: "Mixed",
    aggregateMode: "Every",
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
    Message.match<UpdateReturn>(message, {
        SelectedBooleanStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedBooleanCoerceCase: ({ coerceCase }) => ({
            model: modifyFields(model, {
                coerceCase: () => coerceCase,
            }),
        }),

        SelectedBooleanLogicMode: ({ logicMode }) => ({
            model: modifyFields(model, {
                logicMode: () => logicMode,
            }),
        }),

        ToggledBooleanLogicLeft: () => ({
            model: modifyFields(model, {
                logicLeft: (value) => !value,
            }),
        }),

        ToggledBooleanLogicRight: () => ({
            model: modifyFields(model, {
                logicRight: (value) => !value,
            }),
        }),

        ToggledBooleanMatchValue: () => ({
            model: modifyFields(model, {
                matchValue: (value) => !value,
            }),
        }),

        ToggledBooleanOrderOther: () => ({
            model: modifyFields(model, {
                orderOther: (value) => !value,
            }),
        }),

        SelectedBooleanAggregatePreset: ({ aggregatePreset }) => ({
            model: modifyFields(model, {
                aggregatePreset: () => aggregatePreset,
            }),
        }),

        SelectedBooleanAggregateMode: ({ aggregateMode }) => ({
            model: modifyFields(model, {
                aggregateMode: () => aggregateMode,
            }),
        }),
    })

// -----------------------------------------------------------------------------
// Pure visual helpers
// -----------------------------------------------------------------------------

export const coerceInput = (coerceCase: CoerceCase): unknown => {
    switch (coerceCase) {
        case "True":
            return true
        case "False":
            return false
        case "One":
            return 1
        case "Zero":
            return 0
        case "FalseString":
            return "false"
        case "EmptyString":
            return ""
    }
}

export const coerceInputLabel = (coerceCase: CoerceCase): string => {
    const input = coerceInput(coerceCase)

    return typeof input === "string" ? JSON.stringify(input) : String(input)
}

export const coerceResult = (
    coerceCase: CoerceCase
): Readonly<{
    coerced: boolean
    guard: boolean
    detail: string
}> => {
    const input = coerceInput(coerceCase)

    return {
        coerced: Bool.Boolean(input),
        guard: Bool.isBoolean(input),
        detail:
            coerceCase === "FalseString"
                ? 'Native truthiness: the non-empty string "false" coerces to true.'
                : "Boolean.Boolean uses JavaScript truthiness; isBoolean only narrows actual boolean values.",
    }
}

export const logicResult = (
    mode: LogicMode,
    left: boolean,
    right: boolean
): Readonly<{
    expression: string
    output: boolean
    rule: string
}> => {
    switch (mode) {
        case "And":
            return {
                expression: `Boolean.and(${left}, ${right})`,
                output: Bool.and(left, right),
                rule: "true only when both operands are true",
            }

        case "Nand":
            return {
                expression: `Boolean.nand(${left}, ${right})`,
                output: Bool.nand(left, right),
                rule: "the negation of AND",
            }

        case "Or":
            return {
                expression: `Boolean.or(${left}, ${right})`,
                output: Bool.or(left, right),
                rule: "true when either operand is true",
            }

        case "Nor":
            return {
                expression: `Boolean.nor(${left}, ${right})`,
                output: Bool.nor(left, right),
                rule: "true only when both operands are false",
            }

        case "Xor":
            return {
                expression: `Boolean.xor(${left}, ${right})`,
                output: Bool.xor(left, right),
                rule: "true when exactly one operand is true",
            }

        case "Eqv":
            return {
                expression: `Boolean.eqv(${left}, ${right})`,
                output: Bool.eqv(left, right),
                rule: "true when both operands have the same truth value",
            }

        case "Implies":
            return {
                expression: `Boolean.implies(${left}, ${right})`,
                output: Bool.implies(left, right),
                rule: "logical implication: !left || right",
            }
    }
}

export const truthTable = (
    mode: LogicMode
): ReadonlyArray<readonly [boolean, boolean, boolean]> =>
    [
        [false, false],
        [false, true],
        [true, false],
        [true, true],
    ].map(
        ([left, right]) =>
            [left, right, logicResult(mode, left, right).output] as const
    )

export const matchResult = (value: boolean): string =>
    Bool.match(value, {
        onFalse: () => "onFalse() → disabled",
        onTrue: () => "onTrue() → enabled",
    })

export const orderResult = (
    left: boolean,
    right: boolean
): Readonly<{
    order: number
    equivalent: boolean
}> => ({
    order: Bool.Order(left, right),
    equivalent: Bool.Equivalence(left, right),
})

export const aggregateValues = (
    preset: AggregatePreset
): ReadonlyArray<boolean> => {
    switch (preset) {
        case "AllTrue":
            return [true, true, true]
        case "Mixed":
            return [true, true, false, true]
        case "AllFalse":
            return [false, false, false]
        case "Empty":
            return []
    }
}

export const aggregateResult = (
    mode: AggregateMode,
    preset: AggregatePreset
): Readonly<{
    expression: string
    output: boolean
    visited: number
    detail: string
}> => {
    const values = aggregateValues(preset)

    let visited = 0

    function* traced(): Generator<boolean> {
        for (const value of values) {
            visited += 1
            yield value
        }
    }

    switch (mode) {
        case "Every": {
            const output = Bool.every(traced())

            return {
                expression: `Boolean.every(${JSON.stringify(values)})`,
                output,
                visited,
                detail: "every short-circuits as soon as it finds false. On an empty iterable it returns true.",
            }
        }

        case "Some": {
            const output = Bool.some(traced())

            return {
                expression: `Boolean.some(${JSON.stringify(values)})`,
                output,
                visited,
                detail: "some short-circuits as soon as it finds true. On an empty iterable it returns false.",
            }
        }

        case "ReducerAnd": {
            const output = Bool.ReducerAnd.combineAll(traced())

            return {
                expression: `Boolean.ReducerAnd.combineAll(${JSON.stringify(values)})`,
                output,
                visited,
                detail: "ReducerAnd starts from true and folds every value; unlike every, combineAll does not short-circuit.",
            }
        }

        case "ReducerOr": {
            const output = Bool.ReducerOr.combineAll(traced())

            return {
                expression: `Boolean.ReducerOr.combineAll(${JSON.stringify(values)})`,
                output,
                visited,
                detail: "ReducerOr starts from false and folds every value; unlike some, combineAll does not short-circuit.",
            }
        }
    }
}

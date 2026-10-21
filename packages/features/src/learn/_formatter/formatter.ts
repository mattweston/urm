import { Formatter, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DEMO VALUES
// -----------------------------------------------------------------------------

type CircularRecord = {
    name: string
    self?: CircularRecord
}

class UserCard {
    constructor(
        readonly id: number,
        readonly name: string
    ) {}

    toString(): string {
        return `UserCard#${this.id}:${this.name}`
    }
}

class PlainBox {
    constructor(readonly value: number) {}
}

const make_circular = (): CircularRecord => {
    const value: CircularRecord = {
        name: "loop",
    }

    value.self = value
    return value
}

const error_with_cause = (): Error => {
    const error = new Error("outer failure")

    error.cause = new Error("inner failure")

    return error
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Values"),
    S.Literal("Special"),
    S.Literal("Options"),
    S.Literal("JSON"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Values",
    "Special",
    "Options",
    "JSON",
]

export const ValueCase = S.Union([
    S.Literal("Primitives"),
    S.Literal("Collections"),
    S.Literal("Objects"),
])
export type ValueCase = typeof ValueCase.Type

export const SpecialCase = S.Union([
    S.Literal("Circular"),
    S.Literal("Error"),
    S.Literal("Class"),
])
export type SpecialCase = typeof SpecialCase.Type

export const OptionCase = S.Union([
    S.Literal("Compact"),
    S.Literal("Pretty"),
    S.Literal("IgnoreToString"),
])
export type OptionCase = typeof OptionCase.Type

export const JsonCase = S.Union([
    S.Literal("Object"),
    S.Literal("Circular"),
    S.Literal("BigInt"),
    S.Literal("UnsupportedRoot"),
])
export type JsonCase = typeof JsonCase.Type

export const Model = S.Struct({
    stage: Stage,
    valueCase: ValueCase,
    specialCase: SpecialCase,
    optionCase: OptionCase,
    jsonCase: JsonCase,
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
    Values: {
        eyebrow: "human-readable diagnostics",
        title: "format handles more JavaScript values than JSON.stringify",
        description:
            "Formatter.format is for logs, diagnostics, and error messages. It understands primitives, BigInt, Symbol, arrays, objects, Date, RegExp, Set, Map, class instances, and other iterables.",
        code: `Formatter.format({
    string: "hello",
    bigint: 42n,
    date: new Date(0),
    regexp: /effect/gi,
    set: new Set([1, 2]),
    map: new Map([
        ["a", 1],
        ["b", 2]
    ])
})`,
        apis: ["Formatter.format", "Formatter.Formatter"],
        notice: "format is diagnostic text, not a JSON serializer. Strings are quoted, BigInt gets an n suffix, and richer runtime values keep representations that JSON cannot express directly.",
    },

    Special: {
        eyebrow: "defensive inspection",
        title: "Circular data and unusual objects are rendered instead of crashing",
        description:
            "format tracks object ancestry, reports circular references as [Circular], respects custom toString methods, includes Error causes, and wraps ordinary class instances with their constructor name.",
        code: `const loop = {
    name: "loop"
}
loop.self = loop

Formatter.format(loop)
// {"name":"loop","self":[Circular]}

const error =
    new Error("outer", {
        cause: new Error("inner")
    })

Formatter.format(error)
// Error: outer (cause: Error: inner)`,
        apis: ["Formatter.format"],
        notice: "Inspection is defensive: failures from property access, own-key discovery, or custom toString are converted to diagnostic placeholders instead of being rethrown by the formatter.",
    },

    Options: {
        eyebrow: "presentation controls",
        title: "space controls indentation; ignoreToString exposes object structure",
        description:
            "Compact output is the default. A numeric or string space value enables indentation. ignoreToString skips custom toString methods, letting class fields be inspected structurally instead.",
        code: `const user =
    new UserCard(
        7,
        "Ada"
    )

Formatter.format(user)
// UserCard#7:Ada

Formatter.format(
    user,
    {
        ignoreToString: true,
        space: 2
    }
)
// UserCard({
//   "id": 7,
//   "name": "Ada"
// })`,
        apis: ["Formatter.format", "Formatter.Formatter"],
        notice: "Pretty-printing only changes layout. ignoreToString changes which representation wins: when true, a custom object's fields are inspected rather than calling its custom toString.",
    },

    JSON: {
        eyebrow: "safe JSON serialization",
        title: "formatJson returns parseable JSON while dropping circular links",
        description:
            "formatJson wraps JSON.stringify with circular-reference handling, automatic redaction support, BigInt conversion, and a stable null result for unsupported root values.",
        code: `const loop = {
    name: "test"
}
loop.self = loop

Formatter.formatJson(loop)
// {"name":"test"}

Formatter.formatJson({
    count: 12n
})
// {"count":"12n"}

Formatter.formatJson(
    undefined
)
// null`,
        apis: ["Formatter.formatJson", "Formatter.Formatter"],
        notice: 'Circular object properties are omitted rather than replaced with [Circular]. BigInt becomes a JSON string with an n suffix. Root undefined, Symbol, and function values become the string "null".',
    },
}

// -----------------------------------------------------------------------------
// VALUES SNAPSHOT
// -----------------------------------------------------------------------------

export type ValuesSnapshot = Readonly<{
    mode: ValueCase
    rows: ReadonlyArray<
        Readonly<{
            label: string
            output: string
        }>
    >
    customFormatter: string
}>

export const values_snapshot = (model: Model): ValuesSnapshot => {
    const upper: Formatter.Formatter<string> = (value: string) =>
        value.toUpperCase()

    if (model.valueCase === "Collections") {
        return {
            mode: model.valueCase,
            rows: [
                {
                    label: "Set",
                    output: Formatter.format(new Set([1, 2])),
                },
                {
                    label: "Map",
                    output: Formatter.format(
                        new Map({ model: ["a", 1], commands: ["b", 2] })
                    ),
                },
                {
                    label: "Array",
                    output: Formatter.format(["a", 2, true]),
                },
            ],
            customFormatter: upper("effect"),
        }
    }

    if (model.valueCase === "Objects") {
        return {
            mode: model.valueCase,
            rows: [
                {
                    label: "Date",
                    output: Formatter.format(new Date(0)),
                },
                {
                    label: "RegExp",
                    output: Formatter.format(/effect/gi),
                },
                {
                    label: "PlainBox",
                    output: Formatter.format(new PlainBox(7)),
                },
            ],
            customFormatter: upper("formatter"),
        }
    }

    return {
        mode: model.valueCase,
        rows: [
            {
                label: "string",
                output: Formatter.format("hello"),
            },
            {
                label: "number",
                output: Formatter.format(42),
            },
            {
                label: "BigInt",
                output: Formatter.format(42n),
            },
            {
                label: "Symbol",
                output: Formatter.format(Symbol.for("demo")),
            },
        ],
        customFormatter: upper("effect"),
    }
}

// -----------------------------------------------------------------------------
// SPECIAL SNAPSHOT
// -----------------------------------------------------------------------------

export type SpecialSnapshot = Readonly<{
    mode: SpecialCase
    inputLabel: string
    output: string
    secondary: string
    safety: string
}>

export const special_snapshot = (model: Model): SpecialSnapshot => {
    if (model.specialCase === "Error") {
        const error = error_with_cause()

        return {
            mode: model.specialCase,
            inputLabel: "Error with cause",
            output: Formatter.format(error),
            secondary: Formatter.format(new Error("plain")),
            safety: "cause included when defined",
        }
    }

    if (model.specialCase === "Class") {
        const user = new UserCard(7, "Ada")

        const plain = new PlainBox(9)

        return {
            mode: model.specialCase,
            inputLabel: "custom toString + plain class",
            output: Formatter.format(user),
            secondary: Formatter.format(plain),
            safety: "custom toString wins by default",
        }
    }

    const circular = make_circular()

    return {
        mode: model.specialCase,
        inputLabel: "self-referencing object",
        output: Formatter.format(circular),
        secondary: "[Circular] marker",
        safety: "does not throw on cycle",
    }
}

// -----------------------------------------------------------------------------
// OPTIONS SNAPSHOT
// -----------------------------------------------------------------------------

export type OptionsSnapshot = Readonly<{
    mode: OptionCase
    compact: string
    selected: string
    customToString: string
    structured: string
    spacing: string
}>

export const options_snapshot = (model: Model): OptionsSnapshot => {
    const object = {
        a: 1,
        b: [2, 3],
    }

    const user = new UserCard(7, "Ada")

    const compact = Formatter.format(object)

    const pretty = Formatter.format(object, {
        space: 2,
    })

    const customToString = Formatter.format(user)

    const structured = Formatter.format(user, {
        ignoreToString: true,
        space: 2,
    })

    return {
        mode: model.optionCase,
        compact,
        selected:
            model.optionCase === "Pretty"
                ? pretty
                : model.optionCase === "IgnoreToString"
                  ? structured
                  : compact,
        customToString,
        structured,
        spacing:
            model.optionCase === "Pretty"
                ? "2 spaces"
                : model.optionCase === "IgnoreToString"
                  ? "2 spaces + ignoreToString"
                  : "0 / compact",
    }
}

// -----------------------------------------------------------------------------
// JSON SNAPSHOT
// -----------------------------------------------------------------------------

export type JsonSnapshot = Readonly<{
    mode: JsonCase
    output: string
    parseable: boolean
    diagnosticFormat: string
    difference: string
}>

const is_parseable_json = (text: string): boolean => {
    try {
        JSON.parse(text)
        return true
    } catch {
        return false
    }
}

export const json_snapshot = (model: Model): JsonSnapshot => {
    if (model.jsonCase === "Circular") {
        const circular = make_circular()

        const output = Formatter.formatJson(circular)

        return {
            mode: model.jsonCase,
            output,
            parseable: is_parseable_json(output),
            diagnosticFormat: Formatter.format(circular),
            difference: "JSON omits cycle; format shows [Circular]",
        }
    }

    if (model.jsonCase === "BigInt") {
        const value = {
            count: 12n,
        }

        const output = Formatter.formatJson(value)

        return {
            mode: model.jsonCase,
            output,
            parseable: is_parseable_json(output),
            diagnosticFormat: Formatter.format(value),
            difference: 'BigInt becomes JSON string "12n"',
        }
    }

    if (model.jsonCase === "UnsupportedRoot") {
        const output = Formatter.formatJson(undefined)

        return {
            mode: model.jsonCase,
            output,
            parseable: is_parseable_json(output),
            diagnosticFormat: Formatter.format(undefined),
            difference: "unsupported JSON root normalizes to null",
        }
    }

    const value = {
        name: "Ada",
        age: 36,
    }

    const output = Formatter.formatJson(value, {
        space: 2,
    })

    return {
        mode: model.jsonCase,
        output,
        parseable: is_parseable_json(output),
        diagnosticFormat: Formatter.format(value, {
            space: 2,
        }),
        difference: "both readable; JSON is guaranteed parseable",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedFormatterStage: {
        stage: Stage,
    },
    SelectedFormatterValueCase: {
        valueCase: ValueCase,
    },
    SelectedFormatterSpecialCase: {
        specialCase: SpecialCase,
    },
    SelectedFormatterOptionCase: {
        optionCase: OptionCase,
    },
    SelectedFormatterJsonCase: {
        jsonCase: JsonCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Values",
    valueCase: "Primitives",
    specialCase: "Circular",
    optionCase: "Compact",
    jsonCase: "Object",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type ValueCasePayload = Readonly<{
    valueCase: ValueCase
}>

type SpecialCasePayload = Readonly<{
    specialCase: SpecialCase
}>

type OptionCasePayload = Readonly<{
    optionCase: OptionCase
}>

type JsonCasePayload = Readonly<{
    jsonCase: JsonCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedFormatterStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedFormatterValueCase: ({ valueCase }: ValueCasePayload) => ({
            model: evo(model, {
                valueCase: () => valueCase,
            }),
        }),

        SelectedFormatterSpecialCase: ({
            specialCase,
        }: SpecialCasePayload) => ({
            model: evo(model, {
                specialCase: () => specialCase,
            }),
        }),

        SelectedFormatterOptionCase: ({ optionCase }: OptionCasePayload) => ({
            model: evo(model, {
                optionCase: () => optionCase,
            }),
        }),

        SelectedFormatterJsonCase: ({ jsonCase }: JsonCasePayload) => ({
            model: evo(model, {
                jsonCase: () => jsonCase,
            }),
        }),
    })

import { Formatter, Inspectable, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DEMO TYPES
// -----------------------------------------------------------------------------

export class User extends Inspectable.Class {
    constructor(
        readonly id: number,
        readonly name: string,
        readonly email: string
    ) {
        super()
    }

    toJSON(): Readonly<{
        _tag: "User"
        id: number
        name: string
        email: string
    }> {
        return {
            _tag: "User",
            id: this.id,
            name: this.name,
            email: this.email,
        }
    }
}

export class OperationResult implements Inspectable.Inspectable {
    constructor(
        readonly status: "Success" | "Failure",
        readonly value: unknown
    ) {}

    toJSON(): Readonly<{
        _tag: "Success" | "Failure"
        value: unknown
    }> {
        return {
            _tag: this.status,
            value: this.value,
        }
    }

    toString(): string {
        return Formatter.format(this.toJSON())
    }

    [Inspectable.NodeInspectSymbol](): unknown {
        return this.toJSON()
    }
}

type ProtoValue = Inspectable.Inspectable & {
    label: string
    count: number
}

const make_proto_value = (): ProtoValue => {
    const value = Object.create(Inspectable.BaseProto) as ProtoValue

    value.label = "jobs"
    value.count = 3
    value.toJSON = (): Readonly<{
        _tag: "Counter"
        label: string
        count: number
    }> => ({
        _tag: "Counter",
        label: value.label,
        count: value.count,
    })

    return value
}

const display_unknown = (value: unknown): string =>
    Formatter.format(value, {
        space: 0,
    })

type SymbolMethodTable = Readonly<{
    [key: symbol]: () => unknown
}>

const node_inspect_symbol: symbol = Inspectable.NodeInspectSymbol

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Convert"),
    S.Literal("Class"),
    S.Literal("Custom"),
    S.Literal("Prototype"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Convert",
    "Class",
    "Custom",
    "Prototype",
]

export const ConvertCase = S.Union([
    S.Literal("ToJson"),
    S.Literal("UnknownString"),
    S.Literal("Failure"),
])
export type ConvertCase = typeof ConvertCase.Type

export const ClassCase = S.Union([
    S.Literal("String"),
    S.Literal("Json"),
    S.Literal("Node"),
])
export type ClassCase = typeof ClassCase.Type

export const CustomCase = S.Union([S.Literal("Interface"), S.Literal("Symbol")])
export type CustomCase = typeof CustomCase.Type

export const PrototypeCase = S.Union([S.Literal("Override"), S.Literal("Bare")])
export type PrototypeCase = typeof PrototypeCase.Type

export const Model = S.Struct({
    stage: Stage,
    convertCase: ConvertCase,
    classCase: ClassCase,
    customCase: CustomCase,
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
    Convert: {
        eyebrow: "safe unknown conversion",
        title: "Convert values to structured inspection data or diagnostic strings",
        description:
            "toJson applies redaction, calls zero-argument toJSON methods, recursively handles arrays, and converts inspection failures into a placeholder. toStringUnknown chooses JSON-like object formatting or general diagnostic formatting.",
        code: `const value = {
    toJSON: () => ({
        _tag: "Point",
        x: 2,
        y: 4
    })
}

Inspectable.toJson(value)
// { _tag: "Point", x: 2, y: 4 }

Inspectable.toStringUnknown({
    ok: true,
    count: 2
})
// pretty JSON diagnostic string`,
        apis: ["Inspectable.toJson", "Inspectable.toStringUnknown"],
        notice: "toJson is not a guarantee of JSON-serializable output: plain objects are returned unchanged and may still contain BigInt, functions, or cycles. Its purpose is safe structured inspection, not strict JSON encoding.",
    },

    Class: {
        eyebrow: "one method to implement",
        title: "Inspectable.Class derives toString and Node inspection from toJSON",
        description:
            "Extend Class and implement only toJSON. The base class formats that representation for toString and returns the same structured value through NodeInspectSymbol.",
        code: `class User
    extends Inspectable.Class
{
    constructor(
        readonly id: number,
        readonly name: string
    ) {
        super()
    }

    toJSON() {
        return {
            _tag: "User",
            id: this.id,
            name: this.name
        }
    }
}

const user =
    new User(1, "Alice")

user.toString()
user[Inspectable.NodeInspectSymbol]()`,
        apis: ["Inspectable.Class", "Inspectable.NodeInspectSymbol"],
        notice: "Class does not decide your data shape. toJSON remains abstract; the inherited methods only determine how that chosen representation is rendered for diagnostics and Node.js inspection.",
    },

    Custom: {
        eyebrow: "manual inspection contract",
        title: "Implement Inspectable directly when each representation needs custom control",
        description:
            "The Inspectable interface requires toString, toJSON, and the NodeInspectSymbol method. The symbol is Node.js's globally registered custom-inspection hook used by util.inspect and the REPL.",
        code: `class Result
    implements
        Inspectable.Inspectable
{
    toJSON() {
        return {
            _tag: "Success",
            value: 42
        }
    }

    toString(): string {
        return Formatter.format(
            this.toJSON()
        )
    }

    [Inspectable.NodeInspectSymbol]() {
        return this.toJSON()
    }
}`,
        apis: ["Inspectable.Inspectable", "Inspectable.NodeInspectSymbol"],
        notice: 'NodeInspectSymbol is Symbol.for("nodejs.util.inspect.custom"). The interface can return any unknown inspection value; it does not require the Node representation to be the same as toJSON.',
    },

    Prototype: {
        eyebrow: "shared prototype behavior",
        title: "BaseProto adds standard inspectable methods to plain prototype-based objects",
        description:
            "BaseProto provides toString, toJSON, and Node inspection methods. Plain objects can inherit it and supply an own toJSON method to define their structured representation.",
        code: `const value =
    Object.create(
        Inspectable.BaseProto
    )

value.label = "jobs"
value.count = 3

value.toJSON = () => ({
    _tag: "Counter",
    label: value.label,
    count: value.count
})

value.toString()
// {"_tag":"Counter",...}`,
        apis: [
            "Inspectable.BaseProto",
            "Inspectable.toJson",
            "Inspectable.NodeInspectSymbol",
        ],
        notice: 'BaseProto\'s default toJSON delegates back through toJson. A bare object that inherits BaseProto without supplying its own representation therefore falls back to the safe "[toJSON threw]" diagnostic path.',
    },
}

// -----------------------------------------------------------------------------
// CONVERT SNAPSHOT
// -----------------------------------------------------------------------------

export type ConvertSnapshot = Readonly<{
    mode: ConvertCase
    source: string
    structured: string
    text: string
    plainSameReference: boolean
    arrayStructured: string
    failureFallback: string
}>

export const convert_snapshot = (model: Model): ConvertSnapshot => {
    const custom = {
        toJSON: (): Readonly<{
            _tag: "Point"
            x: number
            y: number
        }> => ({
            _tag: "Point",
            x: 2,
            y: 4,
        }),
    }

    const structured = Inspectable.toJson(custom)

    const plain = {
        id: 7,
        label: "plain",
    }

    const plainResult = Inspectable.toJson(plain)

    const arrayResult = Inspectable.toJson([custom, 42, "hello"])

    const throws = {
        toJSON: (): never => {
            throw new Error("boom")
        },
    }

    return {
        mode: model.convertCase,
        source:
            model.convertCase === "UnknownString"
                ? "unknown object"
                : model.convertCase === "Failure"
                  ? "throwing toJSON"
                  : "object with toJSON",
        structured: display_unknown(structured),
        text:
            model.convertCase === "UnknownString"
                ? Inspectable.toStringUnknown({
                      ok: true,
                      count: 2,
                  })
                : Inspectable.toStringUnknown(42n, 0),
        plainSameReference: plainResult === plain,
        arrayStructured: display_unknown(arrayResult),
        failureFallback: String(Inspectable.toJson(throws)),
    }
}

// -----------------------------------------------------------------------------
// CLASS SNAPSHOT
// -----------------------------------------------------------------------------

export type ClassSnapshot = Readonly<{
    mode: ClassCase
    toJson: string
    toString: string
    nodeInspect: string
    jsonStringify: string
    inheritedString: boolean
    inheritedNode: boolean
}>

export const class_snapshot = (model: Model): ClassSnapshot => {
    const user = new User(1, "Alice", "alice@example.com")

    const userSymbols = user as unknown as SymbolMethodTable

    const prototypeSymbols = Inspectable.Class
        .prototype as unknown as SymbolMethodTable

    return {
        mode: model.classCase,
        toJson: display_unknown(user.toJSON()),
        toString: user.toString(),
        nodeInspect: display_unknown(userSymbols[node_inspect_symbol]()),
        jsonStringify: JSON.stringify(user),
        inheritedString: user.toString === Inspectable.Class.prototype.toString,
        inheritedNode:
            userSymbols[node_inspect_symbol] ===
            prototypeSymbols[node_inspect_symbol],
    }
}

// -----------------------------------------------------------------------------
// CUSTOM SNAPSHOT
// -----------------------------------------------------------------------------

export type CustomSnapshot = Readonly<{
    mode: CustomCase
    interfaceShape: string
    stringOutput: string
    jsonOutput: string
    nodeOutput: string
    symbolKey: string
    globalSymbolMatch: boolean
}>

export const custom_snapshot = (model: Model): CustomSnapshot => {
    const result = new OperationResult("Success", 42)

    return {
        mode: model.customCase,
        interfaceShape: "toString + toJSON + [NodeInspectSymbol]",
        stringOutput: result.toString(),
        jsonOutput: display_unknown(result.toJSON()),
        nodeOutput: display_unknown(result[Inspectable.NodeInspectSymbol]()),
        symbolKey: String(Inspectable.NodeInspectSymbol),
        globalSymbolMatch:
            Inspectable.NodeInspectSymbol ===
            Symbol.for("nodejs.util.inspect.custom"),
    }
}

// -----------------------------------------------------------------------------
// PROTOTYPE SNAPSHOT
// -----------------------------------------------------------------------------

export type PrototypeSnapshot = Readonly<{
    mode: PrototypeCase
    inheritsBaseProto: boolean
    stringOutput: string
    jsonOutput: string
    nodeOutput: string
    bareString: string
    lesson: string
}>

export const prototype_snapshot = (model: Model): PrototypeSnapshot => {
    const value = make_proto_value()

    const bare = Object.create(Inspectable.BaseProto) as Inspectable.Inspectable

    return {
        mode: model.prototypeCase,
        inheritsBaseProto:
            Object.getPrototypeOf(value) === Inspectable.BaseProto,
        stringOutput: value.toString(),
        jsonOutput: display_unknown(value.toJSON()),
        nodeOutput: display_unknown(value[Inspectable.NodeInspectSymbol]()),
        bareString: bare.toString(),
        lesson:
            model.prototypeCase === "Bare"
                ? "without an own toJSON, the safe recursion fallback becomes visible"
                : "own toJSON supplies the representation inherited methods consume",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedInspectableStage: {
        stage: Stage,
    },
    SelectedInspectableConvertCase: {
        convertCase: ConvertCase,
    },
    SelectedInspectableClassCase: {
        classCase: ClassCase,
    },
    SelectedInspectableCustomCase: {
        customCase: CustomCase,
    },
    SelectedInspectablePrototypeCase: {
        prototypeCase: PrototypeCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Convert",
    convertCase: "ToJson",
    classCase: "String",
    customCase: "Interface",
    prototypeCase: "Override",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type ConvertCasePayload = Readonly<{
    convertCase: ConvertCase
}>

type ClassCasePayload = Readonly<{
    classCase: ClassCase
}>

type CustomCasePayload = Readonly<{
    customCase: CustomCase
}>

type PrototypeCasePayload = Readonly<{
    prototypeCase: PrototypeCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedInspectableStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedInspectableConvertCase: ({
            convertCase,
        }: ConvertCasePayload) => ({
            model: modifyFields(model, {
                convertCase: () => convertCase,
            }),
        }),

        SelectedInspectableClassCase: ({ classCase }: ClassCasePayload) => ({
            model: modifyFields(model, {
                classCase: () => classCase,
            }),
        }),

        SelectedInspectableCustomCase: ({ customCase }: CustomCasePayload) => ({
            model: modifyFields(model, {
                customCase: () => customCase,
            }),
        }),

        SelectedInspectablePrototypeCase: ({
            prototypeCase,
        }: PrototypeCasePayload) => ({
            model: modifyFields(model, {
                prototypeCase: () => prototypeCase,
            }),
        }),
    })

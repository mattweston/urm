import { PrimaryKey, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DOMAIN VALUES
// -----------------------------------------------------------------------------

export class ProductId implements PrimaryKey.PrimaryKey {
    constructor(
        readonly category: string,
        readonly id: number
    ) {}

    [PrimaryKey.symbol](): string {
        return `${this.category}-${this.id}`
    }
}

export class OrderId implements PrimaryKey.PrimaryKey {
    constructor(
        readonly timestamp: number,
        readonly sequence: number
    ) {}

    [PrimaryKey.symbol](): string {
        return `order_${this.timestamp}_${this.sequence}`
    }
}

export const simple_key: PrimaryKey.PrimaryKey = {
    [PrimaryKey.symbol]: (): string => "simple-key-123",
}

export const product = new ProductId("electronics", 42)

export const order = new OrderId(1_640_995_200_000, 1)

export const stable_cache = new Map<string, string>()

stable_cache.set(PrimaryKey.value(product), "Product record")

stable_cache.set(PrimaryKey.value(order), "Order record")

export const lookup_by_primary_key = (
    key: PrimaryKey.PrimaryKey
): string | undefined => stable_cache.get(PrimaryKey.value(key))

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Protocol"),
    S.Literal("Guard"),
    S.Literal("Value"),
    S.Literal("Integrate"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Protocol",
    "Guard",
    "Value",
    "Integrate",
]

export const ProtocolCase = S.Union([
    S.Literal("Class"),
    S.Literal("Object"),
    S.Literal("Symbol"),
])
export type ProtocolCase = typeof ProtocolCase.Type

export const GuardCase = S.Union([
    S.Literal("Hit"),
    S.Literal("Miss"),
    S.Literal("Structural"),
])
export type GuardCase = typeof GuardCase.Type

export const ValueCase = S.Union([
    S.Literal("Product"),
    S.Literal("Order"),
    S.Literal("Object"),
])
export type ValueCase = typeof ValueCase.Type

export const IntegrateCase = S.Union([
    S.Literal("Cache"),
    S.Literal("HashRing"),
    S.Literal("Persistence"),
])
export type IntegrateCase = typeof IntegrateCase.Type

export const Model = S.Struct({
    stage: Stage,
    protocolCase: ProtocolCase,
    guardCase: GuardCase,
    valueCase: ValueCase,
    integrateCase: IntegrateCase,
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
    Protocol: {
        eyebrow: "one computed method returns one stable string key",
        title: "Implement the PrimaryKey protocol on classes or object literals with the exported symbol",
        description:
            "PrimaryKey is a tiny structural protocol. A value participates by defining a method at PrimaryKey.symbol that returns its stable string identifier. There is no wrapper object or registry.",
        code: `class ProductId
    implements PrimaryKey.PrimaryKey
{
    constructor(
        readonly category: string,
        readonly id: number
    ) {}

    [PrimaryKey.symbol](): string {
        return \`\${this.category}-\${this.id}\`
    }
}

const product =
    new ProductId(
        "electronics",
        42
    )`,
        apis: ["PrimaryKey.symbol", "PrimaryKey.PrimaryKey"],
        notice: "The protocol method should be stable for the logical identity of the value. If it changes over time, caches, rings, persistence keys, or other consumers can observe inconsistent identity.",
    },

    Guard: {
        eyebrow: "structural runtime detection",
        title: "Use isPrimaryKey to narrow unknown values before calling the protocol",
        description:
            "isPrimaryKey checks for the PrimaryKey.symbol property using Predicate.hasProperty. It narrows unknown to PrimaryKey, but it does not invoke the property or verify at runtime that the property is callable or returns a string.",
        code: `const input:
    unknown =
    new ProductId(
        "electronics",
        42
    )

if (
    PrimaryKey.isPrimaryKey(
        input
    )
) {
    PrimaryKey.value(
        input
    )
    // "electronics-42"
}

PrimaryKey.isPrimaryKey({
    id: 42
})
// false`,
        apis: ["PrimaryKey.isPrimaryKey", "PrimaryKey.symbol"],
        notice: "The guard is intentionally shallow: property presence is enough. Treat values from untrusted JavaScript as needing stronger validation if callable/string-returning behavior must be guaranteed.",
    },

    Value: {
        eyebrow: "one normalized string extraction point",
        title: "Use value to invoke the protocol method and obtain the stable string identifier",
        description:
            "PrimaryKey.value does exactly one thing: call self[PrimaryKey.symbol](). This keeps consumers independent from the concrete class fields or object representation used to build the key.",
        code: `PrimaryKey.value(
    new ProductId(
        "electronics",
        42
    )
)
// "electronics-42"

PrimaryKey.value(
    new OrderId(
        1640995200000,
        1
    )
)
// "order_1640995200000_1"

PrimaryKey.value({
    [PrimaryKey.symbol]:
        () =>
            "simple-key-123"
})
// "simple-key-123"`,
        apis: ["PrimaryKey.value"],
        notice: "value performs no memoization, normalization, escaping, or uniqueness check. The implementation of the protocol method owns the key format and stability guarantees.",
    },

    Integrate: {
        eyebrow: "shared identity vocabulary across data structures",
        title: "Convert domain values to string keys once, then use that identity in caches, hash rings, persistence, and idempotency",
        description:
            "Current Effect source uses PrimaryKey.value in HashRing node identity, unstable persistence storage keys, cluster envelope identity, and workflow migration guidance. The protocol separates domain objects from the string representation those systems need.",
        code: `const cache =
    new Map<
        string,
        string
    >()

cache.set(
    PrimaryKey.value(
        product
    ),
    "Product record"
)

cache.get(
    PrimaryKey.value(
        product
    )
)
// "Product record"

// Effect HashRing also
// matches nodes by
// PrimaryKey.value(node)`,
        apis: ["PrimaryKey.value", "HashRing", "Persistence"],
        notice: "PrimaryKey itself does not provide hashing, equality, storage, or persistence. It only supplies the stable string that those higher-level systems can use as their identity key.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type ProtocolSnapshot = Readonly<{
    mode: ProtocolCase
    symbol: string
    class: string
    object: string
    shape: string
    wrapper: string
}>

export const protocol_snapshot = (model: Model): ProtocolSnapshot => ({
    mode: model.protocolCase,
    symbol: PrimaryKey.symbol,
    class: "ProductId implements PrimaryKey.PrimaryKey",
    object: "{ [PrimaryKey.symbol]: () => string }",
    shape: "[PrimaryKey.symbol](): string",
    wrapper: "no wrapper allocation · structural protocol",
})

export type GuardSnapshot = Readonly<{
    mode: GuardCase
    classHit: boolean
    objectHit: boolean
    plainMiss: boolean
    symbolOnly: string
    verifiesCallability: boolean
    verifiesStringReturn: boolean
}>

export const guard_snapshot = (model: Model): GuardSnapshot => ({
    mode: model.guardCase,
    classHit: PrimaryKey.isPrimaryKey(product),
    objectHit: PrimaryKey.isPrimaryKey(simple_key),
    plainMiss: PrimaryKey.isPrimaryKey({
        id: 42,
    }),
    symbolOnly: "guard delegates to hasProperty(value, PrimaryKey.symbol)",
    verifiesCallability: false,
    verifiesStringReturn: false,
})

export type ValueSnapshot = Readonly<{
    mode: ValueCase
    product: string
    order: string
    object: string
    operation: string
    formatting: string
}>

export const value_snapshot = (model: Model): ValueSnapshot => ({
    mode: model.valueCase,
    product: PrimaryKey.value(product),
    order: PrimaryKey.value(order),
    object: PrimaryKey.value(simple_key),
    operation: "self[PrimaryKey.symbol]()",
    formatting: "format is defined by the implementation",
})

export type IntegrateSnapshot = Readonly<{
    mode: IntegrateCase
    productKey: string
    cacheHit: string
    hashRing: string
    persistence: string
    cluster: string
}>

export const integrate_snapshot = (model: Model): IntegrateSnapshot => ({
    mode: model.integrateCase,
    productKey: PrimaryKey.value(product),
    cacheHit: lookup_by_primary_key(product) ?? "missing",
    hashRing: "HashRing matches nodes by PrimaryKey.value(node)",
    persistence:
        "unstable Persistence uses PrimaryKey.value(key) for storage lookup",
    cluster:
        "cluster Envelope combines address/tag with PrimaryKey.value(payload)",
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedPrimaryKeyStage: {
        stage: Stage,
    },
    SelectedPrimaryKeyProtocolCase: {
        protocolCase: ProtocolCase,
    },
    SelectedPrimaryKeyGuardCase: {
        guardCase: GuardCase,
    },
    SelectedPrimaryKeyValueCase: {
        valueCase: ValueCase,
    },
    SelectedPrimaryKeyIntegrateCase: {
        integrateCase: IntegrateCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Protocol",
    protocolCase: "Class",
    guardCase: "Hit",
    valueCase: "Product",
    integrateCase: "Cache",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type ProtocolCasePayload = Readonly<{
    protocolCase: ProtocolCase
}>

type GuardCasePayload = Readonly<{
    guardCase: GuardCase
}>

type ValueCasePayload = Readonly<{
    valueCase: ValueCase
}>

type IntegrateCasePayload = Readonly<{
    integrateCase: IntegrateCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedPrimaryKeyStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedPrimaryKeyProtocolCase: ({
            protocolCase,
        }: ProtocolCasePayload) => ({
            model: evo(model, {
                protocolCase: () => protocolCase,
            }),
        }),

        SelectedPrimaryKeyGuardCase: ({ guardCase }: GuardCasePayload) => ({
            model: evo(model, {
                guardCase: () => guardCase,
            }),
        }),

        SelectedPrimaryKeyValueCase: ({ valueCase }: ValueCasePayload) => ({
            model: evo(model, {
                valueCase: () => valueCase,
            }),
        }),

        SelectedPrimaryKeyIntegrateCase: ({
            integrateCase,
        }: IntegrateCasePayload) => ({
            model: evo(model, {
                integrateCase: () => integrateCase,
            }),
        }),
    })

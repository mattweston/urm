import {
    Equivalence,
    Newtype,
    Number as EffectNumber,
    Order,
    Schema as S,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// NEWTYPES
// -----------------------------------------------------------------------------

export interface UserId extends Newtype.Newtype<"UserId", number> {}

export interface OrderId extends Newtype.Newtype<"OrderId", number> {}

export interface Label extends Newtype.Newtype<"Label", string> {}

export interface Credits extends Newtype.Newtype<"Credits", number> {}

export type UserIdKey = Newtype.Newtype.Key<UserId>

export type UserIdCarrier = Newtype.Newtype.Carrier<UserId>

export const UserIdIso = Newtype.makeIso<UserId>()

export const OrderIdIso = Newtype.makeIso<OrderId>()

export const LabelIso = Newtype.makeIso<Label>()

export const CreditsIso = Newtype.makeIso<Credits>()

export const LabelEquivalence = Newtype.makeEquivalence<Label>(
    Equivalence.String
)

export const UserIdOrder = Newtype.makeOrder<UserId>(Order.Number)

export const CreditsCombiner = Newtype.makeCombiner<Credits>(
    EffectNumber.ReducerSum
)

export const CreditsReducer = Newtype.makeReducer<Credits>(
    EffectNumber.ReducerSum
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Define"),
    S.Literal("Iso"),
    S.Literal("Instances"),
    S.Literal("Algebra"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Define",
    "Iso",
    "Instances",
    "Algebra",
]

export const DefineCase = S.Union([
    S.Literal("Tag"),
    S.Literal("Carrier"),
    S.Literal("Types"),
])
export type DefineCase = typeof DefineCase.Type

export const IsoCase = S.Union([
    S.Literal("Wrap"),
    S.Literal("Unwrap"),
    S.Literal("Identity"),
])
export type IsoCase = typeof IsoCase.Type

export const InstancesCase = S.Union([
    S.Literal("Equivalence"),
    S.Literal("Order"),
    S.Literal("Distinct"),
])
export type InstancesCase = typeof InstancesCase.Type

export const AlgebraCase = S.Union([
    S.Literal("Combiner"),
    S.Literal("Reducer"),
    S.Literal("ZeroCost"),
])
export type AlgebraCase = typeof AlgebraCase.Type

export const Model = S.Struct({
    stage: Stage,
    defineCase: DefineCase,
    isoCase: IsoCase,
    instancesCase: InstancesCase,
    algebraCase: AlgebraCase,
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
    Define: {
        eyebrow: "same runtime shape, different TypeScript identity",
        title: "Tag a carrier type so structurally identical values cannot be mixed accidentally",
        description:
            "A Newtype<Key, Carrier> exists only in the type system. UserId and OrderId can both use number at runtime while remaining distinct types to TypeScript. Namespace helpers extract the key and carrier in generic code.",
        code: `interface UserId
    extends Newtype.Newtype<
        "UserId",
        number
    >
{}

interface OrderId
    extends Newtype.Newtype<
        "OrderId",
        number
    >
{}

type Key =
    Newtype.Newtype.Key<
        UserId
    >
// "UserId"

type Carrier =
    Newtype.Newtype.Carrier<
        UserId
    >
// number`,
        apis: [
            "Newtype.Newtype",
            "Newtype.Newtype.Any",
            "Newtype.Newtype.Key",
            "Newtype.Newtype.Carrier",
        ],
        notice: "The tag is compile-time only. There is no runtime wrapper object carrying the key, so the newtype keeps the carrier's runtime representation.",
    },

    Iso: {
        eyebrow: "wrap + unwrap through an optic",
        title: "Use makeIso as the primary constructor and value when only unwrapping is needed",
        description:
            "makeIso returns an Optic.Iso whose set direction wraps a carrier as the newtype and whose get direction unwraps it. value is the direct unwrap helper. All directions are identity casts.",
        code: `const userIdIso =
    Newtype.makeIso<
        UserId
    >()

const id: UserId =
    userIdIso.set(
        42
    )

userIdIso.get(
    id
)
// 42

Newtype.value(
    id
)
// 42

Object.is(
    id,
    42
)
// true at runtime`,
        apis: ["Newtype.makeIso", "Newtype.value"],
        notice: "makeIso uses set to go Carrier → Newtype and get to go Newtype → Carrier. Despite the optic vocabulary, both directions preserve the underlying runtime value exactly.",
    },

    Instances: {
        eyebrow: "reuse carrier equality + ordering",
        title: "Lift Equivalence and Order instances from the carrier without manual unwrapping",
        description:
            "makeEquivalence and makeOrder are type-safe casts of the carrier instances. A Label can reuse string equality and UserId can reuse numeric ordering while the resulting instances operate directly on the newtype.",
        code: `const labelEq =
    Newtype.makeEquivalence<
        Label
    >(
        Equivalence.String
    )

labelEq(
    LabelIso.set(
        "a"
    ),
    LabelIso.set(
        "a"
    )
)
// true

const userIdOrder =
    Newtype.makeOrder<
        UserId
    >(
        Order.Number
    )

userIdOrder(
    UserIdIso.set(
        1
    ),
    UserIdIso.set(
        2
    )
)
// -1`,
        apis: [
            "Newtype.makeEquivalence",
            "Newtype.makeOrder",
            "Equivalence.String",
            "Order.Number",
        ],
        notice: "The carrier behavior is reused unchanged. The type lift prevents accidentally applying a UserId Order to another number-backed newtype such as OrderId.",
    },

    Algebra: {
        eyebrow: "lift combine + reduce behavior",
        title: "Reuse carrier combiners and reducers while keeping results inside the newtype",
        description:
            "makeCombiner and makeReducer lift the carrier's algebraic instances. With the number sum reducer, combining Credits values returns Credits, and reducing a collection preserves the branded result type.",
        code: `const combiner =
    Newtype.makeCombiner<
        Credits
    >(
        EffectNumber
            .ReducerSum
    )

const total =
    combiner.combine(
        CreditsIso.set(
            10
        ),
        CreditsIso.set(
            20
        )
    )

Newtype.value(
    total
)
// 30

const reducer =
    Newtype.makeReducer<
        Credits
    >(
        EffectNumber
            .ReducerSum
    )

const grandTotal =
    reducer.combineAll([
        CreditsIso.set(1),
        CreditsIso.set(2),
        CreditsIso.set(3)
    ])

Newtype.value(
    grandTotal
)
// 6`,
        apis: ["Newtype.makeCombiner", "Newtype.makeReducer"],
        notice: "No conversion loop is needed around the carrier instance. The lifted instance keeps its runtime implementation while changing the TypeScript input/output type to the newtype.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type DefineSnapshot = Readonly<{
    mode: DefineCase
    userIdType: string
    orderIdType: string
    carrier: string
    keyHelper: string
    carrierHelper: string
    runtimeTag: string
}>

export const define_snapshot = (model: Model): DefineSnapshot => ({
    mode: model.defineCase,
    userIdType: 'Newtype<"UserId", number>',
    orderIdType: 'Newtype<"OrderId", number>',
    carrier: "both carriers are number",
    keyHelper: 'Newtype.Newtype.Key<UserId> → "UserId"',
    carrierHelper: "Newtype.Newtype.Carrier<UserId> → number",
    runtimeTag: "compile-time only · no wrapper allocation",
})

export type IsoSnapshot = Readonly<{
    mode: IsoCase
    wrapped: number
    isoGet: number
    value: number
    runtimeType: string
    sameRuntimeValue: boolean
    roundTrip: boolean
}>

export const iso_snapshot = (model: Model): IsoSnapshot => {
    const wrapped: UserId = UserIdIso.set(42)

    const unwrapped = UserIdIso.get(wrapped)

    const direct = Newtype.value(wrapped)

    return {
        mode: model.isoCase,
        wrapped: direct,
        isoGet: unwrapped,
        value: direct,
        runtimeType: typeof wrapped,
        sameRuntimeValue: Object.is(wrapped, 42),
        roundTrip: UserIdIso.get(UserIdIso.set(99)) === 99,
    }
}

export type InstancesSnapshot = Readonly<{
    mode: InstancesCase
    equalAA: boolean
    equalAB: boolean
    order12: number
    order21: number
    order22: number
    distinctTypes: string
}>

export const instances_snapshot = (model: Model): InstancesSnapshot => ({
    mode: model.instancesCase,
    equalAA: LabelEquivalence(LabelIso.set("a"), LabelIso.set("a")),
    equalAB: LabelEquivalence(LabelIso.set("a"), LabelIso.set("b")),
    order12: UserIdOrder(UserIdIso.set(1), UserIdIso.set(2)),
    order21: UserIdOrder(UserIdIso.set(2), UserIdIso.set(1)),
    order22: UserIdOrder(UserIdIso.set(2), UserIdIso.set(2)),
    distinctTypes:
        "UserId and OrderId share number at runtime but remain non-interchangeable in TypeScript",
})

export type AlgebraSnapshot = Readonly<{
    mode: AlgebraCase
    combined: number
    reduced: number
    reducerInitial: number
    resultType: string
    runtimeCost: string
}>

export const algebra_snapshot = (model: Model): AlgebraSnapshot => {
    const combined = CreditsCombiner.combine(
        CreditsIso.set(10),
        CreditsIso.set(20)
    )

    const reduced = CreditsReducer.combineAll([
        CreditsIso.set(1),
        CreditsIso.set(2),
        CreditsIso.set(3),
    ])

    return {
        mode: model.algebraCase,
        combined: Newtype.value(combined),
        reduced: Newtype.value(reduced),
        reducerInitial: Newtype.value(CreditsReducer.initialValue),
        resultType: "Combiner / Reducer results remain Credits",
        runtimeCost: "lifted instances reuse the carrier implementation",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedNewtypeStage: {
        stage: Stage,
    },
    SelectedNewtypeDefineCase: {
        defineCase: DefineCase,
    },
    SelectedNewtypeIsoCase: {
        isoCase: IsoCase,
    },
    SelectedNewtypeInstancesCase: {
        instancesCase: InstancesCase,
    },
    SelectedNewtypeAlgebraCase: {
        algebraCase: AlgebraCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Define",
    defineCase: "Tag",
    isoCase: "Wrap",
    instancesCase: "Equivalence",
    algebraCase: "Combiner",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type DefineCasePayload = Readonly<{
    defineCase: DefineCase
}>

type IsoCasePayload = Readonly<{
    isoCase: IsoCase
}>

type InstancesCasePayload = Readonly<{
    instancesCase: InstancesCase
}>

type AlgebraCasePayload = Readonly<{
    algebraCase: AlgebraCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedNewtypeStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedNewtypeDefineCase: ({ defineCase }: DefineCasePayload) => ({
            model: evo(model, {
                defineCase: () => defineCase,
            }),
        }),

        SelectedNewtypeIsoCase: ({ isoCase }: IsoCasePayload) => ({
            model: evo(model, {
                isoCase: () => isoCase,
            }),
        }),

        SelectedNewtypeInstancesCase: ({
            instancesCase,
        }: InstancesCasePayload) => ({
            model: evo(model, {
                instancesCase: () => instancesCase,
            }),
        }),

        SelectedNewtypeAlgebraCase: ({ algebraCase }: AlgebraCasePayload) => ({
            model: evo(model, {
                algebraCase: () => algebraCase,
            }),
        }),
    })

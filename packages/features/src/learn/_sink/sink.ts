import { Effect, Option, Schema as S, Sink, Stream } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL SINK PROGRAMS
// -----------------------------------------------------------------------------

export const collect_program = Effect.gen(function* () {
    const values = yield* Stream.run(Stream.make(1, 2, 3, 4), Sink.collect())

    const total = yield* Stream.run(Stream.make(1, 2, 3, 4), Sink.sum)

    const count = yield* Stream.run(Stream.make("a", "b", "c"), Sink.count)

    const first = yield* Stream.run(Stream.make("a", "b", "c"), Sink.head())

    return {
        values,
        total,
        count,
        first: Option.getOrUndefined(first),
    } as const
})

export const reduce_program = Effect.gen(function* () {
    const product = yield* Stream.run(
        Stream.make(1, 2, 3, 4),
        Sink.reduce(
            () => 1,
            (state: number, input: number) => state * input
        )
    )

    const firstThreeSum = yield* Stream.run(
        Stream.make(1, 2, 3, 4, 5),
        Sink.foldUntil(
            () => 0,
            3,
            (state: number, input: number) => Effect.succeed(state + input)
        )
    )

    const firstEven = yield* Stream.run(
        Stream.make(1, 3, 4, 6),
        Sink.find((input: number) => input % 2 === 0)
    )

    return {
        product,
        firstThreeSum,
        firstEven: Option.getOrUndefined(firstEven),
    } as const
})

export const leftover_program = Effect.gen(function* () {
    const takeThenTake = Sink.flatMap(Sink.take(2), (first: Array<number>) =>
        Sink.map(
            Sink.take(1),
            (next: Array<number>) => ({ first, next }) as const
        )
    )

    const takeResult = yield* Stream.run(Stream.make(1, 2, 3, 4), takeThenTake)

    const prefixThenNext = Sink.flatMap(
        Sink.takeWhile((input: number) => input < 3),
        (prefix: Array<number>) =>
            Sink.map(
                Sink.take(1),
                (next: Array<number>) => ({ prefix, next }) as const
            )
    )

    const prefixResult = yield* Stream.run(
        Stream.make(1, 2, 3, 4),
        prefixThenNext
    )

    return {
        takeResult,
        prefixResult,
    } as const
})

export const compose_program = Effect.gen(function* () {
    const labelled = Sink.map(Sink.sum, (total: number) => `sum=${total}`)

    const labelledResult = yield* Stream.run(Stream.make(2, 3, 5), labelled)

    const recovered = Sink.orElse(
        Sink.fail("boom" as const),
        (_error: "boom") => Sink.succeed("fallback" as const)
    )

    const recoveredResult = yield* Stream.run(Stream.empty, recovered)

    const timedResult = yield* Stream.run(
        Stream.make(2, 3, 5),
        Sink.withDuration(Sink.sum)
    )

    return {
        labelledResult,
        recoveredResult,
        sum: timedResult[0],
    } as const
})

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Construct"),
    S.Literal("Reduce"),
    S.Literal("Leftovers"),
    S.Literal("Compose"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Construct",
    "Reduce",
    "Leftovers",
    "Compose",
]

export const ConstructCase = S.Union([
    S.Literal("Collect"),
    S.Literal("HeadLast"),
    S.Literal("Effects"),
    S.Literal("Channel"),
])
export type ConstructCase = typeof ConstructCase.Type

export const construct_cases: ReadonlyArray<ConstructCase> = [
    "Collect",
    "HeadLast",
    "Effects",
    "Channel",
]

export const ReduceCase = S.Union([
    S.Literal("Reduce"),
    S.Literal("Fold"),
    S.Literal("Search"),
    S.Literal("Predicates"),
])
export type ReduceCase = typeof ReduceCase.Type

export const reduce_cases: ReadonlyArray<ReduceCase> = [
    "Reduce",
    "Fold",
    "Search",
    "Predicates",
]

export const LeftoversCase = S.Union([
    S.Literal("Take"),
    S.Literal("TakeWhile"),
    S.Literal("FlatMap"),
    S.Literal("Ignore"),
])
export type LeftoversCase = typeof LeftoversCase.Type

export const leftovers_cases: ReadonlyArray<LeftoversCase> = [
    "Take",
    "TakeWhile",
    "FlatMap",
    "Ignore",
]

export const ComposeCase = S.Union([
    S.Literal("Map"),
    S.Literal("Recover"),
    S.Literal("Finalize"),
    S.Literal("Services"),
])
export type ComposeCase = typeof ComposeCase.Type

export const compose_cases: ReadonlyArray<ComposeCase> = [
    "Map",
    "Recover",
    "Finalize",
    "Services",
]

export const Model = S.Struct({
    stage: Stage,
    constructCase: ConstructCase,
    reduceCase: ReduceCase,
    leftoversCase: LeftoversCase,
    composeCase: ComposeCase,
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
    Construct: {
        eyebrow: "a Sink consumes Stream input and produces one final value",
        title: "Pick the sink that matches how much input you need",
        description:
            "Sink<A, In, L, E, R> describes a consumer result A, incoming values In, leftovers L, typed error E, and services R. Some sinks consume everything, some stop early, and some do not consume input at all.",
        code: `const all = Sink.collect()
const total = Sink.sum
const first = Sink.head()

const values = yield* Stream.run(
    Stream.make(1, 2, 3),
    all
)`,
        apis: [
            "Sink.Sink",
            "Sink.collect",
            "Sink.sum",
            "Sink.head",
            "Stream.run",
        ],
        notice: "Sink is the consuming side of Stream. Stream supplies values; Sink decides how many to consume, what final result to produce, and whether any already-pulled values remain as leftovers.",
    },

    Reduce: {
        eyebrow:
            "folding separates all-input reducers from early-stopping folds",
        title: "Use reduce for full consumption and fold when state can stop the sink",
        description:
            "reduce and reduceArray consume the upstream to completion. fold and reduceWhile can finish early based on accumulated state; element-level early termination can return the unconsumed tail of the current pulled array as leftovers.",
        code: `const product = Sink.reduce(
    () => 1,
    (state: number, n: number) =>
        state * n
)

const firstThree = Sink.foldUntil(
    () => 0,
    3,
    (state, n) =>
        Effect.succeed(state + n)
)`,
        apis: [
            "Sink.reduce",
            "Sink.reduceEffect",
            "Sink.fold",
            "Sink.foldUntil",
            "Sink.find",
        ],
        notice: "A reducer that consumes all input cannot finish on an infinite stream. Choose an early-stopping sink such as head, find, take, fold, or reduceWhile when completion should be possible before upstream ends.",
    },

    Leftovers: {
        eyebrow:
            "early completion can preserve input that was pulled but not consumed",
        title: "Leftovers are the handoff between sequential sinks",
        description:
            "Sink.End is [result, leftover?]. take returns the tail after the requested count. takeWhile has a sharper boundary: the first element that fails the predicate is consumed and excluded, while only later values from that pulled array become leftovers.",
        code: `const sink = Sink.flatMap(
    Sink.take(2),
    (first: Array<number>) =>
        Sink.map(
            Sink.take(1),
            (next: Array<number>) =>
                ({ first, next })
        )
)

// leftovers from take(2)
// feed take(1) first`,
        apis: [
            "Sink.End",
            "Sink.take",
            "Sink.takeWhile",
            "Sink.flatMap",
            "Sink.ignoreLeftover",
        ],
        notice: "Do not read takeWhile as a non-consuming lookahead. Its first predicate failure is consumed. If you need that failing item to remain available, choose a protocol that models the boundary explicitly rather than assuming takeWhile will return it.",
    },

    Compose: {
        eyebrow:
            "mapping changes results; sequencing changes how input is consumed",
        title: "Compose result transforms, recovery, services, and cleanup around consumption",
        description:
            "map and mapEffect transform the final result without changing consumption. flatMap starts a second sink and feeds it prior leftovers first. orElse switches to another sink after a typed failure, while onExit and ensuring attach cleanup behavior.",
        code: `const labelled = Sink.map(
    Sink.sum,
    (n: number) => \`sum=\${n}\`
)

const recovered = Sink.orElse(
    Sink.fail("boom"),
    () => Sink.succeed("fallback")
)`,
        apis: [
            "Sink.map",
            "Sink.mapEffect",
            "Sink.orElse",
            "Sink.onExit",
            "Sink.provideService",
        ],
        notice: "map preserves the consumption contract. flatMap does not: it sequences another consumer. When composing sinks, track leftovers as carefully as the result and error channels.",
    },
}

// -----------------------------------------------------------------------------
// VISUAL SNAPSHOTS
// -----------------------------------------------------------------------------

export type Snapshot = Readonly<{
    input: string
    operation: string
    result: string
    invariant: string
    implementation: string
    guidance: string
}>

export const construct_snapshot = (model: Model): Snapshot => {
    switch (model.constructCase) {
        case "Collect":
            return {
                input: "Stream.make(1, 2, 3, 4)",
                operation: "Stream.run(stream, Sink.collect())",
                result: "[1, 2, 3, 4]",
                invariant: "collect consumes the entire upstream",
                implementation:
                    "reduceArray appends each pulled non-empty array",
                guidance:
                    "Use collect only when materializing the whole finite stream is intended and safe.",
            }

        case "HeadLast":
            return {
                input: "stream = [a, b, c]",
                operation: "head() vs last()",
                result: "Some(a) early · Some(c) only at end",
                invariant:
                    "head can stop early; last requires upstream completion",
                implementation: "head returns later pulled values as leftovers",
                guidance:
                    "Prefer head when one value is enough; last cannot finish on a non-ending stream.",
            }

        case "Effects":
            return {
                input: "Effect<A, E, R> or per-item callback",
                operation: "fromEffect / forEach / unwrap",
                result: "Sink result keeps E and R in its type",
                invariant:
                    "sink effects participate in ordinary Effect error/service channels",
                implementation:
                    "forEach consumes each item; unwrap acquires the sink effectfully",
                guidance:
                    "Use effectful sinks for boundary writes or validation while keeping runtime effects out of Foldkit Model state.",
            }

        case "Channel":
            return {
                input: "Channel over non-empty input arrays",
                operation: "fromChannel ↔ toChannel",
                result: "Sink / Channel interoperability",
                invariant:
                    "Sink is implemented as a pull transform with End result",
                implementation:
                    "fromTransform is the low-level constructor under both directions",
                guidance:
                    "Stay with Sink/Stream unless Channel-level control is genuinely needed; the lower-level constructors expose more protocol detail.",
            }
    }
}

export const reduce_snapshot = (model: Model): Snapshot => {
    switch (model.reduceCase) {
        case "Reduce":
            return {
                input: "[1, 2, 3, 4]",
                operation: "reduce(() => 1, multiply)",
                result: "24",
                invariant: "reduce consumes until upstream ends",
                implementation:
                    "reduce delegates to array-level reduction for throughput",
                guidance:
                    "Use reduce for associative or ordinary accumulations that need the complete finite input.",
            }

        case "Fold":
            return {
                input: "state + continuation predicate",
                operation: "fold / foldUntil",
                result: "state plus possible leftover tail",
                invariant:
                    "element-level fold checks stop state after each consumed item",
                implementation:
                    "remaining items in the current pull become leftovers",
                guidance:
                    "Use fold when accumulated state determines when enough input has been consumed.",
            }

        case "Search":
            return {
                input: "[1, 3, 4, 6]",
                operation: "find(n => n % 2 === 0)",
                result: "Some(4)",
                invariant: "the matching element is consumed",
                implementation:
                    "find uses reduceWhile and leaves later values from the same pull",
                guidance:
                    "Use findEffect when the predicate can fail, run effects, or require services.",
            }

        case "Predicates":
            return {
                input: "stream values + pure predicate",
                operation: "every(predicate) / some(predicate)",
                result: "boolean with early completion",
                invariant: "every stops on false; some stops on true",
                implementation:
                    "both are folds whose continuation depends on boolean state",
                guidance:
                    "Use these instead of collecting first when only an all/any decision is needed.",
            }
    }
}

export const leftovers_snapshot = (model: Model): Snapshot => {
    switch (model.leftoversCase) {
        case "Take":
            return {
                input: "pulled array [1, 2, 3, 4], n = 2",
                operation: "Sink.take(2)",
                result: "value [1, 2] · leftover [3, 4]",
                invariant:
                    "take consumes exactly the requested prefix when available",
                implementation:
                    "rc.117 normalizes n to a non-negative integer first",
                guidance:
                    "Use take when the boundary count itself is the contract and later values must remain available to composition.",
            }

        case "TakeWhile":
            return {
                input: "[1, 2, 3, 4], predicate n < 3",
                operation: "Sink.takeWhile(predicate)",
                result: "value [1, 2] · 3 consumed · leftover [4]",
                invariant: "the first failing input is not a leftover",
                implementation:
                    "only the tail after the failing index is returned",
                guidance:
                    "This consuming failure boundary is easy to miss; do not use takeWhile when the boundary element itself must be replayed.",
            }

        case "FlatMap":
            return {
                input: "take(2) then take(1)",
                operation: "Sink.flatMap(first, () => second)",
                result: "second sees first sink leftovers before upstream",
                invariant: "leftover handoff precedes new pulls",
                implementation:
                    "rc.117 also preserves any unconsumed remainder after the second sink",
                guidance:
                    "Use flatMap for truly sequential consumption, especially when the second sink depends on the first result.",
            }

        case "Ignore":
            return {
                input: "Sink<A, In, L, E, R>",
                operation: "Sink.ignoreLeftover(sink)",
                result: "Sink<A, In, never, E, R>",
                invariant: "result/error/services stay unchanged",
                implementation: "maps End [a, leftover] to [a]",
                guidance:
                    "Discard leftovers only when no later consumer needs them; this is a semantic decision, not just a type simplification.",
            }
    }
}

export const compose_snapshot = (model: Model): Snapshot => {
    switch (model.composeCase) {
        case "Map":
            return {
                input: "Sink.sum result = 10",
                operation: "Sink.map(sum, n => `sum=${n}`)",
                result: '"sum=10"',
                invariant: "mapping does not change how input is consumed",
                implementation: "map transforms only End[0]",
                guidance:
                    "Use map/mapEffect when you want a different result but the same consumption and leftover behavior.",
            }

        case "Recover":
            return {
                input: "typed sink failure",
                operation: "orElse / catch",
                result: "fallback sink or fallback result",
                invariant:
                    "typed recovery is distinct from full Cause recovery",
                implementation:
                    "orElse can continue from the same upstream when it has not ended",
                guidance:
                    "Use catchCause only when defects/interruption structure must be inspected; prefer typed recovery otherwise.",
            }

        case "Finalize":
            return {
                input: "sink success, failure, or interruption",
                operation: "onExit / ensuring / withDuration",
                result: "original result plus lifecycle behavior",
                invariant: "finalizers run on every sink exit",
                implementation:
                    "onExit receives the result Exit while preserving leftovers",
                guidance:
                    "Attach cleanup at the sink boundary when it belongs to consumption, rather than leaking cleanup concerns into result mapping.",
            }

        case "Services":
            return {
                input: "Sink<A, In, L, E, R> + service/context",
                operation: "provideService / provideContext",
                result: "provided requirements removed from R",
                invariant:
                    "service provisioning changes requirements, not input consumption",
                implementation:
                    "the sink transform effect is provided with the context",
                guidance:
                    "Keep services in Effect runtime wiring and keep Foldkit Model/messages serializable and deterministic.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedSinkStage: {
        stage: Stage,
    },
    SelectedSinkConstructCase: {
        constructCase: ConstructCase,
    },
    SelectedSinkReduceCase: {
        reduceCase: ReduceCase,
    },
    SelectedSinkLeftoversCase: {
        leftoversCase: LeftoversCase,
    },
    SelectedSinkComposeCase: {
        composeCase: ComposeCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Construct",
    constructCase: "Collect",
    reduceCase: "Fold",
    leftoversCase: "TakeWhile",
    composeCase: "Map",
})

type StagePayload = Readonly<{ stage: Stage }>
type ConstructCasePayload = Readonly<{ constructCase: ConstructCase }>
type ReduceCasePayload = Readonly<{ reduceCase: ReduceCase }>
type LeftoversCasePayload = Readonly<{ leftoversCase: LeftoversCase }>
type ComposeCasePayload = Readonly<{ composeCase: ComposeCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedSinkStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, { stage: () => stage }),
        }),

        SelectedSinkConstructCase: ({
            constructCase,
        }: ConstructCasePayload) => ({
            model: modifyFields(model, { constructCase: () => constructCase }),
        }),

        SelectedSinkReduceCase: ({ reduceCase }: ReduceCasePayload) => ({
            model: modifyFields(model, { reduceCase: () => reduceCase }),
        }),

        SelectedSinkLeftoversCase: ({
            leftoversCase,
        }: LeftoversCasePayload) => ({
            model: modifyFields(model, { leftoversCase: () => leftoversCase }),
        }),

        SelectedSinkComposeCase: ({ composeCase }: ComposeCasePayload) => ({
            model: modifyFields(model, { composeCase: () => composeCase }),
        }),
    })

import { Effect, Random, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL RANDOM PROGRAMS
// -----------------------------------------------------------------------------

export const fixed_random_service: Random.Random = {
    nextIntUnsafe: (): number => 7,
    nextDoubleUnsafe: (): number => 0.75,
}

export const injected_next = Random.next.pipe(
    Effect.provideService(Random.Random, fixed_random_service)
)

export const scalar_program = Effect.gen(function* () {
    const next = yield* Random.next

    const boolean = yield* Random.nextBoolean

    const integer = yield* Random.nextInt

    const between = yield* Random.nextBetween(10, 20)

    const closedInt = yield* Random.nextIntBetween(1, 6)

    const halfOpenInt = yield* Random.nextIntBetween(1, 6, {
        halfOpen: true,
    })

    return {
        next,
        boolean,
        integer,
        between,
        closedInt,
        halfOpenInt,
    } as const
})

export const colors = ["red", "green", "blue"] as const

export const non_empty_choice = Random.choice(colors)

export const maybe_empty_colors: ReadonlyArray<string> = []

export const maybe_empty_choice = Random.choice(maybe_empty_colors)

export const shuffle_program = Random.shuffle([1, 2, 3, 4, 5])

export const seeded_program = Effect.gen(function* () {
    const first = yield* Random.next

    const second = yield* Random.next

    const die = yield* Random.nextIntBetween(1, 6)

    const shuffled = yield* Random.shuffle(["a", "b", "c", "d"])

    return {
        first,
        second,
        die,
        shuffled,
    } as const
}).pipe(Random.withSeed("foldkit-random-demo"))

export const example_seed_next = Random.next.pipe(Random.withSeed("example"))

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Service"),
    S.Literal("Generate"),
    S.Literal("Collections"),
    S.Literal("Seed"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Service",
    "Generate",
    "Collections",
    "Seed",
]

export const ServiceCase = S.Union([
    S.Literal("Reference"),
    S.Literal("Inject"),
    S.Literal("Security"),
])
export type ServiceCase = typeof ServiceCase.Type

export const GenerateCase = S.Union([
    S.Literal("Scalar"),
    S.Literal("Range"),
    S.Literal("Integer"),
])
export type GenerateCase = typeof GenerateCase.Type

export const CollectionsCase = S.Union([
    S.Literal("Shuffle"),
    S.Literal("Choice"),
    S.Literal("Empty"),
])
export type CollectionsCase = typeof CollectionsCase.Type

export const SeedCase = S.Union([
    S.Literal("Repeat"),
    S.Literal("String"),
    S.Literal("Number"),
])
export type SeedCase = typeof SeedCase.Type

export const Model = S.Struct({
    stage: Stage,
    serviceCase: ServiceCase,
    generateCase: GenerateCase,
    collectionsCase: CollectionsCase,
    seedCase: SeedCase,
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
    Service: {
        eyebrow: "pseudo-randomness as an injectable Effect service",
        title: "Generate through Random.Random so tests and applications can replace the active source",
        description:
            "Random.Random is both the service interface and Context.Reference. Its service supplies nextIntUnsafe and nextDoubleUnsafe; all higher-level generators read the active service from the fiber. This makes deterministic substitution straightforward.",
        code: `const fixed:
    Random.Random = {
        nextIntUnsafe:
            () =>
                7,
        nextDoubleUnsafe:
            () =>
                0.75
    }

const next =
    Random.next.pipe(
        Effect.provideService(
            Random.Random,
            fixed
        )
    )

// next produces 0.75`,
        apis: ["Random.Random", "Random.next"],
        notice: "The default generator is pseudo-random and not intended for security-sensitive randomness. The service is replaceable, but cryptographic use requires an appropriately secure implementation.",
    },

    Generate: {
        eyebrow: "scalar values and numeric ranges",
        title: "Generate doubles, booleans, safe integers, continuous ranges, and integer ranges",
        description:
            "next produces [0,1). nextBoolean uses a strict > 0.5 threshold. nextInt returns a safe integer. nextBetween is half-open [min,max). nextIntBetween rounds bounds to integers and is closed by default, with halfOpen available explicitly.",
        code: `yield* Random.next
// 0 <= n < 1

yield* Random.nextBoolean

yield* Random.nextInt
// safe integer

yield* Random.nextBetween(
    10.5,
    20.5
)
// 10.5 <= n < 20.5

yield* Random.nextIntBetween(
    1,
    6
)
// 1...6 inclusive

yield* Random.nextIntBetween(
    1,
    6,
    {
        halfOpen:
            true
    }
)
// 1...5`,
        apis: [
            "Random.next",
            "Random.nextBoolean",
            "Random.nextInt",
            "Random.nextBetween",
            "Random.nextIntBetween",
        ],
        notice: "nextBetween does not round its bounds. nextIntBetween does: lower uses Math.ceil, upper uses Math.floor. Its default integer interval includes the upper bound.",
    },

    Collections: {
        eyebrow: "randomize iterable values",
        title: "Shuffle into a new array or choose one value with type-level empty-input awareness",
        description:
            "shuffle materializes the iterable and performs an in-place Fisher–Yates-style shuffle on that copy, leaving the source untouched. choice is infallible for known non-empty arrays / NonEmptyIterable inputs, but general Iterable input can fail with NoSuchElementError when empty.",
        code: `const shuffled =
    yield* Random.shuffle(
        [
            1,
            2,
            3,
            4,
            5
        ]
    )

const color =
    yield* Random.choice(
        [
            "red",
            "green",
            "blue"
        ] as const
    )
// infallible Effect

const values:
    ReadonlyArray<string> =
    []

Random.choice(
    values
)
// Effect<string,
//   NoSuchElementError>`,
        apis: ["Random.shuffle", "Random.choice", "Cause.NoSuchElementError"],
        notice: "choice's error type depends on the input type. A known non-empty collection removes the impossible empty case; a general Iterable keeps NoSuchElementError in the Effect error channel.",
    },

    Seed: {
        eyebrow: "reproducible pseudo-random sequences",
        title: "Run any Effect under withSeed so the same seed reproduces the same Random sequence",
        description:
            "withSeed provides a deterministic seeded Random service for the wrapped Effect. String and numeric seeds are supported. The current tests verify equal seeds reproduce next, nextBoolean, shuffle, and choice sequences while distinct seeds produce different sequences.",
        code: `const program =
    Effect.all([
        Random.next,
        Random.next,
        Random.nextInt
    ])

const first =
    program.pipe(
        Random.withSeed(
            "demo"
        )
    )

const second =
    program.pipe(
        Random.withSeed(
            "demo"
        )
    )

// first and second
// produce identical sequences`,
        apis: ["Random.withSeed", "Random.Random"],
        notice: "A seed makes pseudo-random execution reproducible; it does not make the values cryptographically unpredictable. Use seeding for tests, simulations, fixtures, and replayable behavior.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type ServiceSnapshot = Readonly<{
    mode: ServiceCase
    interface: string
    reference: string
    primitive: string
    injected: string
    defaultSecurity: string
}>

export const service_snapshot = (model: Model): ServiceSnapshot => ({
    mode: model.serviceCase,
    interface: "nextIntUnsafe(): number · nextDoubleUnsafe(): number",
    reference: "Random.Random = Context.Reference<Random.Random>",
    primitive: "higher-level generators read the active fiber service",
    injected: "fixed nextDoubleUnsafe = 0.75 → Random.next = 0.75",
    defaultSecurity: "pseudo-random · not cryptographically secure",
})

export type GenerateSnapshot = Readonly<{
    mode: GenerateCase
    next: string
    boolean: string
    integer: string
    between: string
    closed: string
    halfOpen: string
}>

export const generate_snapshot = (model: Model): GenerateSnapshot => ({
    mode: model.generateCase,
    next: "[0, 1)",
    boolean: "nextDoubleUnsafe() > 0.5",
    integer: "safe integer · MIN_SAFE_INTEGER … MAX_SAFE_INTEGER",
    between: "nextBetween(min,max) → [min,max)",
    closed: "nextIntBetween(1,6) → 1…6",
    halfOpen: "nextIntBetween(1,6,{ halfOpen:true }) → 1…5",
})

export type CollectionsSnapshot = Readonly<{
    mode: CollectionsCase
    shuffle: string
    mutation: string
    knownChoice: string
    maybeChoice: string
    emptyError: string
}>

export const collections_snapshot = (model: Model): CollectionsSnapshot => ({
    mode: model.collectionsCase,
    shuffle: "Iterable<A> → Effect<Array<A>>",
    mutation: "source untouched · shuffled copy returned",
    knownChoice: "non-empty tuple / NonEmptyIterable → Effect<A>",
    maybeChoice: "general Iterable<A> → Effect<A, NoSuchElementError>",
    emptyError:
        "empty general iterable → Cannot select a random element from an empty array",
})

export type SeedSnapshot = Readonly<{
    mode: SeedCase
    deterministic: string
    supported: string
    same: string
    different: string
    implementation: string
}>

export const seed_snapshot = (model: Model): SeedSnapshot => ({
    mode: model.seedCase,
    deterministic: "same program + same seed → same pseudo-random sequence",
    supported: "seed: string | number",
    same: '"demo" + "demo" → reproducible equality',
    different: "different seeds → different tested sequences",
    implementation: "withSeed locally provides a seeded Random service",
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedRandomStage: {
        stage: Stage,
    },
    SelectedRandomServiceCase: {
        serviceCase: ServiceCase,
    },
    SelectedRandomGenerateCase: {
        generateCase: GenerateCase,
    },
    SelectedRandomCollectionsCase: {
        collectionsCase: CollectionsCase,
    },
    SelectedRandomSeedCase: {
        seedCase: SeedCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Service",
    serviceCase: "Reference",
    generateCase: "Scalar",
    collectionsCase: "Shuffle",
    seedCase: "Repeat",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type ServiceCasePayload = Readonly<{
    serviceCase: ServiceCase
}>

type GenerateCasePayload = Readonly<{
    generateCase: GenerateCase
}>

type CollectionsCasePayload = Readonly<{
    collectionsCase: CollectionsCase
}>

type SeedCasePayload = Readonly<{
    seedCase: SeedCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedRandomStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedRandomServiceCase: ({ serviceCase }: ServiceCasePayload) => ({
            model: evo(model, {
                serviceCase: () => serviceCase,
            }),
        }),

        SelectedRandomGenerateCase: ({
            generateCase,
        }: GenerateCasePayload) => ({
            model: evo(model, {
                generateCase: () => generateCase,
            }),
        }),

        SelectedRandomCollectionsCase: ({
            collectionsCase,
        }: CollectionsCasePayload) => ({
            model: evo(model, {
                collectionsCase: () => collectionsCase,
            }),
        }),

        SelectedRandomSeedCase: ({ seedCase }: SeedCasePayload) => ({
            model: evo(model, {
                seedCase: () => seedCase,
            }),
        }),
    })

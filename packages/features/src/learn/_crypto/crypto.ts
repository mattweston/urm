import { Clock, Crypto, Effect, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// Deterministic Crypto service used by the teaching demo
// -----------------------------------------------------------------------------

const DIGEST_LENGTHS: Record<Crypto.DigestAlgorithm, number> = {
    "SHA-1": 20,
    "SHA-256": 32,
    "SHA-384": 48,
    "SHA-512": 64,
}

const make_demo_digest = (
    algorithm: Crypto.DigestAlgorithm,
    data: Uint8Array
): Uint8Array => {
    const size = DIGEST_LENGTHS[algorithm]
    const output = new Uint8Array(size)
    const algorithmSalt = algorithm
        .split("")
        .reduce((sum, character) => sum + character.charCodeAt(0), 0)

    for (let index = 0; index < output.length; index += 1) {
        const input = data.length === 0 ? 0 : data[index % data.length]!
        output[index] = (input + algorithmSalt + index * 37) & 0xff
    }

    return output
}

/**
 * A repeatable test implementation for the visual demo.
 *
 * Production Crypto implementations must use cryptographically secure platform
 * randomness. This deterministic generator exists only so the teaching UI is
 * stable across renders and tests.
 */
export const make_demo_crypto = (): Crypto.Crypto => {
    let cursor = 0

    return Crypto.make({
        randomBytes: (size) => {
            const bytes = new Uint8Array(size)

            for (let index = 0; index < size; index += 1) {
                bytes[index] = (41 + cursor * 73 + index * 29) & 0xff
            }

            cursor += size + 1
            return bytes
        },
        digest: (algorithm, data) =>
            Effect.succeed(make_demo_digest(algorithm, data)),
    })
}

const DEMO_TIME_MILLIS = Date.UTC(2026, 8, 19, 9, 30, 0)

const make_fixed_clock = (millis: number): Clock.Clock => ({
    currentTimeMillisUnsafe: () => millis,
    currentTimeMillis: Effect.succeed(millis),
    currentTimeNanosUnsafe: () => BigInt(millis) * 1_000_000n,
    currentTimeNanos: Effect.succeed(BigInt(millis) * 1_000_000n),
    monotonicTimeNanosUnsafe: () => 0n,
    monotonicTimeNanos: Effect.succeed(0n),
    sleep: () => Effect.void,
})

const run = <A, E>(
    operation: (crypto: Crypto.Crypto) => Effect.Effect<A, E>
): A => Effect.runSync(operation(make_demo_crypto()))

const bytes_to_hex = (bytes: Uint8Array): string =>
    Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

const text_bytes = (text: string): Uint8Array => new TextEncoder().encode(text)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Service"),
    S.Literal("Random"),
    S.Literal("IDs"),
    S.Literal("Digest"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Service",
    "Random",
    "IDs",
    "Digest",
]

export const ByteSizePreset = S.Union([
    S.Literal("Eight"),
    S.Literal("Sixteen"),
    S.Literal("ThirtyTwo"),
])
export type ByteSizePreset = typeof ByteSizePreset.Type

export const RangeMode = S.Union([
    S.Literal("Inclusive"),
    S.Literal("HalfOpen"),
])
export type RangeMode = typeof RangeMode.Type

export const IdClockPreset = S.Union([
    S.Literal("Epoch"),
    S.Literal("DemoTime"),
])
export type IdClockPreset = typeof IdClockPreset.Type

export const DigestChoice = S.Union([
    S.Literal("SHA-1"),
    S.Literal("SHA-256"),
    S.Literal("SHA-384"),
    S.Literal("SHA-512"),
])
export type DigestChoice = typeof DigestChoice.Type

export const DigestInput = S.Union([S.Literal("Effect"), S.Literal("Foldkit")])
export type DigestInput = typeof DigestInput.Type

export const Model = S.Struct({
    stage: Stage,
    byteSize: ByteSizePreset,
    rangeMode: RangeMode,
    idClock: IdClockPreset,
    digestAlgorithm: DigestChoice,
    digestInput: DigestInput,
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
        eyebrow: "service constructor",
        title: "Two primitives power the whole Crypto service",
        description:
            "Crypto.make accepts secure random bytes and a digest implementation, then derives random values, ranges, shuffling, UUIDs, and ULIDs around them.",
        code: `const crypto = Crypto.make({
    randomBytes: (size) =>
        platformSecureBytes(size),

    digest: (algorithm, data) =>
        platformDigest(algorithm, data)
})

const program = Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto
    return yield* crypto.randomBytes(16)
})`,
        apis: ["Crypto.make", "Crypto.Crypto", "Crypto.DigestAlgorithm"],
        notice: "The demo uses a deterministic test primitive so screenshots stay stable. A production implementation must return cryptographically secure fresh bytes; UUID formatting mutates its temporary byte array.",
    },
    Random: {
        eyebrow: "secure randomness",
        title: "Bytes are lifted into numbers, ranges, choices, and shuffles",
        description:
            "The derived helpers are Effects, while nextDoubleUnsafe and nextIntUnsafe expose synchronous escape hatches when you already hold the service.",
        code: `const crypto = yield* Crypto.Crypto

const bytes = yield* crypto.randomBytes(16)
const unit = yield* crypto.random
const coin = yield* crypto.randomBoolean
const float = yield* crypto.randomBetween(10, 20)
const die = yield* crypto.randomIntBetween(1, 6)
const order = yield* crypto.randomShuffle([
    "A", "B", "C", "D"
])`,
        apis: [
            "randomBytes",
            "random",
            "randomBoolean",
            "randomInt",
            "randomBetween",
            "randomIntBetween",
            "randomShuffle",
            "nextDoubleUnsafe",
            "nextIntUnsafe",
        ],
        notice: "randomBetween is [min, max). randomIntBetween is inclusive by default; halfOpen: true excludes the upper bound. randomBytes also validates that size is a non-negative safe integer.",
    },
    IDs: {
        eyebrow: "secure identifiers",
        title: "Generate UUIDv4, UUIDv7, and ULID from one service",
        description:
            "UUIDv4 is randomness-only. UUIDv7 and ULID combine secure random bytes with the active Effect Clock, so time remains injectable and testable.",
        code: `const crypto = yield* Crypto.Crypto

const v4 = yield* crypto.randomUUIDv4
const v7 = yield* crypto.randomUUIDv7
const ulid = yield* crypto.randomULID

// v7 + ULID read Clock.currentTimeMillis
const deterministic = program.pipe(
    Effect.provideService(
        Clock.Clock,
        fixedClock
    )
)`,
        apis: ["randomUUIDv4", "randomUUIDv7", "randomULID", "Clock.Clock"],
        notice: "UUIDv7 and ULID encode a timestamp, but the service still gets time through Effect Clock. The demo swaps in a fixed clock so the generated identifiers are deterministic.",
    },
    Digest: {
        eyebrow: "message digests",
        title: "Digest chooses a SHA algorithm and delegates to the platform",
        description:
            "The core Crypto service defines the algorithm union and effectful contract. Runtime packages supply the real host-backed digest primitive.",
        code: `const data = new TextEncoder().encode("Effect")

const hash = yield* crypto.digest(
    "SHA-256",
    data
)

// Supported by the service type:
// SHA-1 | SHA-256 | SHA-384 | SHA-512`,
        apis: [
            "digest",
            "Crypto.DigestAlgorithm",
            "SHA-1",
            "SHA-256",
            "SHA-384",
            "SHA-512",
        ],
        notice: "SHA-1 remains available for interoperability, not for new security-sensitive designs. This teaching service uses a deterministic fake digest primitive; production runtime layers delegate to real platform crypto APIs.",
    },
}

// -----------------------------------------------------------------------------
// Derived visual snapshots
// -----------------------------------------------------------------------------

export type ServiceSnapshot = Readonly<{
    primitiveCount: number
    derivedRandom: ReadonlyArray<string>
    derivedIds: ReadonlyArray<string>
    digestAlgorithms: ReadonlyArray<Crypto.DigestAlgorithm>
}>

export const service_snapshot = (): ServiceSnapshot => ({
    primitiveCount: 2,
    derivedRandom: [
        "random",
        "randomBoolean",
        "randomInt",
        "randomBetween",
        "randomIntBetween",
        "randomShuffle",
    ],
    derivedIds: ["randomUUIDv4", "randomUUIDv7", "randomULID"],
    digestAlgorithms: ["SHA-1", "SHA-256", "SHA-384", "SHA-512"],
})

const byte_size = (preset: ByteSizePreset): number => {
    if (preset === "Eight") {
        return 8
    }

    if (preset === "ThirtyTwo") {
        return 32
    }

    return 16
}

export type RandomSnapshot = Readonly<{
    byteSize: number
    bytesHex: string
    random: string
    randomBoolean: boolean
    randomInt: string
    randomBetween: string
    randomIntBetween: number
    rangeNotation: string
    shuffled: ReadonlyArray<string>
    unsafeDouble: string
    unsafeInt: string
}>

export const random_snapshot = (model: Model): RandomSnapshot => {
    const size = byte_size(model.byteSize)
    const halfOpen = model.rangeMode === "HalfOpen"

    return {
        byteSize: size,
        bytesHex: bytes_to_hex(run((crypto) => crypto.randomBytes(size))),
        random: run((crypto) => crypto.random).toFixed(8),
        randomBoolean: run((crypto) => crypto.randomBoolean),
        randomInt: run((crypto) => crypto.randomInt).toString(),
        randomBetween: run((crypto) => crypto.randomBetween(10, 20)).toFixed(4),
        randomIntBetween: run((crypto) =>
            crypto.randomIntBetween(1, 6, { halfOpen })
        ),
        rangeNotation: halfOpen ? "[1, 6)" : "[1, 6]",
        shuffled: run((crypto) =>
            crypto.randomShuffle(["A", "B", "C", "D", "E"])
        ),
        unsafeDouble: make_demo_crypto().nextDoubleUnsafe().toFixed(8),
        unsafeInt: make_demo_crypto().nextIntUnsafe().toString(),
    }
}

const id_clock_millis = (preset: IdClockPreset): number =>
    preset === "Epoch" ? 0 : DEMO_TIME_MILLIS

export type IdSnapshot = Readonly<{
    clockLabel: string
    clockIso: string
    uuidV4: string
    uuidV7: string
    ulid: string
    uuidV4Version: string
    uuidV7Version: string
    ulidLength: number
}>

export const id_snapshot = (model: Model): IdSnapshot => {
    const millis = id_clock_millis(model.idClock)
    const clock = make_fixed_clock(millis)

    const uuidV4 = Effect.runSync(make_demo_crypto().randomUUIDv4)
    const uuidV7 = Effect.runSync(
        Effect.provideService(
            make_demo_crypto().randomUUIDv7,
            Clock.Clock,
            clock
        )
    )
    const ulid = Effect.runSync(
        Effect.provideService(make_demo_crypto().randomULID, Clock.Clock, clock)
    )

    return {
        clockLabel: model.idClock === "Epoch" ? "Unix epoch" : "Demo time",
        clockIso: new Date(millis).toISOString(),
        uuidV4,
        uuidV7,
        ulid,
        uuidV4Version: uuidV4[14] ?? "?",
        uuidV7Version: uuidV7[14] ?? "?",
        ulidLength: ulid.length,
    }
}

const digest_input_text = (input: DigestInput): string =>
    input === "Foldkit" ? "Foldkit" : "Effect"

export type DigestSnapshot = Readonly<{
    algorithm: Crypto.DigestAlgorithm
    input: string
    inputBytes: string
    outputBytes: number
    outputHex: string
    legacy: boolean
}>

export const digest_snapshot = (model: Model): DigestSnapshot => {
    const algorithm: Crypto.DigestAlgorithm = model.digestAlgorithm
    const input = digest_input_text(model.digestInput)
    const inputBytes = text_bytes(input)
    const output = run((crypto) => crypto.digest(algorithm, inputBytes))

    return {
        algorithm,
        input,
        inputBytes: bytes_to_hex(inputBytes),
        outputBytes: output.length,
        outputHex: bytes_to_hex(output),
        legacy: algorithm === "SHA-1",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedCryptoStage: { stage: Stage },
    ClickedCycleCryptoByteSize: {},
    ClickedToggleCryptoRangeMode: {},
    ClickedToggleCryptoIdClock: {},
    SelectedCryptoDigestAlgorithm: { algorithm: DigestChoice },
    ClickedToggleCryptoDigestInput: {},
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Service",
    byteSize: "Sixteen",
    rangeMode: "Inclusive",
    idClock: "DemoTime",
    digestAlgorithm: "SHA-256",
    digestInput: "Effect",
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedCryptoStage: ({ stage }) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),
        ClickedCycleCryptoByteSize: () => ({
            model: modifyFields(model, {
                byteSize: (size) =>
                    size === "Eight"
                        ? "Sixteen"
                        : size === "Sixteen"
                          ? "ThirtyTwo"
                          : "Eight",
            }),
        }),
        ClickedToggleCryptoRangeMode: () => ({
            model: modifyFields(model, {
                rangeMode: (mode) =>
                    mode === "Inclusive" ? "HalfOpen" : "Inclusive",
            }),
        }),
        ClickedToggleCryptoIdClock: () => ({
            model: modifyFields(model, {
                idClock: (preset) =>
                    preset === "Epoch" ? "DemoTime" : "Epoch",
            }),
        }),
        SelectedCryptoDigestAlgorithm: ({ algorithm }) => ({
            model: modifyFields(model, {
                digestAlgorithm: () => algorithm,
            }),
        }),
        ClickedToggleCryptoDigestInput: () => ({
            model: modifyFields(model, {
                digestInput: (input) =>
                    input === "Effect" ? "Foldkit" : "Effect",
            }),
        }),
    })

import { Encoding, Result, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Base64"),
    S.Literal("Base64Url"),
    S.Literal("Hex"),
    S.Literal("Errors"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Base64",
    "Base64Url",
    "Hex",
    "Errors",
]

export const Base64Case = S.Union([
    S.Literal("Text"),
    S.Literal("Unicode"),
    S.Literal("Bytes"),
])
export type Base64Case = typeof Base64Case.Type

export const Base64UrlCase = S.Union([
    S.Literal("Question"),
    S.Literal("Binary"),
    S.Literal("Padding"),
])
export type Base64UrlCase = typeof Base64UrlCase.Type

export const HexCase = S.Union([
    S.Literal("Text"),
    S.Literal("Bytes"),
    S.Literal("RandomRules"),
])
export type HexCase = typeof HexCase.Type

export const ErrorCase = S.Union([
    S.Literal("Base64Length"),
    S.Literal("Base64Padding"),
    S.Literal("UrlAlphabet"),
    S.Literal("HexOdd"),
    S.Literal("HexCharacter"),
])
export type ErrorCase = typeof ErrorCase.Type

export const Model = S.Struct({
    stage: Stage,
    base64Case: Base64Case,
    base64UrlCase: Base64UrlCase,
    hexCase: HexCase,
    errorCase: ErrorCase,
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
    Base64: {
        eyebrow: "standard RFC4648",
        title: "Base64 turns UTF-8 text or bytes into padded transport text",
        description:
            "String input is first encoded as UTF-8. Uint8Array input is encoded directly. Decoding is safe and returns Result instead of throwing on malformed input.",
        code: `Encoding.encodeBase64("hello")
// "aGVsbG8="

const bytes =
    new Uint8Array([
        72, 101, 108, 108, 111
    ])

Encoding.encodeBase64(bytes)
// "SGVsbG8="

Encoding.decodeBase64String(
    "aGVsbG8="
)
// Result.succeed("hello")`,
        apis: [
            "Encoding.encodeBase64",
            "Encoding.decodeBase64",
            "Encoding.decodeBase64String",
        ],
        notice: "The standard Base64 encoder uses the RFC4648 alphabet and '=' padding. The decoder strips CR/LF before validating length, padding position, and characters.",
    },

    Base64Url: {
        eyebrow: "URL-safe alphabet",
        title: "Base64Url swaps unsafe characters and drops padding",
        description:
            "Base64Url uses '-' instead of '+', '_' instead of '/', and encode output omits '=' padding. The decoder accepts valid padded and unpadded URL-safe forms.",
        code: `Encoding.encodeBase64Url(
    "hello?"
)
// "aGVsbG8_"

Encoding.encodeBase64(
    "hello?"
)
// "aGVsbG8/"

Encoding.decodeBase64UrlString(
    "aGVsbG8_"
)
// Result.succeed("hello?")`,
        apis: [
            "Encoding.encodeBase64Url",
            "Encoding.decodeBase64Url",
            "Encoding.decodeBase64UrlString",
            "Encoding.encodeBase64",
        ],
        notice: "Base64Url is not merely Base64 with padding removed: '+' and '/' are replaced by '-' and '_'. Decode normalizes valid URL-safe input back to standard Base64 internally.",
    },

    Hex: {
        eyebrow: "hexadecimal text",
        title: "Hex exposes bytes as lowercase pairs",
        description:
            "Each byte becomes two lowercase hexadecimal characters. Text inputs are UTF-8 encoded first; byte inputs are represented directly.",
        code: `Encoding.encodeHex("hello")
// "68656c6c6f"

Encoding.decodeHexString(
    "68656c6c6f"
)
// Result.succeed("hello")

Encoding.randomHex(16)
// random 16-character lowercase hex`,
        apis: [
            "Encoding.encodeHex",
            "Encoding.decodeHex",
            "Encoding.decodeHexString",
            "Encoding.randomHex",
        ],
        notice: "randomHex uses Math.random(), is optimized around 8-character words, and is not cryptographically secure. For security-sensitive IDs, use Crypto.randomBytes and encodeHex.",
    },

    Errors: {
        eyebrow: "safe decode failures",
        title: "Malformed input becomes structured EncodingError data",
        description:
            "Decode failures preserve the module, operation kind, original input, and message inside Result.Failure. The runtime marker lets unknown values be narrowed with isEncodingError.",
        code: `const result =
    Encoding.decodeHex("xyz")

if (Result.isFailure(result)) {
    const error = result.failure

    error._tag
    // "EncodingError"

    error.kind
    // "Decode"

    error.module
    // "Hex"

    Encoding.isEncodingError(error)
    // true
}`,
        apis: [
            "Encoding.EncodingError",
            "Encoding.isEncodingError",
            "Encoding.EncodingErrorTypeId",
            "Result.isFailure",
        ],
        notice: "Current public encode helpers return strings directly; decode helpers carry malformed-input failures as Result. EncodingError is a tagged, yieldable error with a dedicated runtime TypeId marker.",
    },
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const format_bytes = (bytes: Uint8Array): string =>
    `[${Array.from(bytes).join(", ")}]`

const utf8_bytes = (text: string): Uint8Array => new TextEncoder().encode(text)

const result_bytes = (
    result: Result.Result<Uint8Array, Encoding.EncodingError>
): string =>
    Result.isSuccess(result) ? format_bytes(result.success) : "Failure"

const result_string = (
    result: Result.Result<string, Encoding.EncodingError>
): string => (Result.isSuccess(result) ? result.success : "Failure")

// -----------------------------------------------------------------------------
// BASE64 SNAPSHOT
// -----------------------------------------------------------------------------

export type Base64Snapshot = Readonly<{
    inputKind: string
    inputDisplay: string
    bytes: string
    encoded: string
    encodedLength: number
    paddingCount: number
    decodedBytes: string
    decodedText: string
    roundTrip: boolean
}>

export const base64_snapshot = (model: Model): Base64Snapshot => {
    if (model.base64Case === "Bytes") {
        const input = new Uint8Array([0, 255, 16, 32])

        const encoded = Encoding.encodeBase64(input)

        const decoded = Encoding.decodeBase64(encoded)

        return {
            inputKind: "Uint8Array",
            inputDisplay: format_bytes(input),
            bytes: format_bytes(input),
            encoded,
            encodedLength: encoded.length,
            paddingCount: encoded.endsWith("==")
                ? 2
                : encoded.endsWith("=")
                  ? 1
                  : 0,
            decodedBytes: result_bytes(decoded),
            decodedText: "binary input",
            roundTrip:
                Result.isSuccess(decoded) &&
                format_bytes(decoded.success) === format_bytes(input),
        }
    }

    const text = model.base64Case === "Unicode" ? "café ☕" : "hello"

    const bytes = utf8_bytes(text)

    const encoded = Encoding.encodeBase64(text)

    const decodedBytes = Encoding.decodeBase64(encoded)

    const decodedText = Encoding.decodeBase64String(encoded)

    return {
        inputKind: "string → UTF-8",
        inputDisplay: JSON.stringify(text),
        bytes: format_bytes(bytes),
        encoded,
        encodedLength: encoded.length,
        paddingCount: encoded.endsWith("==")
            ? 2
            : encoded.endsWith("=")
              ? 1
              : 0,
        decodedBytes: result_bytes(decodedBytes),
        decodedText: result_string(decodedText),
        roundTrip:
            Result.isSuccess(decodedText) && decodedText.success === text,
    }
}

// -----------------------------------------------------------------------------
// BASE64URL SNAPSHOT
// -----------------------------------------------------------------------------

export type Base64UrlSnapshot = Readonly<{
    input: string
    bytes: string
    standard: string
    urlSafe: string
    hasPadding: boolean
    usesDash: boolean
    usesUnderscore: boolean
    decoded: string
    roundTrip: boolean
    paddedVariant: string
    paddedAccepted: boolean
}>

export const base64url_snapshot = (model: Model): Base64UrlSnapshot => {
    if (model.base64UrlCase === "Binary") {
        const bytes = new Uint8Array([251, 255, 239])

        const standard = Encoding.encodeBase64(bytes)

        const urlSafe = Encoding.encodeBase64Url(bytes)

        const decoded = Encoding.decodeBase64Url(urlSafe)

        return {
            input: "binary bytes",
            bytes: format_bytes(bytes),
            standard,
            urlSafe,
            hasPadding: urlSafe.includes("="),
            usesDash: urlSafe.includes("-"),
            usesUnderscore: urlSafe.includes("_"),
            decoded: result_bytes(decoded),
            roundTrip:
                Result.isSuccess(decoded) &&
                format_bytes(decoded.success) === format_bytes(bytes),
            paddedVariant: urlSafe,
            paddedAccepted: true,
        }
    }

    const text = model.base64UrlCase === "Padding" ? "hi" : "hello?"

    const standard = Encoding.encodeBase64(text)

    const urlSafe = Encoding.encodeBase64Url(text)

    const paddedVariant =
        urlSafe.length % 4 === 2
            ? `${urlSafe}==`
            : urlSafe.length % 4 === 3
              ? `${urlSafe}=`
              : urlSafe

    const decoded = Encoding.decodeBase64UrlString(urlSafe)

    const paddedDecoded = Encoding.decodeBase64UrlString(paddedVariant)

    return {
        input: JSON.stringify(text),
        bytes: format_bytes(utf8_bytes(text)),
        standard,
        urlSafe,
        hasPadding: urlSafe.includes("="),
        usesDash: urlSafe.includes("-"),
        usesUnderscore: urlSafe.includes("_"),
        decoded: result_string(decoded),
        roundTrip: Result.isSuccess(decoded) && decoded.success === text,
        paddedVariant,
        paddedAccepted: Result.isSuccess(paddedDecoded),
    }
}

// -----------------------------------------------------------------------------
// HEX SNAPSHOT
// -----------------------------------------------------------------------------

export type HexSnapshot = Readonly<{
    mode: string
    input: string
    bytes: string
    encoded: string
    lowercase: boolean
    decodedBytes: string
    decodedText: string
    roundTrip: boolean
    randomRequested: number
    randomActualLength: number
    shortRequested: number
    shortActualLength: number
    secure: boolean
}>

export const hex_snapshot = (model: Model): HexSnapshot => {
    if (model.hexCase === "RandomRules") {
        const randomRequested = 18
        const randomActualLength = Encoding.randomHex(randomRequested).length

        const shortRequested = 7
        const shortActualLength = Encoding.randomHex(shortRequested).length

        return {
            mode: "randomHex rules",
            input: "length only",
            bytes: "—",
            encoded: "random content hidden",
            lowercase: true,
            decodedBytes: "—",
            decodedText: "—",
            roundTrip: false,
            randomRequested,
            randomActualLength,
            shortRequested,
            shortActualLength,
            secure: false,
        }
    }

    if (model.hexCase === "Bytes") {
        const bytes = new Uint8Array([0, 15, 16, 127, 255])

        const encoded = Encoding.encodeHex(bytes)

        const decoded = Encoding.decodeHex(encoded)

        return {
            mode: "Uint8Array",
            input: format_bytes(bytes),
            bytes: format_bytes(bytes),
            encoded,
            lowercase: encoded === encoded.toLowerCase(),
            decodedBytes: result_bytes(decoded),
            decodedText: "binary input",
            roundTrip:
                Result.isSuccess(decoded) &&
                format_bytes(decoded.success) === format_bytes(bytes),
            randomRequested: 18,
            randomActualLength: 16,
            shortRequested: 7,
            shortActualLength: 0,
            secure: false,
        }
    }

    const text = "hello"

    const encoded = Encoding.encodeHex(text)

    const decodedBytes = Encoding.decodeHex(encoded)

    const decodedText = Encoding.decodeHexString(encoded)

    return {
        mode: "string → UTF-8",
        input: JSON.stringify(text),
        bytes: format_bytes(utf8_bytes(text)),
        encoded,
        lowercase: encoded === encoded.toLowerCase(),
        decodedBytes: result_bytes(decodedBytes),
        decodedText: result_string(decodedText),
        roundTrip:
            Result.isSuccess(decodedText) && decodedText.success === text,
        randomRequested: 18,
        randomActualLength: 16,
        shortRequested: 7,
        shortActualLength: 0,
        secure: false,
    }
}

// -----------------------------------------------------------------------------
// ERROR SNAPSHOT
// -----------------------------------------------------------------------------

const error_result = (
    errorCase: ErrorCase
): Result.Result<Uint8Array, Encoding.EncodingError> => {
    if (errorCase === "Base64Length") {
        return Encoding.decodeBase64("abc")
    }

    if (errorCase === "Base64Padding") {
        return Encoding.decodeBase64("a=bc")
    }

    if (errorCase === "UrlAlphabet") {
        return Encoding.decodeBase64Url("abc+")
    }

    if (errorCase === "HexOdd") {
        return Encoding.decodeHex("abc")
    }

    return Encoding.decodeHex("zz")
}

export type ErrorSnapshot = Readonly<{
    input: string
    decoder: string
    resultTag: string
    errorTag: string
    kind: string
    module: string
    message: string
    isEncodingError: boolean
    typeId: string
}>

export const error_snapshot = (model: Model): ErrorSnapshot => {
    const input =
        model.errorCase === "Base64Length"
            ? "abc"
            : model.errorCase === "Base64Padding"
              ? "a=bc"
              : model.errorCase === "UrlAlphabet"
                ? "abc+"
                : model.errorCase === "HexOdd"
                  ? "abc"
                  : "zz"

    const decoder =
        model.errorCase === "Base64Length" ||
        model.errorCase === "Base64Padding"
            ? "decodeBase64"
            : model.errorCase === "UrlAlphabet"
              ? "decodeBase64Url"
              : "decodeHex"

    const result = error_result(model.errorCase)

    if (Result.isSuccess(result)) {
        return {
            input,
            decoder,
            resultTag: "Success",
            errorTag: "—",
            kind: "—",
            module: "—",
            message: "—",
            isEncodingError: false,
            typeId: Encoding.EncodingErrorTypeId,
        }
    }

    const error = result.failure

    return {
        input,
        decoder,
        resultTag: result._tag,
        errorTag: error._tag,
        kind: error.kind,
        module: error.module,
        message: error.message,
        isEncodingError: Encoding.isEncodingError(error),
        typeId: Encoding.EncodingErrorTypeId,
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedEncodingStage: {
        stage: Stage,
    },
    SelectedEncodingBase64Case: {
        base64Case: Base64Case,
    },
    SelectedEncodingBase64UrlCase: {
        base64UrlCase: Base64UrlCase,
    },
    SelectedEncodingHexCase: {
        hexCase: HexCase,
    },
    SelectedEncodingErrorCase: {
        errorCase: ErrorCase,
    },
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Base64",
    base64Case: "Text",
    base64UrlCase: "Question",
    hexCase: "Text",
    errorCase: "Base64Length",
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedEncodingStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedEncodingBase64Case: ({ base64Case }) => ({
            model: evo(model, {
                base64Case: () => base64Case,
            }),
        }),

        SelectedEncodingBase64UrlCase: ({ base64UrlCase }) => ({
            model: evo(model, {
                base64UrlCase: () => base64UrlCase,
            }),
        }),

        SelectedEncodingHexCase: ({ hexCase }) => ({
            model: evo(model, {
                hexCase: () => hexCase,
            }),
        }),

        SelectedEncodingErrorCase: ({ errorCase }) => ({
            model: evo(model, {
                errorCase: () => errorCase,
            }),
        }),
    })

import { Equal, Equivalence, Redacted, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL REDACTED PROGRAMS
// -----------------------------------------------------------------------------

export const SAMPLE_SECRET = "sk_demo_42ZX"

export const plain_secret = Redacted.make(SAMPLE_SECRET)

export const labelled_secret = Redacted.make(SAMPLE_SECRET, {
    label: "api-key",
})

export const plain_string_preview = String(plain_secret)
export const labelled_string_preview = String(labelled_secret)
export const labelled_json_preview = JSON.stringify(labelled_secret)

export const is_redacted = (
    value: unknown
): value is Redacted.Redacted<unknown> => Redacted.isRedacted(value)

export const reveal_labelled_secret = (): string =>
    Redacted.value(labelled_secret)

export type LabelledSecretValue = Redacted.Redacted.Value<
    typeof labelled_secret
>

export const preserve_secret_value_type = (
    value: LabelledSecretValue
): LabelledSecretValue => value

export const strict_string_equivalence: Equivalence.Equivalence<string> = (
    left: string,
    right: string
): boolean => left === right

export const strict_secret_equivalence = Redacted.makeEquivalence(
    strict_string_equivalence
)

export const case_insensitive_string_equivalence: Equivalence.Equivalence<
    string
> = (left: string, right: string): boolean =>
    left.toLowerCase() === right.toLowerCase()

export const case_insensitive_secret_equivalence = Redacted.makeEquivalence(
    case_insensitive_string_equivalence
)

export const equal_wrappers = (
    left: Redacted.Redacted<string>,
    right: Redacted.Redacted<string>
): boolean => Equal.equals(left, right)

const error_message = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

export type WipeProbe = Readonly<{
    first: boolean
    second: boolean
    stillRedacted: boolean
    valueAfterWipe: string
    aliasValue: string
    printableAfterWipe: string
}>

export const wipe_probe = (): WipeProbe => {
    const original = {
        token: SAMPLE_SECRET,
    }
    const alias = original
    const secret = Redacted.make(original, {
        label: "ephemeral-token",
    })

    const first = Redacted.wipeUnsafe(secret)
    const stillRedacted = Redacted.isRedacted(secret)

    let valueAfterWipe: string

    try {
        Redacted.value(secret)
        valueAfterWipe = "unexpectedly available"
    } catch (error: unknown) {
        valueAfterWipe = error_message(error)
    }

    const second = Redacted.wipeUnsafe(secret)

    return {
        first,
        second,
        stillRedacted,
        valueAfterWipe,
        aliasValue: alias.token,
        printableAfterWipe: String(secret),
    }
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Wrap"),
    S.Literal("Reveal"),
    S.Literal("Compare"),
    S.Literal("Wipe"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Wrap",
    "Reveal",
    "Compare",
    "Wipe",
]

export const WrapCase = S.Union([
    S.Literal("Plain"),
    S.Literal("Label"),
    S.Literal("Guard"),
    S.Literal("JSON"),
])
export type WrapCase = typeof WrapCase.Type

export const wrap_cases: ReadonlyArray<WrapCase> = [
    "Plain",
    "Label",
    "Guard",
    "JSON",
]

export const RevealCase = S.Union([
    S.Literal("Trusted"),
    S.Literal("Unknown"),
    S.Literal("Type"),
    S.Literal("Boundary"),
])
export type RevealCase = typeof RevealCase.Type

export const reveal_cases: ReadonlyArray<RevealCase> = [
    "Trusted",
    "Unknown",
    "Type",
    "Boundary",
]

export const CompareCase = S.Union([
    S.Literal("Same"),
    S.Literal("Different"),
    S.Literal("Custom"),
    S.Literal("BuiltIn"),
])
export type CompareCase = typeof CompareCase.Type

export const compare_cases: ReadonlyArray<CompareCase> = [
    "Same",
    "Different",
    "Custom",
    "BuiltIn",
]

export const WipeCase = S.Union([
    S.Literal("First"),
    S.Literal("Second"),
    S.Literal("Identity"),
    S.Literal("Alias"),
])
export type WipeCase = typeof WipeCase.Type

export const wipe_cases: ReadonlyArray<WipeCase> = [
    "First",
    "Second",
    "Identity",
    "Alias",
]

export const Model = S.Struct({
    stage: Stage,
    wrapCase: WrapCase,
    revealCase: RevealCase,
    compareCase: CompareCase,
    wipeCase: WipeCase,
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
    Wrap: {
        eyebrow: "a wrapper that changes ordinary presentation",
        title: "Hide normal output while keeping the original value available",
        description:
            "Redacted.make stores a sensitive value behind a wrapper whose string, JSON, and inspection output is a redacted placeholder. An optional label can identify the kind of secret without revealing the secret itself.",
        code: `const apiKey =
    Redacted.make(
        "sk_demo_42ZX",
        { label: "api-key" }
    )

String(apiKey)
// "<redacted:api-key>"

JSON.stringify(apiKey)
// "\\\"<redacted:api-key>\\\""

Redacted.isRedacted(apiKey)
// true`,
        apis: ["Redacted.make", "Redacted.isRedacted", "Redacted.Redacted"],
        notice: "Labels are visible in the placeholder and in some errors. Treat a label as public metadata: use names such as api-key or database-password, never the secret itself.",
    },

    Reveal: {
        eyebrow: "recovery is deliberately explicit",
        title: "Reveal only at the trusted boundary that genuinely needs the value",
        description:
            "Redacted.value returns the original value with its original type. The wrapper reduces accidental disclosure; it does not make the value inaccessible. Use the guard before revealing unknown input, and keep reveal calls narrow and auditable.",
        code: `const secret =
    Redacted.make(
        "sk_demo_42ZX",
        { label: "api-key" }
    )

if (
    Redacted.isRedacted(secret)
) {
    const raw =
        Redacted.value(secret)

    // raw: string
}

type Raw =
    Redacted.Redacted.Value<
        typeof secret
    >`,
        apis: [
            "Redacted.value",
            "Redacted.isRedacted",
            "Redacted.Redacted.Value",
        ],
        notice: "Wrapping is not access control or encryption. The underlying value remains stored and recoverable until the wrapper is wiped or becomes unreachable.",
    },

    Compare: {
        eyebrow: "comparison without repeated unwrapping at call sites",
        title: "Lift an approved equivalence relation into Redacted values",
        description:
            "makeEquivalence turns an Equivalence for the underlying type into one for Redacted wrappers. Redacted also participates in Effect equality and hashing using its stored value, so equal underlying values compare equal even when labels differ.",
        code: `const byToken =
    Redacted.makeEquivalence(
        (
            left: string,
            right: string
        ) =>
            left.toLowerCase() ===
            right.toLowerCase()
    )

byToken(
    Redacted.make("TOKEN-42"),
    Redacted.make("token-42")
)
// true`,
        apis: [
            "Redacted.makeEquivalence",
            "Equivalence.Equivalence",
            "Equal.equals",
        ],
        notice: "This is an equality convenience, not a promise of constant-time or cryptographic comparison. Use a security-specific primitive when timing behavior matters.",
    },

    Wipe: {
        eyebrow: "registry deletion with deliberately unsafe semantics",
        title: "Remove this wrapper's stored value—and know exactly what remains",
        description:
            "wipeUnsafe deletes the wrapper's entry from the internal redacted registry. The first successful deletion returns true; later deletions return false. The wrapper still has Redacted identity and printable metadata, while Redacted.value can no longer recover its value.",
        code: `const source = {
    token: "sk_demo_42ZX"
}
const secret =
    Redacted.make(
        source,
        { label: "ephemeral-token" }
    )

Redacted.wipeUnsafe(secret)
// true

Redacted.isRedacted(secret)
// true

Redacted.value(secret)
// throws

source.token
// still exists`,
        apis: ["Redacted.wipeUnsafe", "Redacted.value", "Redacted.isRedacted"],
        notice: "wipeUnsafe does not zero memory and cannot erase other references to the original value. It only removes this wrapper's registry entry.",
    },
}

// -----------------------------------------------------------------------------
// VISUAL SNAPSHOTS
// -----------------------------------------------------------------------------

export type Snapshot = Readonly<{
    input: string
    check: string
    output: string
    context: string
    traversal: string
    guidance: string
}>

export const wrap_snapshot = (model: Model): Snapshot => {
    switch (model.wrapCase) {
        case "Plain":
            return {
                input: 'Redacted.make("sk_demo_42ZX")',
                check: "wrapper stored in the redacted registry",
                output: 'String(secret) → "<redacted>"',
                context:
                    "Redacted.value(secret) can still recover the raw string",
                traversal: "toJSON and inspection use the redacted placeholder",
                guidance:
                    "Wrap a sensitive value near the boundary where it enters application code.",
            }

        case "Label":
            return {
                input: 'Redacted.make(secret, { label: "api-key" })',
                check: "label becomes public wrapper metadata",
                output: 'String(secret) → "<redacted:api-key>"',
                context: "the stored sensitive value is unchanged",
                traversal: "label is also included in value-after-wipe errors",
                guidance:
                    "Use a category label, never an identifier or secret-bearing value.",
            }

        case "Guard":
            return {
                input: "value: unknown",
                check: "Redacted.isRedacted(value) → boolean type guard",
                output: "true narrows to Redacted<unknown>",
                context: "no underlying value is revealed by the guard",
                traversal: "the check tests Redacted wrapper identity",
                guidance:
                    "Guard untrusted or mixed input before calling Redacted.value.",
            }

        case "JSON":
            return {
                input: "JSON.stringify(labelledSecret)",
                check: "Redacted.toJSON delegates to its placeholder string",
                output: '"<redacted:api-key>" as the JSON string value',
                context: "the raw value remains stored behind the wrapper",
                traversal:
                    "normal serialization of the wrapper does not reveal it",
                guidance:
                    "Do not deliberately unwrap a secret into a serializable payload.",
            }
    }
}

export const reveal_snapshot = (model: Model): Snapshot => {
    switch (model.revealCase) {
        case "Trusted":
            return {
                input: "Redacted.value(labelledSecret)",
                check: "registry entry is present",
                output: '"sk_demo_42ZX"',
                context: "the original string type is preserved",
                traversal:
                    "this call intentionally crosses the redaction boundary",
                guidance:
                    "Reveal only at the API, crypto, or protocol boundary that requires raw data.",
            }

        case "Unknown":
            return {
                input: "value: unknown",
                check: "isRedacted(value) before value(value)",
                output: "safe narrowing before explicit recovery",
                context: "the guard itself does not read the stored payload",
                traversal: "failed guards leave ordinary values untouched",
                guidance:
                    "Keep unknown-input validation separate from secret recovery.",
            }

        case "Type":
            return {
                input: "Redacted.Redacted.Value<typeof secret>",
                check: "type-level extraction only",
                output: "string",
                context: "no runtime lookup or reveal occurs",
                traversal:
                    "useful for APIs derived from an existing Redacted type",
                guidance:
                    "Prefer the extracted type when wrapper and raw value types must stay coupled.",
            }

        case "Boundary":
            return {
                input: "Foldkit Model / Message boundary",
                check: "does this UI state truly need the raw secret?",
                output: "usually keep only safe UI state or an opaque identifier",
                context:
                    "secret-bearing wrappers belong at a runtime/service boundary",
                traversal:
                    "pure model snapshots remain serializable and inspectable",
                guidance:
                    "Do not use Redacted as permission to place credentials in client-visible state.",
            }
    }
}

export const compare_snapshot = (model: Model): Snapshot => {
    switch (model.compareCase) {
        case "Same":
            return {
                input: 'make("token-42") ↔ make("token-42")',
                check: "strict lifted equivalence compares stored strings",
                output: "true",
                context: "call site does not explicitly invoke Redacted.value",
                traversal: "both wrappers must still have registry entries",
                guidance:
                    "Lift the domain equivalence once, then reuse it at comparison sites.",
            }

        case "Different":
            return {
                input: 'make("token-42") ↔ make("token-43")',
                check: "strict lifted equivalence",
                output: "false",
                context:
                    "labels do not participate in the supplied equivalence",
                traversal: "comparison observes the underlying values",
                guidance:
                    "Choose an equivalence that matches the semantics of the sensitive type.",
            }

        case "Custom":
            return {
                input: 'make("TOKEN-42") ↔ make("token-42")',
                check: "case-insensitive string equivalence",
                output: "true",
                context:
                    "makeEquivalence centralizes the unwrap-and-compare step",
                traversal:
                    "the underlying comparison is exactly the rule you supply",
                guidance:
                    "Use custom equivalence only when that normalization is valid for the domain.",
            }

        case "BuiltIn":
            return {
                input: 'make("same", { label: "a" }) ↔ make("same", { label: "b" })',
                check: "Equal.equals uses Redacted's Equal implementation",
                output: "true",
                context: "stored values are equal even though labels differ",
                traversal: "hashing likewise derives from the stored value",
                guidance:
                    "Treat labels as presentation metadata, not part of secret identity.",
            }
    }
}

export const wipe_snapshot = (model: Model): Snapshot => {
    switch (model.wipeCase) {
        case "First":
            return {
                input: "Redacted.wipeUnsafe(secret)",
                check: "registry entry exists and is deleted",
                output: "true",
                context:
                    'later value(secret) throws "Unable to get redacted value…"',
                traversal: "the wrapper object itself remains reachable",
                guidance:
                    "Use the boolean when cleanup code needs to know whether deletion happened.",
            }

        case "Second":
            return {
                input: "Redacted.wipeUnsafe(secret) again",
                check: "registry entry is already absent",
                output: "false",
                context: "value(secret) still fails",
                traversal:
                    "WeakMap deletion is idempotent at the wrapper boundary",
                guidance:
                    "Do not interpret false as evidence that the original bytes disappeared from memory.",
            }

        case "Identity":
            return {
                input: "wiped Redacted wrapper",
                check: "Redacted.isRedacted(secret) → true",
                output: 'String(secret) → "<redacted:ephemeral-token>"',
                context:
                    "TypeId and label live on the wrapper, not in the value registry",
                traversal:
                    "identity survives even though recovery no longer works",
                guidance:
                    "A wiped wrapper is still a Redacted value; only its stored payload is gone.",
            }

        case "Alias":
            return {
                input: "source object + Redacted wrapper both reference the same value",
                check: "wipeUnsafe removes only the wrapper's registry association",
                output: 'source.token → "sk_demo_42ZX"',
                context: "other references remain untouched",
                traversal: "no memory zeroing or recursive clearing occurs",
                guidance:
                    "Design secret lifetimes at the ownership boundary; wiping one wrapper cannot revoke aliases.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedRedactedStage: {
        stage: Stage,
    },
    SelectedRedactedWrapCase: {
        wrapCase: WrapCase,
    },
    SelectedRedactedRevealCase: {
        revealCase: RevealCase,
    },
    SelectedRedactedCompareCase: {
        compareCase: CompareCase,
    },
    SelectedRedactedWipeCase: {
        wipeCase: WipeCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Wrap",
    wrapCase: "Label",
    revealCase: "Trusted",
    compareCase: "Same",
    wipeCase: "First",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type WrapCasePayload = Readonly<{
    wrapCase: WrapCase
}>

type RevealCasePayload = Readonly<{
    revealCase: RevealCase
}>

type CompareCasePayload = Readonly<{
    compareCase: CompareCase
}>

type WipeCasePayload = Readonly<{
    wipeCase: WipeCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedRedactedStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedRedactedWrapCase: ({ wrapCase }: WrapCasePayload) => ({
            model: modifyFields(model, {
                wrapCase: () => wrapCase,
            }),
        }),

        SelectedRedactedRevealCase: ({ revealCase }: RevealCasePayload) => ({
            model: modifyFields(model, {
                revealCase: () => revealCase,
            }),
        }),

        SelectedRedactedCompareCase: ({ compareCase }: CompareCasePayload) => ({
            model: modifyFields(model, {
                compareCase: () => compareCase,
            }),
        }),

        SelectedRedactedWipeCase: ({ wipeCase }: WipeCasePayload) => ({
            model: modifyFields(model, {
                wipeCase: () => wipeCase,
            }),
        }),
    })

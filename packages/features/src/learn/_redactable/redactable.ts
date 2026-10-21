import { Context, Effect, Formatter, Redactable, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL REDACTABLE PROGRAMS
// -----------------------------------------------------------------------------

export const RedactionMode = S.Union([
    S.Literal("Mask"),
    S.Literal("Fingerprint"),
    S.Literal("Audit"),
])
export type RedactionMode = typeof RedactionMode.Type

export const RedactionPolicy = Context.Reference<RedactionMode>(
    "urm/learn/Redactable/RedactionPolicy",
    {
        defaultValue: () => "Mask",
    }
)

export class ApiToken implements Redactable.Redactable {
    constructor(readonly raw: string) {}

    [Redactable.symbolRedactable](context: Context.Context<never>): unknown {
        const mode = Context.get(context, RedactionPolicy)

        const lastFour = this.raw.slice(-4)

        if (mode === "Fingerprint") {
            return `token_••••_${lastFour}`
        }

        if (mode === "Audit") {
            return {
                _tag: "ApiToken",
                lastFour,
            } as const
        }

        return "[REDACTED]"
    }
}

export const sample_token = new ApiToken("sk_live_demo_9K2F")

export const redact_unknown = (value: unknown): unknown =>
    Redactable.redact(value)

export const redact_known = (value: Redactable.Redactable): unknown =>
    Redactable.getRedacted(value)

export const contextual_redaction_program = (mode: RedactionMode) =>
    Effect.sync(() => Redactable.redact(sample_token)).pipe(
        Effect.provideService(RedactionPolicy, mode)
    )

export const nested_example = {
    requestId: "req-42",
    token: sample_token,
} as const

export const direct_nested_result = Redactable.redact(nested_example)

export const formatted_nested_result = Formatter.formatJson(nested_example)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Protocol"),
    S.Literal("Dispatch"),
    S.Literal("Context"),
    S.Literal("Boundaries"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Protocol",
    "Dispatch",
    "Context",
    "Boundaries",
]

export const ProtocolCase = S.Union([
    S.Literal("Class"),
    S.Literal("Object"),
    S.Literal("Symbol"),
])
export type ProtocolCase = typeof ProtocolCase.Type

export const protocol_cases: ReadonlyArray<ProtocolCase> = [
    "Class",
    "Object",
    "Symbol",
]

export const DispatchCase = S.Union([
    S.Literal("Redactable"),
    S.Literal("Plain"),
    S.Literal("Known"),
])
export type DispatchCase = typeof DispatchCase.Type

export const dispatch_cases: ReadonlyArray<DispatchCase> = [
    "Redactable",
    "Plain",
    "Known",
]

export const ContextCase = S.Union([
    S.Literal("Empty"),
    S.Literal("Mask"),
    S.Literal("Fingerprint"),
    S.Literal("Audit"),
])
export type ContextCase = typeof ContextCase.Type

export const context_cases: ReadonlyArray<ContextCase> = [
    "Empty",
    "Mask",
    "Fingerprint",
    "Audit",
]

export const BoundaryCase = S.Union([
    S.Literal("Nested"),
    S.Literal("Formatter"),
    S.Literal("Errors"),
    S.Literal("Security"),
])
export type BoundaryCase = typeof BoundaryCase.Type

export const boundary_cases: ReadonlyArray<BoundaryCase> = [
    "Nested",
    "Formatter",
    "Errors",
    "Security",
]

export const Model = S.Struct({
    stage: Stage,
    protocolCase: ProtocolCase,
    dispatchCase: DispatchCase,
    contextCase: ContextCase,
    boundaryCase: BoundaryCase,
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
        eyebrow: "a symbol-keyed presentation protocol",
        title: "Teach sensitive values how to represent themselves safely",
        description:
            "Implement Redactable by adding a method at symbolRedactable. The method receives the current Effect Context and returns any replacement value suitable for logs, traces, or formatted output.",
        code: `class ApiToken
    implements Redactable.Redactable
{
    constructor(
        readonly raw: string
    ) {}

    [Redactable.symbolRedactable](
        context:
            Context.Context<never>
    ) {
        const policy =
            Context.get(
                context,
                RedactionPolicy
            )

        return policy === "Audit"
            ? { lastFour: this.raw.slice(-4) }
            : "[REDACTED]"
    }
}`,
        apis: ["Redactable.Redactable", "Redactable.symbolRedactable"],
        notice: 'The symbol is registered with Symbol.for("~effect/Redactable"), so the protocol identity survives multiple Effect copies in the same JavaScript realm.',
    },

    Dispatch: {
        eyebrow: "guard · general entry point · known-value entry point",
        title: "Choose redact for unknown input and getRedacted after narrowing",
        description:
            "isRedactable is the type guard. redact checks the protocol and passes ordinary values through unchanged. getRedacted skips the guard and directly invokes a value already typed as Redactable.",
        code: `const value: unknown =
    new ApiToken(
        "sk_live_demo_9K2F"
    )

if (
    Redactable.isRedactable(
        value
    )
) {
    Redactable.getRedacted(
        value
    )
}

Redactable.redact(value)
// safe general-purpose dispatch

Redactable.redact("public")
// "public" · unchanged`,
        apis: [
            "Redactable.isRedactable",
            "Redactable.redact",
            "Redactable.getRedacted",
        ],
        notice: "getRedacted is a lower-level typed convenience, not a second redaction strategy. For unknown values, redact is the safer default.",
    },

    Context: {
        eyebrow: "the current fiber supplies presentation policy",
        title: "Produce different safe representations from the active Context",
        description:
            "getRedacted reads the current fiber Context and passes it to the protocol method. Outside an Effect fiber it passes an empty Context. A Context.Reference gives that empty context a safe default while allowing fiber-local overrides.",
        code: `const RedactionPolicy =
    Context.Reference<Mode>(
        "RedactionPolicy",
        {
            defaultValue:
                () => "Mask"
        }
    )

const auditPreview =
    Effect.sync(
        () =>
            Redactable.redact(
                token
            )
    ).pipe(
        Effect.provideService(
            RedactionPolicy,
            "Audit"
        )
    )`,
        apis: [
            "Redactable.getRedacted",
            "Context.Context",
            "Context.Reference",
            "Effect.provideService",
        ],
        notice: "Keep every policy safe. Context-aware redaction should choose between sanitized representations, not become an accidental switch that exposes raw secrets in logs.",
    },

    Boundaries: {
        eyebrow: "presentation safety has explicit limits",
        title: "Know what the protocol does not sanitize automatically",
        description:
            "Redactable.redact operates on the value passed to it and is not recursive. Effect Formatter traverses structures and invokes the protocol for nested values, but plain JSON.stringify and storage APIs do not automatically do so.",
        code: `const request = {
    requestId: "req-42",
    token:
        new ApiToken(
            "sk_live_demo_9K2F"
        )
}

Redactable.redact(request)
// same outer object
// nested token is untouched

Formatter.formatJson(request)
// nested token is redacted

JSON.stringify(request)
// protocol is not automatic here`,
        apis: ["Redactable.redact", "Formatter.format", "Formatter.formatJson"],
        notice: "Redaction is not encryption, access control, deletion, or safe persistence. The raw value still exists in memory and must stay out of serializable Foldkit Models, analytics payloads, and storage boundaries.",
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

export const protocol_snapshot = (model: Model): Snapshot => {
    switch (model.protocolCase) {
        case "Class":
            return {
                input: 'new ApiToken("sk_live_demo_9K2F")',
                check: "implements Redactable.Redactable",
                output: "[symbolRedactable](context) → replacement",
                context: "method can read Context services",
                traversal: "the raw field remains private application data",
                guidance:
                    "Use a class when the sensitive value has domain behavior and invariants.",
            }

        case "Object":
            return {
                input: "{ value, [symbolRedactable](context) { ... } }",
                check: "structural protocol · no base class",
                output: "any string, object, primitive, or safe summary",
                context: "same Context contract as a class implementation",
                traversal:
                    "ordinary object members still exist on the source value",
                guidance:
                    "Use an object implementation for small adapters or boundary wrappers.",
            }

        case "Symbol":
            return {
                input: 'Symbol.for("~effect/Redactable")',
                check: "presence of the globally registered property key",
                output: "recognized across compatible Effect copies",
                context: "the symbol method receives Context.Context<never>",
                traversal:
                    "symbol identity is global; implementation behavior is yours",
                guidance:
                    "Import symbolRedactable rather than spelling the registry key yourself.",
            }
    }
}

export const dispatch_snapshot = (model: Model): Snapshot => {
    switch (model.dispatchCase) {
        case "Redactable":
            return {
                input: "Redactable.redact(apiToken)",
                check: "isRedactable(apiToken) → true",
                output: 'delegate to getRedacted → "[REDACTED]"',
                context: "current fiber Context or empty Context",
                traversal: "only this value is dispatched",
                guidance:
                    "Use redact at generic logging and diagnostic boundaries.",
            }

        case "Plain":
            return {
                input: 'Redactable.redact("public")',
                check: 'isRedactable("public") → false',
                output: '"public" · same value returned unchanged',
                context: "no Context lookup occurs",
                traversal: "no wrapping, cloning, or formatting",
                guidance:
                    "Pass-through behavior makes redact convenient for unknown mixed values.",
            }

        case "Known":
            return {
                input: "Redactable.getRedacted(knownRedactable)",
                check: "compile-time input is already Redactable",
                output: "direct symbol method result",
                context: "current fiber Context or empty fallback",
                traversal: "no runtime guard before method invocation",
                guidance:
                    "Narrow with isRedactable before using getRedacted on unknown data.",
            }
    }
}

export const context_snapshot = (model: Model): Snapshot => {
    switch (model.contextCase) {
        case "Empty":
            return {
                input: "redact called outside an active Effect fiber",
                check: "getRedacted supplies an empty Context",
                output: 'RedactionPolicy default → "[REDACTED]"',
                context: "Context.Reference safely resolves its default",
                traversal: "the protocol remains synchronous",
                guidance:
                    "Always make the no-fiber / empty-context behavior safe by default.",
            }

        case "Mask":
            return {
                input: "Effect context: RedactionPolicy = Mask",
                check: "Context.get(context, RedactionPolicy)",
                output: '"[REDACTED]"',
                context: "explicit override matches the safe default",
                traversal: "raw token never enters the replacement",
                guidance: "Mask is suitable for broad operational logs.",
            }

        case "Fingerprint":
            return {
                input: "Effect context: RedactionPolicy = Fingerprint",
                check: "protocol derives only a non-secret suffix",
                output: '"token_••••_9K2F"',
                context: "fiber-local policy changes presentation only",
                traversal: "safe correlation without exposing the full token",
                guidance:
                    "Use a deliberately limited fingerprint for debugging correlation.",
            }

        case "Audit":
            return {
                input: "Effect context: RedactionPolicy = Audit",
                check: "protocol returns structured safe metadata",
                output: '{ _tag: "ApiToken", lastFour: "9K2F" }',
                context: "the output type is unknown by design",
                traversal:
                    "Formatter can continue traversing the replacement object",
                guidance:
                    "Structured redaction is useful when log processors need stable fields.",
            }
    }
}

export const boundary_snapshot = (model: Model): Snapshot => {
    switch (model.boundaryCase) {
        case "Nested":
            return {
                input: "Redactable.redact({ token: apiToken })",
                check: "outer object is not Redactable",
                output: "same outer object · nested token untouched",
                context: "nested protocol method is never called",
                traversal: "redact is intentionally non-recursive",
                guidance:
                    "Redact at each sensitive value or use a traversing Formatter boundary.",
            }

        case "Formatter":
            return {
                input: "Formatter.formatJson({ token: apiToken })",
                check: "JSON replacer visits the nested value",
                output: '{"token":"[REDACTED]"}',
                context: "nested getRedacted sees the current fiber Context",
                traversal:
                    "Formatter.format and formatJson recurse through structures",
                guidance:
                    "Use Effect Formatter for redaction-aware diagnostics and JSON output.",
            }

        case "Errors":
            return {
                input: "symbol method throws",
                check: "redact / getRedacted do not catch implementation defects",
                output: "exception propagates to the caller",
                context: "a malformed policy lookup can also fail",
                traversal:
                    "formatting may therefore fail at the redaction boundary",
                guidance:
                    "Keep redaction methods total, synchronous, small, and side-effect free.",
            }

        case "Security":
            return {
                input: "ApiToken still contains raw",
                check: "protocol changes representation, not possession",
                output: "safe only where a redaction-aware consumer invokes it",
                context: "policy must never default to disclosure",
                traversal:
                    "plain JSON.stringify, storage, and network code need separate handling",
                guidance:
                    "Do not store secret-bearing objects in the serializable Foldkit Model.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedRedactableStage: {
        stage: Stage,
    },
    SelectedRedactableProtocolCase: {
        protocolCase: ProtocolCase,
    },
    SelectedRedactableDispatchCase: {
        dispatchCase: DispatchCase,
    },
    SelectedRedactableContextCase: {
        contextCase: ContextCase,
    },
    SelectedRedactableBoundaryCase: {
        boundaryCase: BoundaryCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Protocol",
    protocolCase: "Class",
    dispatchCase: "Redactable",
    contextCase: "Empty",
    boundaryCase: "Nested",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type ProtocolCasePayload = Readonly<{
    protocolCase: ProtocolCase
}>

type DispatchCasePayload = Readonly<{
    dispatchCase: DispatchCase
}>

type ContextCasePayload = Readonly<{
    contextCase: ContextCase
}>

type BoundaryCasePayload = Readonly<{
    boundaryCase: BoundaryCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedRedactableStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedRedactableProtocolCase: ({
            protocolCase,
        }: ProtocolCasePayload) => ({
            model: evo(model, {
                protocolCase: () => protocolCase,
            }),
        }),

        SelectedRedactableDispatchCase: ({
            dispatchCase,
        }: DispatchCasePayload) => ({
            model: evo(model, {
                dispatchCase: () => dispatchCase,
            }),
        }),

        SelectedRedactableContextCase: ({
            contextCase,
        }: ContextCasePayload) => ({
            model: evo(model, {
                contextCase: () => contextCase,
            }),
        }),

        SelectedRedactableBoundaryCase: ({
            boundaryCase,
        }: BoundaryCasePayload) => ({
            model: evo(model, {
                boundaryCase: () => boundaryCase,
            }),
        }),
    })

import { Effect, PlatformError, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL PLATFORM ERROR VALUES
// -----------------------------------------------------------------------------

export const bad_reason = new PlatformError.BadArgument({
    module: "Path",
    method: "fromFileUrl",
    description: "URL must use the file scheme",
})

export const system_reason = new PlatformError.SystemError({
    _tag: "NotFound",
    module: "FileSystem",
    method: "readFileString",
    pathOrDescriptor: "/tmp/missing.txt",
    syscall: "open",
    description: "No such file or directory",
})

export const bad_error = PlatformError.badArgument({
    module: "Crypto",
    method: "randomBytes",
    description: "size must be a non-negative safe integer",
})

export const system_error = PlatformError.systemError({
    _tag: "PermissionDenied",
    module: "FileSystem",
    method: "writeFile",
    pathOrDescriptor: "/etc/app.conf",
    syscall: "open",
    description: "permission denied",
    cause: new Error("EACCES"),
})

export const system_tags: ReadonlyArray<PlatformError.SystemErrorTag> = [
    "AlreadyExists",
    "BadResource",
    "Busy",
    "InvalidData",
    "NotFound",
    "PermissionDenied",
    "TimedOut",
    "UnexpectedEof",
    "Unknown",
    "WouldBlock",
    "WriteZero",
]

export const reason_label = (
    reason: PlatformError.BadArgument | PlatformError.SystemError
): string =>
    reason instanceof PlatformError.BadArgument ? "BadArgument" : reason._tag

export const failing_program: Effect.Effect<
    never,
    PlatformError.PlatformError
> = Effect.fail(system_error)

export const recovered_program: Effect.Effect<string> = failing_program.pipe(
    Effect.catch((error: PlatformError.PlatformError) =>
        Effect.succeed(`recovered:${reason_label(error.reason)}`)
    )
)

export const materialized_program = Effect.result(failing_program)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Reason"),
    S.Literal("Wrap"),
    S.Literal("Message"),
    S.Literal("Effect"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Reason",
    "Wrap",
    "Message",
    "Effect",
]

export const ReasonCase = S.Union([
    S.Literal("BadArgument"),
    S.Literal("SystemError"),
    S.Literal("Tags"),
])
export type ReasonCase = typeof ReasonCase.Type

export const WrapCase = S.Union([
    S.Literal("BadArgument"),
    S.Literal("SystemError"),
    S.Literal("Shape"),
])
export type WrapCase = typeof WrapCase.Type

export const MessageCase = S.Union([
    S.Literal("BadArgument"),
    S.Literal("SystemError"),
    S.Literal("Details"),
])
export type MessageCase = typeof MessageCase.Type

export const EffectCase = S.Union([
    S.Literal("Fail"),
    S.Literal("Recover"),
    S.Literal("Inspect"),
])
export type EffectCase = typeof EffectCase.Type

export const Model = S.Struct({
    stage: Stage,
    reasonCase: ReasonCase,
    wrapCase: WrapCase,
    messageCase: MessageCase,
    effectCase: EffectCase,
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
    Reason: {
        eyebrow: "normalized reason data",
        title: "Separate rejected caller input from host / operating-system failures",
        description:
            "BadArgument represents input rejected before a platform operation can proceed. SystemError represents a normalized host failure and carries one of eleven stable tags such as NotFound, PermissionDenied, TimedOut, or Unknown.",
        code: `const bad =
    new PlatformError
        .BadArgument({
            module:
                "Path",
            method:
                "fromFileUrl",
            description:
                "URL must use file:"
        })

const system =
    new PlatformError
        .SystemError({
            _tag:
                "NotFound",
            module:
                "FileSystem",
            method:
                "readFileString",
            pathOrDescriptor:
                "/tmp/missing.txt"
        })`,
        apis: [
            "PlatformError.BadArgument",
            "PlatformError.SystemError",
            "PlatformError.SystemErrorTag",
        ],
        notice: 'BadArgument has the fixed _tag "BadArgument". SystemError uses its normalized reason as _tag, so the inner reason itself can be narrowed by tags such as NotFound or PermissionDenied.',
    },

    Wrap: {
        eyebrow: "one error channel shape",
        title: "Wrap either reason inside PlatformError so platform APIs expose one shared typed failure",
        description:
            'PlatformError is tagged "PlatformError" and stores the underlying BadArgument or SystemError in its reason field. badArgument and systemError are the normal constructors used throughout current platform code.',
        code: `const invalid =
    PlatformError
        .badArgument({
            module:
                "Crypto",
            method:
                "randomBytes",
            description:
                "invalid size"
        })

invalid._tag
// "PlatformError"

invalid.reason._tag
// "BadArgument"

const missing =
    PlatformError
        .systemError({
            _tag:
                "NotFound",
            module:
                "FileSystem",
            method:
                "readFile"
        })

missing.reason._tag
// "NotFound"`,
        apis: [
            "PlatformError.PlatformError",
            "PlatformError.badArgument",
            "PlatformError.systemError",
        ],
        notice: "This is the key v4 shape: PlatformError is a wrapper class. The stable outer tag is PlatformError; reason carries the specific BadArgument or SystemError category.",
    },

    Message: {
        eyebrow: "operation context stays readable",
        title: "Messages combine normalized reason, module, method, path/descriptor, and optional description",
        description:
            "BadArgument formats module.method plus the description. SystemError prefixes the normalized tag and can include pathOrDescriptor before the description. The PlatformError wrapper forwards its message directly from reason.",
        code: `new PlatformError
    .BadArgument({
        module:
            "Path",
        method:
            "fromFileUrl",
        description:
            "URL must use file:"
    })
    .message
// "Path.fromFileUrl: URL must use file:"

PlatformError.systemError({
    _tag:
        "NotFound",
    module:
        "FileSystem",
    method:
        "readFileString",
    pathOrDescriptor:
        "/tmp/a.txt",
    description:
        "missing"
})
    .message
// "NotFound: FileSystem.readFileString (/tmp/a.txt): missing"`,
        apis: [
            "PlatformError.BadArgument.message",
            "PlatformError.SystemError.message",
            "PlatformError.PlatformError.message",
        ],
        notice: "SystemError keeps syscall, pathOrDescriptor, description, and original cause as structured fields; the human-readable message uses the normalized tag plus operation/path context.",
    },

    Effect: {
        eyebrow: "expected platform failures",
        title: "Put PlatformError in the Effect error channel, then recover at the appropriate boundary",
        description:
            "Current Effect platform services use PlatformError as a typed expected failure. Programs can fail with the wrapper, inspect reason for the normalized cause, materialize the failure as Result, or recover with standard error-channel combinators.",
        code: `const failing:
    Effect.Effect<
        never,
        PlatformError
            .PlatformError
    > =
    Effect.fail(
        PlatformError
            .systemError({
                _tag:
                    "PermissionDenied",
                module:
                    "FileSystem",
                method:
                    "writeFile"
            })
    )

const recovered =
    failing.pipe(
        Effect.catch(
            (
                error
            ) =>
                Effect.succeed(
                    error
                        .reason
                        ._tag
                )
        )
    )`,
        apis: [
            "Effect.fail",
            "Effect.catch",
            "Effect.result",
            "PlatformError.PlatformError",
        ],
        notice: "PlatformError is an expected failure type, not a defect. Handle it through Effect's typed error channel; reserve defect handling for bugs / broken invariants rather than normal platform failures.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type ReasonSnapshot = Readonly<{
    mode: ReasonCase
    badTag: string
    badModule: string
    badMethod: string
    systemTag: string
    systemPath: string
    tagCount: number
    tags: string
}>

export const reason_snapshot = (model: Model): ReasonSnapshot => ({
    mode: model.reasonCase,
    badTag: bad_reason._tag,
    badModule: bad_reason.module,
    badMethod: bad_reason.method,
    systemTag: system_reason._tag,
    systemPath: String(system_reason.pathOrDescriptor),
    tagCount: system_tags.length,
    tags: system_tags.join(" · "),
})

export type WrapSnapshot = Readonly<{
    mode: WrapCase
    outerBad: string
    innerBad: string
    outerSystem: string
    innerSystem: string
    reasonModel: string
    messageForwarded: boolean
}>

export const wrap_snapshot = (model: Model): WrapSnapshot => ({
    mode: model.wrapCase,
    outerBad: bad_error._tag,
    innerBad: bad_error.reason._tag,
    outerSystem: system_error._tag,
    innerSystem: system_error.reason._tag,
    reasonModel: "reason: BadArgument | SystemError",
    messageForwarded: system_error.message === system_error.reason.message,
})

export type MessageSnapshot = Readonly<{
    mode: MessageCase
    badReason: string
    systemReason: string
    wrappedBad: string
    wrappedSystem: string
    syscall: string
    path: string
}>

export const message_snapshot = (model: Model): MessageSnapshot => ({
    mode: model.messageCase,
    badReason: bad_reason.message,
    systemReason: system_reason.message,
    wrappedBad: bad_error.message,
    wrappedSystem: system_error.message,
    syscall:
        system_error.reason instanceof PlatformError.SystemError
            ? (system_error.reason.syscall ?? "undefined")
            : "n/a",
    path:
        system_error.reason instanceof PlatformError.SystemError
            ? String(system_error.reason.pathOrDescriptor)
            : "n/a",
})

export type EffectSnapshot = Readonly<{
    mode: EffectCase
    errorChannel: string
    outerTag: string
    reasonTag: string
    recovery: string
    inspect: string
    realUses: string
}>

export const effect_snapshot = (model: Model): EffectSnapshot => ({
    mode: model.effectCase,
    errorChannel: "Effect<never, PlatformError.PlatformError>",
    outerTag: system_error._tag,
    reasonTag: system_error.reason._tag,
    recovery: 'Effect.catch → "recovered:PermissionDenied"',
    inspect: "Effect.result → Result<never, PlatformError>",
    realUses:
        "Path · Crypto · FileSystem · child process · browser/node platform adapters",
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedPlatformErrorStage: {
        stage: Stage,
    },
    SelectedPlatformErrorReasonCase: {
        reasonCase: ReasonCase,
    },
    SelectedPlatformErrorWrapCase: {
        wrapCase: WrapCase,
    },
    SelectedPlatformErrorMessageCase: {
        messageCase: MessageCase,
    },
    SelectedPlatformErrorEffectCase: {
        effectCase: EffectCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Reason",
    reasonCase: "BadArgument",
    wrapCase: "Shape",
    messageCase: "Details",
    effectCase: "Fail",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type ReasonCasePayload = Readonly<{
    reasonCase: ReasonCase
}>

type WrapCasePayload = Readonly<{
    wrapCase: WrapCase
}>

type MessageCasePayload = Readonly<{
    messageCase: MessageCase
}>

type EffectCasePayload = Readonly<{
    effectCase: EffectCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedPlatformErrorStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedPlatformErrorReasonCase: ({
            reasonCase,
        }: ReasonCasePayload) => ({
            model: modifyFields(model, {
                reasonCase: () => reasonCase,
            }),
        }),

        SelectedPlatformErrorWrapCase: ({ wrapCase }: WrapCasePayload) => ({
            model: modifyFields(model, {
                wrapCase: () => wrapCase,
            }),
        }),

        SelectedPlatformErrorMessageCase: ({
            messageCase,
        }: MessageCasePayload) => ({
            model: modifyFields(model, {
                messageCase: () => messageCase,
            }),
        }),

        SelectedPlatformErrorEffectCase: ({
            effectCase,
        }: EffectCasePayload) => ({
            model: modifyFields(model, {
                effectCase: () => effectCase,
            }),
        }),
    })

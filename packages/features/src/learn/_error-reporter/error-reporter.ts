import { Cause, Effect, ErrorReporter, LogLevel, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REPORTABLE DOMAIN ERRORS
// -----------------------------------------------------------------------------

export class CheckoutWarning extends Error {
    readonly [ErrorReporter.severity] = "Warn" as const

    constructor(readonly requestId: string) {
        super("checkout is taking longer than expected")
    }

    get [ErrorReporter.attributes](): Readonly<Record<string, unknown>> {
        return {
            requestId: this.requestId,
            route: "/checkout",
        }
    }
}

export class ExpectedNotFound extends Error {
    readonly [ErrorReporter.ignore] = true

    constructor(readonly resource: string) {
        super(`${resource} was not found`)
    }
}

// -----------------------------------------------------------------------------
// CAPTURE HELPERS
// -----------------------------------------------------------------------------

export type CapturedReport = Readonly<{
    message: string
    severity: LogLevel.Severity
    attributes: Readonly<Record<string, unknown>>
    timestamp: string
}>

type ReporterCallbackInput = Readonly<{
    error: Error
    severity: LogLevel.Severity
    attributes: Readonly<Record<string, unknown>>
    timestamp: bigint
}>

const make_capture_reporter = (
    reports: Array<CapturedReport>
): ErrorReporter.ErrorReporter =>
    ErrorReporter.make((options: ReporterCallbackInput) => {
        reports.push({
            message: options.error.message,
            severity: options.severity,
            attributes: options.attributes,
            timestamp: options.timestamp.toString(),
        })
    })

const run_reported_failure = (
    error: Error,
    reports: Array<CapturedReport>
): void => {
    const reporter = make_capture_reporter(reports)

    const program = Effect.fail(error).pipe(
        Effect.withErrorReporting,
        Effect.exit,
        Effect.provide(ErrorReporter.layer([reporter]))
    )

    Effect.runSync(program)
}

const attributes_to_string = (
    attributes: Readonly<Record<string, unknown>>
): string => {
    const entries = Object.entries(attributes)

    if (entries.length === 0) {
        return "{}"
    }

    return entries.map(([key, value]) => `${key}=${String(value)}`).join(", ")
}

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Capture"),
    S.Literal("Annotations"),
    S.Literal("Layers"),
    S.Literal("Dedupe"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Capture",
    "Annotations",
    "Layers",
    "Dedupe",
]

export const CaptureCase = S.Union([
    S.Literal("Failure"),
    S.Literal("Defect"),
    S.Literal("Manual"),
])
export type CaptureCase = typeof CaptureCase.Type

export const AnnotationCase = S.Union([
    S.Literal("Default"),
    S.Literal("Annotated"),
    S.Literal("Ignored"),
])
export type AnnotationCase = typeof AnnotationCase.Type

export const LayerCase = S.Union([S.Literal("Replace"), S.Literal("Merge")])
export type LayerCase = typeof LayerCase.Type

export const DedupeCase = S.Union([
    S.Literal("SameCause"),
    S.Literal("SameError"),
    S.Literal("DistinctErrors"),
    S.Literal("Interrupt"),
])
export type DedupeCase = typeof DedupeCase.Type

export const Model = S.Struct({
    stage: Stage,
    captureCase: CaptureCase,
    annotationCase: AnnotationCase,
    layerCase: LayerCase,
    dedupeCase: DedupeCase,
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
    Capture: {
        eyebrow: "failure observability",
        title: "Report failures without changing the Effect result",
        description:
            "ErrorReporter forwards failures to external code while the original Effect still fails, defects, or returns normally. withErrorReporting and report are the two explicit reporting entry points.",
        code: `const reports: Array<string> = []

const reporter =
    ErrorReporter.make(({ error }) => {
        reports.push(error.message)
    })

const program =
    Effect.fail(new Error("boom")).pipe(
        Effect.withErrorReporting,
        Effect.provide(
            ErrorReporter.layer([reporter])
        ),
        Effect.exit
    )

Effect.runSync(program)

// reports -> ["boom"]`,
        apis: [
            "ErrorReporter.make",
            "ErrorReporter.report",
            "ErrorReporter.ErrorReporter",
            "Effect.withErrorReporting",
        ],
        notice: "Reporting is observational: ErrorReporter.report itself succeeds with void, and withErrorReporting preserves the source Effect's success/failure behavior.",
    },

    Annotations: {
        eyebrow: "per-error metadata",
        title: "Errors can control ignore, severity, and attributes",
        description:
            "Object errors can carry three annotation keys. Reporters resolve them before callback delivery, so expected errors can be suppressed and important failures can carry severity plus domain metadata.",
        code: `class CheckoutWarning extends Error {
    readonly [ErrorReporter.severity] =
        "Warn" as const

    get [ErrorReporter.attributes]() {
        return {
            requestId: this.requestId,
            route: "/checkout"
        }
    }
}

class ExpectedNotFound extends Error {
    readonly [ErrorReporter.ignore] = true
}`,
        apis: [
            "ErrorReporter.ignore",
            "ErrorReporter.isIgnored",
            "ErrorReporter.severity",
            "ErrorReporter.getSeverity",
            "ErrorReporter.attributes",
            "ErrorReporter.getAttributes",
            "ErrorReporter.Reportable",
        ],
        notice: "getSeverity falls back to Info when no valid annotation exists. getAttributes returns the stored record as-is; it does not validate or clone it.",
    },

    Layers: {
        eyebrow: "reporter environment",
        title: "Layers install a set of active reporters",
        description:
            "CurrentErrorReporters is a Context.Reference with an empty-set default. layer resolves reporter values or reporter Effects, replacing the current set unless mergeWithExisting is enabled.",
        code: `const base =
    ErrorReporter.layer([
        reporterA
    ])

const next =
    ErrorReporter.layer(
        [reporterB],
        {
            mergeWithExisting: true
        }
    )

// replace mode -> B
// merge mode   -> A + B`,
        apis: ["ErrorReporter.layer", "ErrorReporter.CurrentErrorReporters"],
        notice: "The default layer behavior is replacement, not append. mergeWithExisting reads the current fiber's reporter reference and adds the new reporters beside it.",
    },

    Dedupe: {
        eyebrow: "built-in filtering",
        title: "One reporter suppresses duplicate objects and interruptions",
        description:
            "Reporters created with make track Cause objects and object errors in a WeakSet. Re-reporting the same Cause or wrapping the same Error object in a new Cause does not produce a second callback.",
        code: `const error =
    new Error("boom")

const cause =
    Cause.fail(error)

yield* ErrorReporter.report(cause)
yield* ErrorReporter.report(cause)
// one callback

yield* ErrorReporter.report(
    Cause.fail(error)
)
// still one callback`,
        apis: [
            "ErrorReporter.make",
            "ErrorReporter.report",
            "Cause.fail",
            "Effect.interrupt",
        ],
        notice: "Deduplication is identity-based for object errors. Two different Error objects with the same message are still two reports. Pure interruption reasons are skipped.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS: CAPTURE
// -----------------------------------------------------------------------------

export type CaptureSnapshot = Readonly<{
    source: string
    reportCount: number
    message: string
    severity: string
    attributes: string
    effectOutcome: string
}>

export const capture_snapshot = (model: Model): CaptureSnapshot => {
    const reports: Array<CapturedReport> = []

    if (model.captureCase === "Defect") {
        const reporter = make_capture_reporter(reports)

        const program = Effect.die(new Error("invariant broke")).pipe(
            Effect.withErrorReporting,
            Effect.exit,
            Effect.provide(ErrorReporter.layer([reporter]))
        )

        Effect.runSync(program)

        const report = reports[0]

        return {
            source: "Effect.die(Error)",
            reportCount: reports.length,
            message: report?.message ?? "—",
            severity: report?.severity ?? "—",
            attributes:
                report === undefined
                    ? "—"
                    : attributes_to_string(report.attributes),
            effectOutcome: "Failure Exit with defect",
        }
    }

    if (model.captureCase === "Manual") {
        const reporter = make_capture_reporter(reports)

        const cause = Cause.fail(new Error("manual report"))

        const program = ErrorReporter.report(cause).pipe(
            Effect.provide(ErrorReporter.layer([reporter]))
        )

        Effect.runSync(program)

        const report = reports[0]

        return {
            source: "ErrorReporter.report(Cause)",
            reportCount: reports.length,
            message: report?.message ?? "—",
            severity: report?.severity ?? "—",
            attributes:
                report === undefined
                    ? "—"
                    : attributes_to_string(report.attributes),
            effectOutcome: "Success<void>",
        }
    }

    run_reported_failure(new Error("boom"), reports)

    const report = reports[0]

    return {
        source: "Effect.fail(Error)",
        reportCount: reports.length,
        message: report?.message ?? "—",
        severity: report?.severity ?? "—",
        attributes:
            report === undefined
                ? "—"
                : attributes_to_string(report.attributes),
        effectOutcome: "Failure Exit with typed error",
    }
}

// -----------------------------------------------------------------------------
// SNAPSHOTS: ANNOTATIONS
// -----------------------------------------------------------------------------

export type AnnotationSnapshot = Readonly<{
    name: string
    ignored: boolean
    severity: string
    attributes: string
    reportCount: number
    callbackMessage: string
}>

export const annotation_snapshot = (model: Model): AnnotationSnapshot => {
    const reports: Array<CapturedReport> = []

    if (model.annotationCase === "Ignored") {
        const error = new ExpectedNotFound("/users/42")

        run_reported_failure(error, reports)

        return {
            name: "ExpectedNotFound",
            ignored: ErrorReporter.isIgnored(error),
            severity: ErrorReporter.getSeverity(error),
            attributes: attributes_to_string(
                ErrorReporter.getAttributes(error)
            ),
            reportCount: reports.length,
            callbackMessage: reports[0]?.message ?? "suppressed",
        }
    }

    if (model.annotationCase === "Annotated") {
        const error = new CheckoutWarning("req-42")

        run_reported_failure(error, reports)

        return {
            name: "CheckoutWarning",
            ignored: ErrorReporter.isIgnored(error),
            severity: ErrorReporter.getSeverity(error),
            attributes: attributes_to_string(
                ErrorReporter.getAttributes(error)
            ),
            reportCount: reports.length,
            callbackMessage: reports[0]?.message ?? "—",
        }
    }

    const error = new Error("plain failure")

    run_reported_failure(error, reports)

    return {
        name: "Error",
        ignored: ErrorReporter.isIgnored(error),
        severity: ErrorReporter.getSeverity(error),
        attributes: attributes_to_string(ErrorReporter.getAttributes(error)),
        reportCount: reports.length,
        callbackMessage: reports[0]?.message ?? "—",
    }
}

// -----------------------------------------------------------------------------
// SNAPSHOTS: LAYERS
// -----------------------------------------------------------------------------

const make_named_reporter = (
    name: string,
    calls: Array<string>
): ErrorReporter.ErrorReporter =>
    ErrorReporter.make((options: ReporterCallbackInput) => {
        calls.push(`${name}:${options.error.message}`)
    })

export type LayerSnapshot = Readonly<{
    mode: string
    baseReporter: string
    incomingReporter: string
    calls: string
    callCount: number
    expectedSet: string
    defaultReference: string
}>

export const layer_snapshot = (model: Model): LayerSnapshot => {
    const calls: Array<string> = []

    const reporterA = make_named_reporter("A", calls)

    const reporterB = make_named_reporter("B", calls)

    const source = Effect.fail(new Error("boom")).pipe(
        Effect.withErrorReporting,
        Effect.exit
    )

    const incomingLayer = ErrorReporter.layer([reporterB], {
        mergeWithExisting: model.layerCase === "Merge",
    })

    const program = source.pipe(
        Effect.provide(incomingLayer),
        Effect.provide(ErrorReporter.layer([reporterA]))
    )

    Effect.runSync(program)

    return {
        mode:
            model.layerCase === "Merge"
                ? "mergeWithExisting: true"
                : "default replacement",
        baseReporter: "A",
        incomingReporter: "B",
        calls: calls.length === 0 ? "none" : calls.join(" · "),
        callCount: calls.length,
        expectedSet: model.layerCase === "Merge" ? "{ A, B }" : "{ B }",
        defaultReference: "CurrentErrorReporters defaults to empty Set",
    }
}

// -----------------------------------------------------------------------------
// SNAPSHOTS: DEDUPE
// -----------------------------------------------------------------------------

export type DedupeSnapshot = Readonly<{
    scenario: string
    reportAttempts: number
    callbacks: number
    messages: string
    reason: string
}>

export const dedupe_snapshot = (model: Model): DedupeSnapshot => {
    const reports: Array<CapturedReport> = []

    const reporter = make_capture_reporter(reports)

    const layer = ErrorReporter.layer([reporter])

    if (model.dedupeCase === "Interrupt") {
        const program = Effect.interrupt.pipe(
            Effect.withErrorReporting,
            Effect.exit,
            Effect.provide(layer)
        )

        Effect.runSync(program)

        return {
            scenario: "pure interruption",
            reportAttempts: 1,
            callbacks: reports.length,
            messages:
                reports.length === 0
                    ? "none"
                    : reports
                          .map((report: CapturedReport) => report.message)
                          .join(", "),
            reason: "Interrupt reasons are skipped",
        }
    }

    if (model.dedupeCase === "DistinctErrors") {
        const program = Effect.gen(function* () {
            yield* ErrorReporter.report(Cause.fail(new Error("boom")))

            yield* ErrorReporter.report(Cause.fail(new Error("boom")))
        }).pipe(Effect.provide(layer))

        Effect.runSync(program)

        return {
            scenario: "two Error objects, same message",
            reportAttempts: 2,
            callbacks: reports.length,
            messages: reports
                .map((report: CapturedReport) => report.message)
                .join(", "),
            reason: "dedupe tracks object identity, not message text",
        }
    }

    const error = new Error("boom")

    if (model.dedupeCase === "SameError") {
        const program = Effect.gen(function* () {
            yield* ErrorReporter.report(Cause.fail(error))

            yield* ErrorReporter.report(Cause.fail(error))
        }).pipe(Effect.provide(layer))

        Effect.runSync(program)

        return {
            scenario: "new Cause, same Error object",
            reportAttempts: 2,
            callbacks: reports.length,
            messages: reports
                .map((report: CapturedReport) => report.message)
                .join(", "),
            reason: "the Error object is stored in the reporter WeakSet",
        }
    }

    const cause = Cause.fail(error)

    const program = Effect.gen(function* () {
        yield* ErrorReporter.report(cause)

        yield* ErrorReporter.report(cause)
    }).pipe(Effect.provide(layer))

    Effect.runSync(program)

    return {
        scenario: "same Cause object twice",
        reportAttempts: 2,
        callbacks: reports.length,
        messages: reports
            .map((report: CapturedReport) => report.message)
            .join(", "),
        reason: "the Cause object itself is deduplicated first",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedErrorReporterStage: {
        stage: Stage,
    },
    SelectedErrorReporterCaptureCase: {
        captureCase: CaptureCase,
    },
    SelectedErrorReporterAnnotationCase: {
        annotationCase: AnnotationCase,
    },
    SelectedErrorReporterLayerCase: {
        layerCase: LayerCase,
    },
    SelectedErrorReporterDedupeCase: {
        dedupeCase: DedupeCase,
    },
})
export type Message = typeof Message.Type

// -----------------------------------------------------------------------------
// INIT
// -----------------------------------------------------------------------------

export const init: Model = Model.make({
    stage: "Capture",
    captureCase: "Failure",
    annotationCase: "Annotated",
    layerCase: "Replace",
    dedupeCase: "SameCause",
})

// -----------------------------------------------------------------------------
// UPDATE
// -----------------------------------------------------------------------------

type StagePayload = Readonly<{
    stage: Stage
}>

type CaptureCasePayload = Readonly<{
    captureCase: CaptureCase
}>

type AnnotationCasePayload = Readonly<{
    annotationCase: AnnotationCase
}>

type LayerCasePayload = Readonly<{
    layerCase: LayerCase
}>

type DedupeCasePayload = Readonly<{
    dedupeCase: DedupeCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedErrorReporterStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedErrorReporterCaptureCase: ({
            captureCase,
        }: CaptureCasePayload) => ({
            model: modifyFields(model, {
                captureCase: () => captureCase,
            }),
        }),

        SelectedErrorReporterAnnotationCase: ({
            annotationCase,
        }: AnnotationCasePayload) => ({
            model: modifyFields(model, {
                annotationCase: () => annotationCase,
            }),
        }),

        SelectedErrorReporterLayerCase: ({ layerCase }: LayerCasePayload) => ({
            model: modifyFields(model, {
                layerCase: () => layerCase,
            }),
        }),

        SelectedErrorReporterDedupeCase: ({
            dedupeCase,
        }: DedupeCasePayload) => ({
            model: modifyFields(model, {
                dedupeCase: () => dedupeCase,
            }),
        }),
    })

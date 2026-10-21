/**
 * # Observability Logs
 *
 * Persists Effect logs to `observability_logs`, batched on a one-second window.
 */
import { Context, Effect, Layer, Logger, References } from "effect"
import {
    DB,
    DatabaseOperationError,
    databaseOperationError,
    schema,
} from "@urm/db"
import { sanitizeAuditMetadata } from "./audit-events.ts"

export type ObservabilityLogLevel = "debug" | "info" | "warning" | "error"

export type ObservabilityLogInput = Readonly<{
    level: ObservabilityLogLevel
    message: string
    source?: string | undefined
    trace_id?: string | undefined
    span_id?: string | undefined
    contact_id?: string | undefined
    session_id?: string | undefined
    domain_id?: string | undefined
    request_id?: string | undefined
    metadata?: Record<string, unknown> | undefined
}>

export const sanitizeObservabilityMetadata = (
    metadata: Record<string, unknown>
): Record<string, unknown> => sanitizeAuditMetadata(metadata)

export type ObservabilityLogPersistenceShape = {
    readonly write: (
        input: ObservabilityLogInput
    ) => Effect.Effect<void, DatabaseOperationError>
    readonly writeMany: (
        inputs: ReadonlyArray<ObservabilityLogInput>
    ) => Effect.Effect<void, DatabaseOperationError>
}

export class ObservabilityLogPersistence extends Context.Service<
    ObservabilityLogPersistence,
    ObservabilityLogPersistenceShape
>()("@urm/auth/ObservabilityLogPersistence") {}

export const ObservabilityLogPersistenceLive = Layer.effect(
    ObservabilityLogPersistence,
    Effect.gen(function* () {
        const db = yield* DB

        const toRow = (input: ObservabilityLogInput) => ({
            level: input.level,
            message: input.message,
            source: input.source,
            trace_id: input.trace_id,
            span_id: input.span_id,
            contact_id: input.contact_id,
            session_id: input.session_id,
            domain_id: input.domain_id,
            request_id: input.request_id,
            metadata: sanitizeObservabilityMetadata(input.metadata ?? {}),
        })

        return ObservabilityLogPersistence.of({
            write: (input) =>
                db
                    .insert(schema.observability_logs)
                    .values(toRow(input))
                    .pipe(
                        Effect.asVoid,
                        Effect.mapError((cause) =>
                            databaseOperationError(
                                "ObservabilityLogPersistence.write",
                                "Failed to persist observability log",
                                cause
                            )
                        )
                    ),
            writeMany: (inputs) =>
                inputs.length === 0
                    ? Effect.void
                    : db
                          .insert(schema.observability_logs)
                          .values(inputs.map(toRow))
                          .pipe(
                              Effect.asVoid,
                              Effect.mapError((cause) =>
                                  databaseOperationError(
                                      "ObservabilityLogPersistence.writeMany",
                                      "Failed to persist observability logs",
                                      cause
                                  )
                              )
                          ),
        })
    })
)

export const recordObservabilityLog = (input: ObservabilityLogInput) =>
    Effect.gen(function* () {
        const persistence = yield* ObservabilityLogPersistence
        yield* persistence.write(input)
    }).pipe(Effect.catch(() => Effect.void))

const LEVEL_MAP: Partial<Record<string, ObservabilityLogLevel>> = {
    Fatal: "error",
    Error: "error",
    Warn: "warning",
    Info: "info",
    Debug: "debug",
    Trace: "debug",
}

const COLUMN_ANNOTATION_KEYS = [
    "source",
    "contact_id",
    "session_id",
    "domain_id",
    "request_id",
] as const

type ColumnAnnotationKey = (typeof COLUMN_ANNOTATION_KEYS)[number]

const isColumnAnnotationKey = (key: string): key is ColumnAnnotationKey =>
    COLUMN_ANNOTATION_KEYS.some((column) => column === key)

const formatMessagePart = (part: unknown): string => {
    if (typeof part === "string") {
        return part
    }
    try {
        return (
            JSON.stringify(part, (_key, value) =>
                typeof value === "bigint" ? value.toString() : value
            ) ?? String(part)
        )
    } catch {
        return String(part)
    }
}

const formatLogMessage = (message: unknown): string =>
    Array.isArray(message)
        ? message.map(formatMessagePart).join(" ")
        : formatMessagePart(message)

const toJsonSafe = (value: unknown): unknown => {
    if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return value
    }
    return formatMessagePart(value)
}

const toLogInput = (
    options: Logger.Options<unknown>
): ObservabilityLogInput | undefined => {
    const level = LEVEL_MAP[options.logLevel]
    if (level === undefined) {
        return undefined
    }

    const annotations = options.fiber.getRef(References.CurrentLogAnnotations)
    const columns: Partial<Record<ColumnAnnotationKey, string>> = {}
    const metadata: Record<string, unknown> = {
        fiber_id: options.fiber.id,
    }
    for (const [key, value] of Object.entries(annotations)) {
        if (isColumnAnnotationKey(key) && typeof value === "string") {
            columns[key] = value
        } else {
            metadata[key] = toJsonSafe(value)
        }
    }
    const span = options.fiber.currentSpan

    return {
        level,
        message: formatLogMessage(options.message),
        source: columns.source ?? "server",
        trace_id: span?.traceId,
        span_id: span?.spanId,
        contact_id: columns.contact_id,
        session_id: columns.session_id,
        domain_id: columns.domain_id,
        request_id: columns.request_id,
        metadata,
    }
}

export const ObservabilityLoggerLive = Logger.layer(
    [
        Effect.gen(function* () {
            const persistence = yield* ObservabilityLogPersistence

            // Batched because a per-log insert would put a database round trip
            // in the path of every log line. The cost is that up to a second of
            // logs sits in memory — a hard crash loses exactly the window most
            // worth having. Anything that must be durable goes to audit events.
            return yield* Logger.batched(Logger.make(toLogInput), {
                window: "1 second",
                flush: (entries) =>
                    persistence
                        .writeMany(
                            entries.filter(
                                (entry): entry is ObservabilityLogInput =>
                                    entry !== undefined
                            )
                        )
                        .pipe(Effect.ignore),
            })
        }),
    ],
    { mergeWithExisting: true }
)

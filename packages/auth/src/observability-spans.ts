/**
 * # Observability Spans
 *
 * A Tracer that writes spans to `observability_spans` instead of exporting
 * them, with age and capacity eviction.
 */
import { Context, Effect, Exit, Layer, Option, Tracer } from "effect"
import { desc, lt } from "drizzle-orm"
import {
    DB,
    DatabaseOperationError,
    databaseOperationError,
    schema,
} from "@urm/database"

export type ObservabilitySpanStatus = "started" | "ok" | "error"

export type ObservabilitySpanEventInput = Readonly<{
    name: string
    at: number
    attributes: Record<string, unknown>
}>

export type ObservabilitySpanInput = Readonly<{
    span_id: string
    trace_id: string
    parent_span_id?: string | undefined
    name: string
    kind: string
    status: ObservabilitySpanStatus
    started_at: Date
    ended_at?: Date | undefined
    duration_ms?: number | undefined
    attributes: Record<string, unknown>
    events: ReadonlyArray<ObservabilitySpanEventInput>
}>

export type ObservabilitySpanPersistenceShape = {
    readonly insert: (
        input: ObservabilitySpanInput
    ) => Effect.Effect<void, DatabaseOperationError>
    readonly upsert: (
        input: ObservabilitySpanInput
    ) => Effect.Effect<void, DatabaseOperationError>
    readonly evict: () => Effect.Effect<void, DatabaseOperationError>
}

export class ObservabilitySpanPersistence extends Context.Service<
    ObservabilitySpanPersistence,
    ObservabilitySpanPersistenceShape
>()("@urm/auth/ObservabilitySpanPersistence") {}

const RETENTION_MS = 24 * 60 * 60 * 1000
const SPAN_CAPACITY = 10_000
const EVICTION_INTERVAL = 100

const spanRow = (input: ObservabilitySpanInput) => ({
    span_id: input.span_id,
    trace_id: input.trace_id,
    parent_span_id: input.parent_span_id,
    name: input.name,
    kind: input.kind,
    status: input.status,
    started_at: input.started_at,
    ended_at: input.ended_at,
    duration_ms: input.duration_ms,
    attributes: input.attributes,
    events: [...input.events],
})

export const ObservabilitySpanPersistenceLive = Layer.effect(
    ObservabilitySpanPersistence,
    Effect.gen(function* () {
        const db = yield* DB

        return ObservabilitySpanPersistence.of({
            insert: (input) =>
                db
                    .insert(schema.observability_spans)
                    .values(spanRow(input))
                    .onConflictDoNothing()
                    .pipe(
                        Effect.asVoid,
                        Effect.mapError((cause) =>
                            databaseOperationError(
                                "ObservabilitySpanPersistence.insert",
                                "Failed to persist span",
                                cause
                            )
                        )
                    ),
            upsert: (input) => {
                const row = spanRow(input)

                return db
                    .insert(schema.observability_spans)
                    .values(row)
                    .onConflictDoUpdate({
                        target: schema.observability_spans.span_id,
                        set: {
                            status: row.status,
                            ended_at: row.ended_at,
                            duration_ms: row.duration_ms,
                            attributes: row.attributes,
                            events: row.events,
                        },
                    })
                    .pipe(
                        Effect.asVoid,
                        Effect.mapError((cause) =>
                            databaseOperationError(
                                "ObservabilitySpanPersistence.upsert",
                                "Failed to update span",
                                cause
                            )
                        )
                    )
            },
            evict: () =>
                Effect.gen(function* () {
                    const cutoff = new Date(Date.now() - RETENTION_MS)

                    yield* db
                        .delete(schema.observability_spans)
                        .where(
                            lt(schema.observability_spans.started_at, cutoff)
                        )

                    const overflow = yield* db
                        .select({
                            started_at: schema.observability_spans.started_at,
                        })
                        .from(schema.observability_spans)
                        .orderBy(desc(schema.observability_spans.started_at))
                        .limit(1)
                        .offset(SPAN_CAPACITY)

                    const boundary = overflow[0]

                    if (boundary !== undefined) {
                        yield* db
                            .delete(schema.observability_spans)
                            .where(
                                lt(
                                    schema.observability_spans.started_at,
                                    boundary.started_at
                                )
                            )
                    }
                }).pipe(
                    Effect.mapError((cause) =>
                        databaseOperationError(
                            "ObservabilitySpanPersistence.evict",
                            "Failed to evict spans",
                            cause
                        )
                    )
                ),
        })
    })
)

const HEX_CHARACTERS = "abcdef0123456789"

// Math.random, not a cryptographic source. Fine because these identify traces,
// not resources — nothing authorises on them, and insert uses
// onConflictDoNothing so a collision drops a row rather than corrupting one.
const randomHexString = (length: number): string => {
    let result = ""
    for (let i = 0; i < length; i++) {
        result += HEX_CHARACTERS.charAt(
            Math.floor(Math.random() * HEX_CHARACTERS.length)
        )
    }
    return result
}

const SANITIZE_MAX_DEPTH = 8

const sanitizeValue = (value: unknown, depth: number): unknown => {
    if (
        typeof value === "bigint" ||
        typeof value === "function" ||
        typeof value === "symbol"
    ) {
        return String(value)
    }
    // Terminates on deeply nested or cyclic attributes rather than recursing
    // forever inside the tracer.
    if (depth >= SANITIZE_MAX_DEPTH) {
        return String(value)
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item, depth + 1))
    }
    if (value !== null && typeof value === "object") {
        const out: Record<string, unknown> = {}
        for (const [key, item] of Object.entries(value)) {
            out[key] = sanitizeValue(item, depth + 1)
        }
        return out
    }
    return value
}

const sanitizeRecord = (
    record: Record<string, unknown>
): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(record)) {
        out[key] = sanitizeValue(value, 0)
    }
    return out
}

const nanosToDate = (nanos: bigint): Date =>
    new Date(Number(nanos / 1_000_000n))

const makeObservabilityTracer = (
    persistence: ObservabilitySpanPersistenceShape
): Tracer.Tracer => {
    let spans_started = 0

    // withTracerEnabled(false) is load-bearing: without it, inserting a span
    // creates a span, which inserts a row, which creates a span. Any code path
    // added here must keep it. Failures are discarded so tracing can never
    // break or slow the code it observes.
    const runWrite = (effect: Effect.Effect<void, DatabaseOperationError>) => {
        Effect.runFork(
            effect.pipe(
                Effect.catch(() => Effect.void),
                Effect.withTracerEnabled(false)
            )
        )
    }

    return Tracer.make({
        span(options) {
            const parent = options.parent
            const trace_id = Option.isSome(parent)
                ? parent.value.traceId
                : randomHexString(32)
            const span_id = randomHexString(16)
            const parent_span_id = Option.isSome(parent)
                ? parent.value.spanId
                : undefined
            const started_at = nanosToDate(options.startTime)

            const attributes = new Map<string, unknown>()
            const links = [...options.links]
            const events: Array<ObservabilitySpanEventInput> = []
            let status: Tracer.SpanStatus = {
                _tag: "Started",
                startTime: options.startTime,
            }

            const spanInput = (
                spanStatus: ObservabilitySpanStatus,
                ended?: Readonly<{ ended_at: Date; duration_ms: number }>
            ): ObservabilitySpanInput => ({
                span_id,
                trace_id,
                parent_span_id,
                name: options.name,
                kind: options.kind,
                status: spanStatus,
                started_at,
                ended_at: ended?.ended_at,
                duration_ms: ended?.duration_ms,
                attributes: sanitizeRecord(Object.fromEntries(attributes)),
                events,
            })

            // Written on start as well as on end so an in-flight or crashed
            // span is still visible. A lone "started" row means unfinished,
            // not running — nothing cleans them up if the process dies.
            if (options.sampled) {
                runWrite(persistence.insert(spanInput("started")))

                spans_started += 1
                if (spans_started % EVICTION_INTERVAL === 0) {
                    runWrite(persistence.evict())
                }
            }

            return {
                _tag: "Span",
                name: options.name,
                spanId: span_id,
                traceId: trace_id,
                parent,
                annotations: options.annotations,
                get status() {
                    return status
                },
                attributes,
                links,
                sampled: options.sampled,
                kind: options.kind,
                end(endTime, exit) {
                    status = {
                        _tag: "Ended",
                        startTime: options.startTime,
                        endTime,
                        exit,
                    }
                    if (options.sampled) {
                        runWrite(
                            persistence.upsert(
                                spanInput(
                                    Exit.isSuccess(exit) ? "ok" : "error",
                                    {
                                        ended_at: nanosToDate(endTime),
                                        duration_ms:
                                            Number(
                                                endTime - options.startTime
                                            ) / 1_000_000,
                                    }
                                )
                            )
                        )
                    }
                },
                attribute(key, value) {
                    attributes.set(key, value)
                },
                event(name, startTime, eventAttributes) {
                    events.push({
                        name,
                        at: Number(startTime / 1_000_000n),
                        attributes: sanitizeRecord(eventAttributes ?? {}),
                    })
                },
                addLinks(newLinks) {
                    links.push(...newLinks)
                },
            }
        },
    })
}

export const ObservabilityTracerLive = Layer.effect(
    Tracer.Tracer,
    Effect.gen(function* () {
        const persistence = yield* ObservabilitySpanPersistence
        return makeObservabilityTracer(persistence)
    })
)

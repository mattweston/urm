import { Duration, Effect, Metric, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL METRICS
// -----------------------------------------------------------------------------

export const request_counter = Metric.counter("learn_requests_total", {
    description: "Requests processed by the Metric demo",
})

export const queue_gauge = Metric.gauge("learn_queue_size", {
    description: "Current queue size",
})

export const status_frequency = Metric.frequency("learn_status_codes", {
    preregisteredWords: ["200", "404", "500"],
})

export const latency_histogram = Metric.histogram("learn_latency_ms", {
    boundaries: Metric.linearBoundaries({
        start: 10,
        width: 20,
        count: 5,
    }),
})

export const latency_summary = Metric.summary("learn_latency_summary", {
    maxAge: "1 minute",
    maxSize: 100,
    quantiles: [0.5, 0.9, 0.99],
})

export const request_timer = Metric.timer("learn_request_duration")

export const one_per_event = Metric.withConstantInput(request_counter, 1)

export const string_latency = Metric.mapInput(
    latency_histogram,
    (input: string): number => Number(input)
)

export const production_requests = Metric.withAttributes(request_counter, {
    environment: "production",
})

// -----------------------------------------------------------------------------
// REAL EFFECT PROGRAMS
// -----------------------------------------------------------------------------

export const record_program = Effect.gen(function* () {
    yield* Metric.update(request_counter, 2)
    yield* Metric.update(request_counter, -1)

    yield* Metric.update(queue_gauge, 7)
    yield* Metric.modify(queue_gauge, -2)

    yield* Metric.update(status_frequency, "200")
    yield* Metric.update(status_frequency, "200")
    yield* Metric.update(status_frequency, "404")

    yield* Metric.update(latency_histogram, 24)
    yield* Metric.update(latency_histogram, 81)

    yield* Metric.update(latency_summary, 25)
    yield* Metric.update(latency_summary, 60)

    yield* Metric.update(request_timer, Duration.millis(120))

    const counter = yield* Metric.value(request_counter)
    const gauge = yield* Metric.value(queue_gauge)
    const frequency = yield* Metric.value(status_frequency)
    const histogram = yield* Metric.value(latency_histogram)

    return {
        counter: counter.count,
        gauge: gauge.value,
        status200: frequency.occurrences.get("200") ?? 0,
        observations: histogram.count,
    } as const
})

export const attributed_program = Effect.gen(function* () {
    yield* Metric.update(production_requests, 1)

    yield* Effect.provideService(
        Metric.update(request_counter, 1),
        Metric.CurrentMetricAttributes,
        {
            environment: "staging",
            region: "eu-west",
        }
    )

    return yield* Metric.snapshot
})

export const runtime_metrics_probe = Effect.gen(function* () {
    const service = yield* Metric.FiberRuntimeMetrics

    return service !== undefined
}).pipe(Metric.enableRuntimeMetrics)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Types"),
    S.Literal("Record"),
    S.Literal("Attributes"),
    S.Literal("Observe"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Types",
    "Record",
    "Attributes",
    "Observe",
]

export const TypesCase = S.Union([
    S.Literal("Primitive"),
    S.Literal("States"),
    S.Literal("InputState"),
])
export type TypesCase = typeof TypesCase.Type

export const RecordCase = S.Union([
    S.Literal("Update"),
    S.Literal("Modify"),
    S.Literal("Transform"),
])
export type RecordCase = typeof RecordCase.Type

export const AttributesCase = S.Union([
    S.Literal("Metric"),
    S.Literal("Context"),
    S.Literal("Registry"),
])
export type AttributesCase = typeof AttributesCase.Type

export const ObserveCase = S.Union([
    S.Literal("Boundaries"),
    S.Literal("Snapshot"),
    S.Literal("Runtime"),
])
export type ObserveCase = typeof ObserveCase.Type

export const Model = S.Struct({
    stage: Stage,
    typesCase: TypesCase,
    recordCase: RecordCase,
    attributesCase: AttributesCase,
    observeCase: ObserveCase,
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
    Types: {
        eyebrow: "typed input → aggregated state",
        title: "Choose the primitive metric whose state matches what you need to observe",
        description:
            "Metric<Input, State> accepts typed update values and exposes aggregated state. Effect provides Counter, Gauge, Frequency, Histogram, and Summary primitives, plus timer as a Duration-input Histogram.",
        code: `const requests =
    Metric.counter(
        "requests"
    )

const queue =
    Metric.gauge(
        "queue_size"
    )

const status =
    Metric.frequency(
        "status"
    )

const latency =
    Metric.histogram(
        "latency",
        {
            boundaries:
                Metric.linearBoundaries({
                    start: 10,
                    width: 20,
                    count: 5
                })
        }
    )

const summary =
    Metric.summary(
        "response_time",
        {
            maxAge:
                "1 minute",
            maxSize:
                100,
            quantiles:
                [0.5, 0.9]
        }
    )`,
        apis: [
            "Metric.Metric",
            "Metric.Counter",
            "Metric.Gauge",
            "Metric.Frequency",
            "Metric.Histogram",
            "Metric.Summary",
            "Metric.counter",
            "Metric.gauge",
            "Metric.frequency",
            "Metric.histogram",
            "Metric.summary",
            "Metric.summaryWithTimestamp",
            "Metric.timer",
        ],
        notice: "Counter and Gauge can use number or bigint. Frequency accepts strings. Histogram accepts numbers. Summary accepts numbers, while summaryWithTimestamp accepts [value, timestamp]. timer accepts Duration and records milliseconds.",
    },

    Record: {
        eyebrow: "update, modify, read, transform",
        title: "Record values directly or adapt one Metric to accept a different input shape",
        description:
            "update and modify are Effect operations. For a Gauge, update replaces the current value while modify adds a delta; for counters both add to the count. mapInput adapts input types, and withConstantInput ignores the incoming value and records a fixed update.",
        code: `yield* Metric.update(
    queueGauge,
    7
)

yield* Metric.modify(
    queueGauge,
    -2
)
// gauge is now 5

const state =
    yield* Metric.value(
        queueGauge
    )

const fromString =
    Metric.mapInput(
        latencyHistogram,
        (
            input: string
        ) =>
            Number(input)
    )

const onePerEvent =
    Metric.withConstantInput(
        requestCounter,
        1
    )`,
        apis: [
            "Metric.update",
            "Metric.modify",
            "Metric.value",
            "Metric.mapInput",
            "Metric.withConstantInput",
            "Metric.isMetric",
        ],
        notice: "Gauge is the clearest update-vs-modify example: update sets an absolute value, while modify applies a relative delta. Histogram, Summary, Frequency, and Counter record observations / increments through either operation's metric-specific hooks.",
    },

    Attributes: {
        eyebrow: "series identity + registry",
        title: "Attributes create distinct metric series and can come from the Metric or Effect context",
        description:
            "withAttributes attaches dimensions to one Metric. CurrentMetricAttributes supplies contextual dimensions to a whole region of Effect code. Metric metadata and hooks are registered lazily in MetricRegistry when a metric is read or updated.",
        code: `const prod =
    Metric.withAttributes(
        requestCounter,
        {
            environment:
                "production"
        }
    )

yield* Metric.update(
    prod,
    1
)

yield* Effect.provideService(
    Metric.update(
        requestCounter,
        1
    ),
    Metric.CurrentMetricAttributes,
    {
        environment:
            "staging",
        region:
            "eu-west"
    }
)

const all =
    yield* Metric.snapshot`,
        apis: [
            "Metric.Attributes",
            "Metric.AttributeSet",
            "Metric.withAttributes",
            "Metric.CurrentMetricAttributesKey",
            "Metric.CurrentMetricAttributes",
            "Metric.MetricRegistry",
            "Metric.Metadata",
            "Metric.Hooks",
        ],
        notice: "Metric identity includes type, id, optional description, and attributes. Different attribute combinations therefore create different registry series even when they come from the same Metric definition.",
    },

    Observe: {
        eyebrow: "boundaries, snapshots, runtime fibers",
        title: "Build histogram buckets, inspect the whole registry, and opt into automatic fiber metrics",
        description:
            "Boundary helpers normalize histogram cutoffs and append Infinity. snapshot returns typed registry entries; dump formats them as readable text; snapshotUnsafe reads from an explicit Context. Runtime metric helpers install or remove automatic child-fiber lifecycle metrics.",
        code: `Metric.boundariesFromIterable(
    [-5, 0, 10, 10, 25]
)
// [10, 25, Infinity]

Metric.linearBoundaries({
    start: 10,
    width: 20,
    count: 5
})
// [10, 30, 50, 70, Infinity]

Metric.exponentialBoundaries({
    start: 1,
    factor: 2,
    count: 5
})
// [1, 2, 4, 8, Infinity]

const snapshots =
    yield* Metric.snapshot

const report =
    yield* Metric.dump

const withFiberMetrics =
    Metric.enableRuntimeMetrics(
        program
    )`,
        apis: [
            "Metric.boundariesFromIterable",
            "Metric.linearBoundaries",
            "Metric.exponentialBoundaries",
            "Metric.snapshot",
            "Metric.snapshotUnsafe",
            "Metric.dump",
            "Metric.FiberRuntimeMetricsKey",
            "Metric.FiberRuntimeMetricsService",
            "Metric.FiberRuntimeMetrics",
            "Metric.FiberRuntimeMetricsImpl",
            "Metric.enableRuntimeMetrics",
            "Metric.disableRuntimeMetrics",
            "Metric.enableRuntimeMetricsLayer",
            "Metric.disableRuntimeMetricsLayer",
        ],
        notice: "Runtime metrics are optional. Enabling them records child-fiber active, started, success, and failure measurements; disabling them does not disable ordinary user-defined metrics.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type TypesSnapshot = Readonly<{
    mode: TypesCase
    primitiveTypes: string
    stateShapes: string
    timer: string
    typeUnion: string
    inputState: string
}>

export const types_snapshot = (model: Model): TypesSnapshot => ({
    mode: model.typesCase,
    primitiveTypes: "Counter · Frequency · Gauge · Histogram · Summary",
    stateShapes:
        "CounterState · FrequencyState · GaugeState · HistogramState · SummaryState",
    timer: "timer: Histogram<Duration.Duration> → milliseconds",
    typeUnion:
        "Metric.Type = Counter | Frequency | Gauge | Histogram | Summary",
    inputState:
        "Metric.Input<M> extracts input · Metric.State<M> extracts aggregated state",
})

export type RecordSnapshot = Readonly<{
    mode: RecordCase
    counter: string
    gauge: string
    frequency: string
    histogram: string
    transform: string
    guard: boolean
}>

export const record_snapshot = (model: Model): RecordSnapshot => ({
    mode: model.recordCase,
    counter: "update / modify add input to count",
    gauge: "update sets absolute value · modify adds delta",
    frequency: "string input increments occurrence count",
    histogram: "numeric observation updates bucket/count/min/max/sum",
    transform:
        "mapInput changes accepted input · withConstantInput ignores caller input",
    guard: Metric.isMetric(request_counter),
})

export type AttributesSnapshot = Readonly<{
    mode: AttributesCase
    direct: string
    contextual: string
    registry: string
    series: string
    forms: string
}>

export const attributes_snapshot = (model: Model): AttributesSnapshot => ({
    mode: model.attributesCase,
    direct: 'withAttributes(metric, { environment: "production" })',
    contextual:
        "CurrentMetricAttributes merges dimensions into reads / updates in that Effect context",
    registry:
        "MetricRegistry = Map<string, Metadata<…>> with a fresh default Map",
    series: "same id + different attributes → separate metric series",
    forms: "Attributes = AttributeSet | ReadonlyArray<[string, string]>",
})

export type ObserveSnapshot = Readonly<{
    mode: ObserveCase
    normalized: string
    linear: string
    exponential: string
    snapshot: string
    dump: string
    runtime: string
}>

const boundary_text = (values: ReadonlyArray<number>): string =>
    values
        .map((value: number) =>
            value === Number.POSITIVE_INFINITY ? "∞" : String(value)
        )
        .join(" · ")

export const observe_snapshot = (model: Model): ObserveSnapshot => ({
    mode: model.observeCase,
    normalized: boundary_text(
        Metric.boundariesFromIterable([-5, 0, 10, 10, 25])
    ),
    linear: boundary_text(
        Metric.linearBoundaries({
            start: 10,
            width: 20,
            count: 5,
        })
    ),
    exponential: boundary_text(
        Metric.exponentialBoundaries({
            start: 1,
            factor: 2,
            count: 5,
        })
    ),
    snapshot: "snapshot → ReadonlyArray<Metric.Snapshot>",
    dump: "dump → human-readable registered metric table",
    runtime:
        "enableRuntimeMetrics → child_fibers_active / started / successes / failures",
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedMetricStage: {
        stage: Stage,
    },
    SelectedMetricTypesCase: {
        typesCase: TypesCase,
    },
    SelectedMetricRecordCase: {
        recordCase: RecordCase,
    },
    SelectedMetricAttributesCase: {
        attributesCase: AttributesCase,
    },
    SelectedMetricObserveCase: {
        observeCase: ObserveCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Types",
    typesCase: "Primitive",
    recordCase: "Update",
    attributesCase: "Metric",
    observeCase: "Boundaries",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type TypesCasePayload = Readonly<{
    typesCase: TypesCase
}>

type RecordCasePayload = Readonly<{
    recordCase: RecordCase
}>

type AttributesCasePayload = Readonly<{
    attributesCase: AttributesCase
}>

type ObserveCasePayload = Readonly<{
    observeCase: ObserveCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedMetricStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedMetricTypesCase: ({ typesCase }: TypesCasePayload) => ({
            model: modifyFields(model, {
                typesCase: () => typesCase,
            }),
        }),

        SelectedMetricRecordCase: ({ recordCase }: RecordCasePayload) => ({
            model: modifyFields(model, {
                recordCase: () => recordCase,
            }),
        }),

        SelectedMetricAttributesCase: ({
            attributesCase,
        }: AttributesCasePayload) => ({
            model: modifyFields(model, {
                attributesCase: () => attributesCase,
            }),
        }),

        SelectedMetricObserveCase: ({ observeCase }: ObserveCasePayload) => ({
            model: modifyFields(model, {
                observeCase: () => observeCase,
            }),
        }),
    })

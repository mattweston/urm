import { Context, Effect, Exit, Option, Schema as S, Tracer } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TRACER VALUES + PROGRAMS
// -----------------------------------------------------------------------------

export const remote_parent = Tracer.externalSpan({
    spanId: "remote-span-42",
    traceId: "remote-trace-7",
    sampled: true,
})

export const follows_from: Tracer.SpanLink = {
    span: remote_parent,
    attributes: {
        relationship: "follows-from",
        transport: "demo",
    },
}

export const native_span = new Tracer.NativeSpan({
    name: "native-demo",
    parent: Option.none(),
    annotations: Context.empty(),
    links: [],
    startTime: 1_000_000_000n,
    kind: "internal",
    sampled: true,
})

native_span.attribute("demo.user", "Ada")
native_span.event("loaded", 1_250_000_000n, { cached: true })
native_span.addLinks([follows_from])
native_span.end(1_500_000_000n, Exit.succeed("ok"))

export const captured_spans: Array<Tracer.NativeSpan> = []

export const capturing_tracer = Tracer.make({
    span(options: Parameters<Tracer.Tracer["span"]>[0]) {
        const span = new Tracer.NativeSpan(options)
        captured_spans.push(span)
        return span
    },
})

export const traced_program = Effect.succeed("profile-loaded").pipe(
    Effect.withSpan("load-profile", {
        parent: remote_parent,
        kind: "client",
        attributes: {
            "user.id": "42",
            "cache.hit": false,
        },
        links: [follows_from],
    }),
    Effect.provideService(Tracer.Tracer, capturing_tracer)
)

export const inherited_parent_program = Effect.succeed("child-result").pipe(
    Effect.withSpan("child-operation"),
    Effect.provideService(Tracer.ParentSpan, remote_parent),
    Effect.provideService(Tracer.Tracer, capturing_tracer)
)

export const root_program = Effect.succeed("root-result").pipe(
    Effect.withSpan("forced-root", { root: true }),
    Effect.provideService(Tracer.ParentSpan, remote_parent),
    Effect.provideService(Tracer.Tracer, capturing_tracer)
)

export const propagation_disabled_program = Effect.succeed("hidden-child").pipe(
    Effect.withSpan("non-propagating"),
    Effect.provideService(Tracer.DisablePropagation, true),
    Effect.provideService(Tracer.Tracer, capturing_tracer)
)

export const debug_span_program = Effect.succeed("debug-result").pipe(
    Effect.withSpan("debug-span", { level: "Debug" }),
    Effect.provideService(Tracer.MinimumTraceLevel, "Info"),
    Effect.provideService(Tracer.Tracer, capturing_tracer)
)

export const explicitly_sampled_program = Effect.succeed("forced-sampled").pipe(
    Effect.withSpan("forced-sampled", {
        level: "Debug",
        sampled: true,
    }),
    Effect.provideService(Tracer.MinimumTraceLevel, "Info"),
    Effect.provideService(Tracer.Tracer, capturing_tracer)
)

export const current_level_program = Effect.succeed("inherits-level").pipe(
    Effect.withSpan("uses-current-level"),
    Effect.provideService(Tracer.CurrentTraceLevel, "Warning"),
    Effect.provideService(Tracer.Tracer, capturing_tracer)
)

type TracerModuleWithNative = typeof Tracer & {
    readonly nativeTracer?: Tracer.Tracer
}

export const live_native_tracer = (Tracer as TracerModuleWithNative)
    .nativeTracer
export const has_live_native_tracer = live_native_tracer !== undefined

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Create"),
    S.Literal("Enrich"),
    S.Literal("Propagate"),
    S.Literal("Filter"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Create",
    "Enrich",
    "Propagate",
    "Filter",
]

export const CreateCase = S.Union([
    S.Literal("Native"),
    S.Literal("External"),
    S.Literal("Backend"),
    S.Literal("Service"),
])
export type CreateCase = typeof CreateCase.Type

export const create_cases: ReadonlyArray<CreateCase> = [
    "Native",
    "External",
    "Backend",
    "Service",
]

export const EnrichCase = S.Union([
    S.Literal("Attribute"),
    S.Literal("Event"),
    S.Literal("Link"),
    S.Literal("Status"),
])
export type EnrichCase = typeof EnrichCase.Type

export const enrich_cases: ReadonlyArray<EnrichCase> = [
    "Attribute",
    "Event",
    "Link",
    "Status",
]

export const PropagateCase = S.Union([
    S.Literal("Parent"),
    S.Literal("Root"),
    S.Literal("Disable"),
    S.Literal("AnySpan"),
])
export type PropagateCase = typeof PropagateCase.Type

export const propagate_cases: ReadonlyArray<PropagateCase> = [
    "Parent",
    "Root",
    "Disable",
    "AnySpan",
]

export const FilterCase = S.Union([
    S.Literal("Level"),
    S.Literal("Minimum"),
    S.Literal("Sampled"),
    S.Literal("NativeTracer"),
])
export type FilterCase = typeof FilterCase.Type

export const filter_cases: ReadonlyArray<FilterCase> = [
    "Level",
    "Minimum",
    "Sampled",
    "NativeTracer",
]

export const Model = S.Struct({
    stage: Stage,
    createCase: CreateCase,
    enrichCase: EnrichCase,
    propagateCase: PropagateCase,
    filterCase: FilterCase,
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
    Create: {
        eyebrow:
            "spans are created by a tracer backend or supplied from outside Effect",
        title: "Create managed spans, external parents, and custom backends",
        description:
            "NativeSpan is Effect's in-memory Span implementation. externalSpan models trace identity arriving from another tracing system, while Tracer.make builds a backend whose span method allocates the actual Span values used by Effect.withSpan.",
        code: `const parent = Tracer.externalSpan({
  spanId: "remote-span",
  traceId: "remote-trace"
})

const tracer = Tracer.make({
  span: (options) => new Tracer.NativeSpan(options)
})`,
        apis: [
            "Tracer.NativeSpan",
            "Tracer.externalSpan",
            "Tracer.make",
            "Tracer.Tracer",
        ],
        notice: "Tracer.make does not wrap or decorate the implementation; it returns the supplied Tracer value. Effect.withSpan asks the active Tracer service to allocate spans.",
    },

    Enrich: {
        eyebrow:
            "a span carries identity, lifecycle, attributes, events, and relationships",
        title: "Enrich spans while preserving one lifecycle record",
        description:
            "Span.attribute adds key/value metadata, event records a timestamped event, addLinks attaches relationships to other spans, and end moves SpanStatus from Started to Ended with the final Exit.",
        code: `span.attribute("user.id", "42")
span.event("loaded", now, { cached: true })
span.addLinks([{ span: parent, attributes: {} }])
span.end(endTime, Exit.succeed("ok"))`,
        apis: [
            "Tracer.Span",
            "Tracer.SpanStatus",
            "Tracer.SpanLink",
            "Tracer.SpanKind",
        ],
        notice: "Attributes and events are observational metadata. The completion Exit belongs to SpanStatus.Ended, so failure / interruption information can be retained by tracing backends.",
    },

    Propagate: {
        eyebrow:
            "parent selection is context-driven unless options explicitly override it",
        title: "Propagate trace identity across local and external boundaries",
        description:
            "ParentSpan carries the current managed or external parent in Context. SpanOptions can provide a parent directly or force root creation. DisablePropagation prevents trace context from being propagated through the guarded scope.",
        code: `const child = Effect.succeed("ok").pipe(
  Effect.withSpan("child"),
  Effect.provideService(Tracer.ParentSpan, remoteParent)
)

const root = Effect.withSpan(effect, "root", { root: true })`,
        apis: [
            "Tracer.ParentSpan",
            "Tracer.AnySpan",
            "Tracer.DisablePropagation",
            "Tracer.ParentSpanKey",
        ],
        notice: "AnySpan is the common parent/link type: either an Effect-managed Span or an ExternalSpan. root:true intentionally ignores inherited parentage for the new span.",
    },

    Filter: {
        eyebrow:
            "trace levels and sampling decide whether expensive tracing should be observed",
        title: "Control sampling with level references and explicit options",
        description:
            "CurrentTraceLevel supplies the default level when SpanOptions omit one. MinimumTraceLevel is the threshold used to derive sampling; an explicit sampled option bypasses that threshold. The active Tracer reference defaults to Effect's native tracer.",
        code: `const program = effect.pipe(
  Effect.withSpan("debug", { level: "Debug" }),
  Effect.provideService(Tracer.MinimumTraceLevel, "Info")
)

// rc.115+ also exports Tracer.nativeTracer`,
        apis: [
            "Tracer.CurrentTraceLevel",
            "Tracer.MinimumTraceLevel",
            "Tracer.DisablePropagation",
            "Tracer.nativeTracer (rc.115+)",
        ],
        notice: "Workspace rc.112 has the same default native behavior but no exported nativeTracer constant. rc.115 exposes that value so runtime code can detect the no-backend-installed default explicitly.",
    },
}

// -----------------------------------------------------------------------------
// VISUAL SNAPSHOTS
// -----------------------------------------------------------------------------

export type Snapshot = Readonly<{
    input: string
    operation: string
    result: string
    invariant: string
    implementation: string
    guidance: string
}>

export const create_snapshot = (model: Model): Snapshot => {
    switch (model.createCase) {
        case "Native":
            return {
                input: "span options",
                operation: "new Tracer.NativeSpan(options)",
                result: "Span with Started status",
                invariant: "NativeSpan is an in-memory implementation of Span",
                implementation: "ids + metadata + lifecycle state",
                guidance:
                    "Use NativeSpan for the default backend, tests, and simple custom tracers.",
            }
        case "External":
            return {
                input: "traceId + spanId from another system",
                operation: "Tracer.externalSpan(options)",
                result: "ExternalSpan",
                invariant:
                    "external spans carry identity but are not ended by Effect",
                implementation:
                    "sampled defaults true; annotations default empty",
                guidance:
                    "Use externalSpan to continue or link to an incoming distributed trace.",
            }
        case "Backend":
            return {
                input: "{ span(options) => Span }",
                operation: "Tracer.make(implementation)",
                result: "Tracer backend",
                invariant: "make returns the supplied implementation unchanged",
                implementation:
                    "backend decides how spans are allocated/exported",
                guidance:
                    "Custom tracing integrations implement span and optionally tracer-specific context evaluation.",
            }
        case "Service":
            return {
                input: "Effect.withSpan(...)",
                operation: "active Tracer.Tracer reference",
                result: "backend span allocation",
                invariant: "the tracer is resolved from Context",
                implementation: "Context.Reference<Tracer>",
                guidance:
                    "Provide Tracer.Tracer to install a backend for a scope without changing application code.",
            }
    }
}

export const enrich_snapshot = (model: Model): Snapshot => {
    switch (model.enrichCase) {
        case "Attribute":
            return {
                input: 'span + ("user.id", "42")',
                operation: "span.attribute(key, value)",
                result: "attribute map updated",
                invariant: "attribute values are unknown by design",
                implementation: "ReadonlyMap<string, unknown> surface",
                guidance:
                    "Prefer stable semantic attribute keys that tracing backends can index consistently.",
            }
        case "Event":
            return {
                input: "name + bigint time + attributes",
                operation: "span.event(...) ",
                result: "timestamped span event",
                invariant: "events belong to the span lifecycle",
                implementation: "NativeSpan stores event tuples",
                guidance:
                    "Use events for notable moments inside one operation rather than creating tiny spans for every detail.",
            }
        case "Link":
            return {
                input: "AnySpan + relationship attributes",
                operation: "span.addLinks([link])",
                result: "non-parent relationship",
                invariant: "links do not change parentage",
                implementation: "SpanLink { span, attributes }",
                guidance:
                    "Use links for fan-in, follows-from, queues, and other relationships that are not strict parent-child.",
            }
        case "Status":
            return {
                input: "endTime + Exit",
                operation: "span.end(endTime, exit)",
                result: "SpanStatus.Ended",
                invariant: "Started becomes Ended exactly at completion",
                implementation: "status keeps startTime, endTime, and Exit",
                guidance:
                    "Backends can derive success/failure details from the final Exit instead of a separate boolean flag.",
            }
    }
}

export const propagate_snapshot = (model: Model): Snapshot => {
    switch (model.propagateCase) {
        case "Parent":
            return {
                input: "ParentSpan in Context",
                operation: "Effect.withSpan(child)",
                result: "child span inherits trace relationship",
                invariant: "parent may be Span or ExternalSpan",
                implementation: "Context.Service<ParentSpan, AnySpan>",
                guidance:
                    "Provide ParentSpan at process / request boundaries when continuing a distributed trace.",
            }
        case "Root":
            return {
                input: "inherited parent + { root: true }",
                operation: "create span",
                result: "new root span",
                invariant: "root explicitly overrides inherited parentage",
                implementation: "SpanOptionsNoTrace.root",
                guidance:
                    "Force root only when starting an intentionally independent trace tree.",
            }
        case "Disable":
            return {
                input: "Tracer.DisablePropagation = true",
                operation: "create nested span",
                result: "non-propagating tracing scope",
                invariant: "disabled propagation is carried through Context",
                implementation: "Context.Reference<boolean>",
                guidance:
                    "Use this for boundaries where trace context must not escape or where instrumentation should become non-propagating.",
            }
        case "AnySpan":
            return {
                input: "Span | ExternalSpan",
                operation: "use as parent or link target",
                result: "uniform trace identity",
                invariant:
                    "both expose spanId / traceId / sampled / annotations",
                implementation: "type AnySpan = Span | ExternalSpan",
                guidance:
                    "Code that only needs trace identity can accept AnySpan and stay agnostic to span ownership.",
            }
    }
}

export const filter_snapshot = (model: Model): Snapshot => {
    switch (model.filterCase) {
        case "Level":
            return {
                input: "SpanOptions without level",
                operation: "read CurrentTraceLevel",
                result: "effective span level",
                invariant: "default CurrentTraceLevel is Info",
                implementation: "Context.Reference<LogLevel>",
                guidance:
                    "Set a scoped current level when many spans should share the same instrumentation level.",
            }
        case "Minimum":
            return {
                input: "effective level + MinimumTraceLevel",
                operation: "derive sampled decision",
                result: "sampled true / false",
                invariant: "default minimum is All",
                implementation: "threshold reference controls default sampling",
                guidance:
                    "Raise the threshold to reduce exported tracing work without deleting instrumentation code.",
            }
        case "Sampled":
            return {
                input: "SpanOptions.sampled explicitly set",
                operation: "span creation",
                result: "explicit sampling decision",
                invariant: "explicit sampled bypasses threshold computation",
                implementation: "sampled?: boolean",
                guidance:
                    "Use explicit sampling sparingly when one operation must override the scoped level policy.",
            }
        case "NativeTracer":
            return {
                input: "Tracer.Tracer default",
                operation: "native tracer",
                result: "NativeSpan instances, no exporter",
                invariant: "nativeTracer export exists only in rc.115+",
                implementation: "rc.112 builds equivalent default inline",
                guidance:
                    "Use the optional bridge only for version-aware diagnostics; application tracing should depend on Tracer.Tracer.",
            }
    }
}

export const initial_model: Model = {
    stage: "Create",
    createCase: "Native",
    enrichCase: "Attribute",
    propagateCase: "Parent",
    filterCase: "Level",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTracerStage: { stage: Stage },
    SelectedTracerCreateCase: { createCase: CreateCase },
    SelectedTracerEnrichCase: { enrichCase: EnrichCase },
    SelectedTracerPropagateCase: { propagateCase: PropagateCase },
    SelectedTracerFilterCase: { filterCase: FilterCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type CreateCasePayload = Readonly<{ createCase: CreateCase }>
type EnrichCasePayload = Readonly<{ enrichCase: EnrichCase }>
type PropagateCasePayload = Readonly<{ propagateCase: PropagateCase }>
type FilterCasePayload = Readonly<{ filterCase: FilterCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTracerStage: ({ stage }: StagePayload) => ({
            model: evo(model, { stage: () => stage }),
        }),
        SelectedTracerCreateCase: ({ createCase }: CreateCasePayload) => ({
            model: evo(model, { createCase: () => createCase }),
        }),
        SelectedTracerEnrichCase: ({ enrichCase }: EnrichCasePayload) => ({
            model: evo(model, { enrichCase: () => enrichCase }),
        }),
        SelectedTracerPropagateCase: ({
            propagateCase,
        }: PropagateCasePayload) => ({
            model: evo(model, { propagateCase: () => propagateCase }),
        }),
        SelectedTracerFilterCase: ({ filterCase }: FilterCasePayload) => ({
            model: evo(model, { filterCase: () => filterCase }),
        }),
    })

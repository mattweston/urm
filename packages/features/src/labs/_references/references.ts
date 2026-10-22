import { Effect, References, Scheduler, Schema as S, Tracer } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL REFERENCES PROGRAMS
// -----------------------------------------------------------------------------

export const defaults_program = Effect.gen(function* () {
    const logLevel = yield* References.CurrentLogLevel
    const minimumLogLevel = yield* References.MinimumLogLevel
    const annotations = yield* References.CurrentLogAnnotations
    const logSpans = yield* References.CurrentLogSpans
    const tracerEnabled = yield* References.TracerEnabled
    const tracerTimingEnabled = yield* References.TracerTimingEnabled
    const currentTraceLevel = yield* References.CurrentTraceLevel
    const minimumTraceLevel = yield* References.MinimumTraceLevel
    const maxOpsBeforeYield = yield* References.MaxOpsBeforeYield
    const preventSchedulerYield = yield* References.PreventSchedulerYield
    const logToStderr = yield* References.LogToStderr
    const unhandledLogLevel = yield* References.UnhandledLogLevel
    const scheduler = yield* References.Scheduler

    return {
        logLevel,
        minimumLogLevel,
        annotationCount: Object.keys(annotations).length,
        logSpanCount: logSpans.length,
        tracerEnabled,
        tracerTimingEnabled,
        currentTraceLevel,
        minimumTraceLevel,
        maxOpsBeforeYield,
        preventSchedulerYield,
        logToStderr,
        unhandledLogLevel,
        schedulerMode: scheduler.executionMode,
    } as const
})

export const scoped_logging_program = Effect.gen(function* () {
    const level = yield* References.CurrentLogLevel
    const minimum = yield* References.MinimumLogLevel
    const annotations = yield* References.CurrentLogAnnotations
    const spans = yield* References.CurrentLogSpans

    return {
        level,
        minimum,
        requestId: annotations.requestId,
        spanLabels: spans.map(([label]: readonly [string, number]) => label),
    } as const
}).pipe(
    Effect.provideService(References.CurrentLogLevel, "Error"),
    Effect.provideService(References.MinimumLogLevel, "Warn"),
    Effect.provideService(References.CurrentLogAnnotations, {
        requestId: "req-42",
        feature: "references-demo",
    }),
    Effect.provideService(References.CurrentLogSpans, [
        ["load-account", 1_000],
        ["render-summary", 1_250],
    ])
)

const linked_span = Tracer.externalSpan({
    spanId: "external-span-42",
    traceId: "trace-99",
})

export const scoped_tracing_program = Effect.gen(function* () {
    const enabled = yield* References.TracerEnabled
    const timing = yield* References.TracerTimingEnabled
    const currentLevel = yield* References.CurrentTraceLevel
    const minimumLevel = yield* References.MinimumTraceLevel
    const propagationDisabled = yield* References.DisablePropagation
    const annotations = yield* References.TracerSpanAnnotations
    const links = yield* References.TracerSpanLinks

    return {
        enabled,
        timing,
        currentLevel,
        minimumLevel,
        propagationDisabled,
        service: annotations.service,
        linkCount: links.length,
    } as const
}).pipe(
    Effect.provideService(References.TracerEnabled, false),
    Effect.provideService(References.TracerTimingEnabled, false),
    Effect.provideService(References.CurrentTraceLevel, "Debug"),
    Effect.provideService(References.MinimumTraceLevel, "Warn"),
    Effect.provideService(References.DisablePropagation, true),
    Effect.provideService(References.TracerSpanAnnotations, {
        service: "billing",
        environment: "demo",
    }),
    Effect.provideService(References.TracerSpanLinks, [
        {
            span: linked_span,
            attributes: {
                relationship: "follows-from",
            },
        },
    ])
)

export const sync_scheduler = new Scheduler.MixedScheduler("sync")

export const scoped_scheduler_program = Effect.gen(function* () {
    const scheduler = yield* References.Scheduler
    const budget = yield* References.MaxOpsBeforeYield
    const preventYield = yield* References.PreventSchedulerYield

    return {
        mode: scheduler.executionMode,
        budget,
        preventYield,
    } as const
}).pipe(
    Effect.provideService(References.Scheduler, sync_scheduler),
    Effect.provideService(References.MaxOpsBeforeYield, 64),
    Effect.provideService(References.PreventSchedulerYield, true)
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Read"),
    S.Literal("Logging"),
    S.Literal("Tracing"),
    S.Literal("Scheduler"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Read",
    "Logging",
    "Tracing",
    "Scheduler",
]

export const ReadCase = S.Union([
    S.Literal("Default"),
    S.Literal("Override"),
    S.Literal("Scope"),
    S.Literal("Boundary"),
])
export type ReadCase = typeof ReadCase.Type

export const read_cases: ReadonlyArray<ReadCase> = [
    "Default",
    "Override",
    "Scope",
    "Boundary",
]

export const LoggingCase = S.Union([
    S.Literal("Levels"),
    S.Literal("Annotations"),
    S.Literal("Spans"),
    S.Literal("Outputs"),
])
export type LoggingCase = typeof LoggingCase.Type

export const logging_cases: ReadonlyArray<LoggingCase> = [
    "Levels",
    "Annotations",
    "Spans",
    "Outputs",
]

export const TracingCase = S.Union([
    S.Literal("Enablement"),
    S.Literal("Levels"),
    S.Literal("Metadata"),
    S.Literal("Internals"),
])
export type TracingCase = typeof TracingCase.Type

export const tracing_cases: ReadonlyArray<TracingCase> = [
    "Enablement",
    "Levels",
    "Metadata",
    "Internals",
]

export const SchedulerCase = S.Union([
    S.Literal("Default"),
    S.Literal("Budget"),
    S.Literal("Prevent"),
    S.Literal("Custom"),
])
export type SchedulerCase = typeof SchedulerCase.Type

export const scheduler_cases: ReadonlyArray<SchedulerCase> = [
    "Default",
    "Budget",
    "Prevent",
    "Custom",
]

export const Model = S.Struct({
    stage: Stage,
    readCase: ReadCase,
    loggingCase: LoggingCase,
    tracingCase: TracingCase,
    schedulerCase: SchedulerCase,
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
    Read: {
        eyebrow:
            "built-in Context.Reference values with defaults and dynamic scope",
        title: "Read runtime settings exactly like other Effect services",
        description:
            "Every exported setting is a Context.Reference with a default. Yielding a reference reads the current fiber context. Effect.provideService installs a scoped replacement, so nested work—and fibers started inside that scope—observe the configured value without changing a global singleton.",
        code: `const program =
    Effect.gen(function* () {
        const level =
            yield* References
                .CurrentLogLevel

        return level
    }).pipe(
        Effect.provideService(
            References.CurrentLogLevel,
            "Error"
        )
    )

// result: "Error"`,
        apis: [
            "Context.Reference",
            "Effect.provideService",
            "References.CurrentLogLevel",
        ],
        notice: "References are runtime configuration, not application domain state. Prefer the higher-level logging, tracing, and scheduling combinators when they express your intent; reach for References when you deliberately need the underlying dynamic setting.",
    },

    Logging: {
        eyebrow:
            "severity · filtering · metadata · destinations · unhandled reports",
        title: "Tune the logging context without threading options manually",
        description:
            "Logging references control the default severity, minimum threshold, shared annotations and log spans, active logger set, console stderr routing, and the severity used for unhandled pool-finalizer reports. Their values travel with the Effect context.",
        code: `const scoped =
    Effect.gen(function* () {
        return {
            level:
                yield* References
                    .CurrentLogLevel,
            meta:
                yield* References
                    .CurrentLogAnnotations,
        }
    }).pipe(
        Effect.provideService(
            References.CurrentLogLevel,
            "Error"
        ),
        Effect.provideService(
            References.CurrentLogAnnotations,
            { requestId: "req-42" }
        )
    )`,
        apis: [
            "CurrentLogLevel",
            "MinimumLogLevel",
            "CurrentLogAnnotations",
            "CurrentLogSpans",
            "CurrentLoggers",
            "LogToStderr",
            "UnhandledLogLevel",
        ],
        notice: "CurrentLogLevel chooses the severity for an unqualified Effect.log; MinimumLogLevel decides what is filtered. UnhandledLogLevel is independent and may be undefined to suppress that specific report—it does not fall back to CurrentLogLevel.",
    },

    Tracing: {
        eyebrow:
            "registration · timing · sampling levels · metadata · propagation",
        title: "Separate whether spans exist, what they carry, and whether they propagate",
        description:
            "Tracing references expose independent controls for span registration and timing, default and minimum trace levels, shared annotations and links, propagation, the active tracer, and the low-level captured stack-frame chain used by Effect diagnostics.",
        code: `const scoped =
    Effect.gen(function* () {
        return {
            enabled:
                yield* References
                    .TracerEnabled,
            level:
                yield* References
                    .CurrentTraceLevel,
            minimum:
                yield* References
                    .MinimumTraceLevel,
        }
    }).pipe(
        Effect.provideService(
            References.TracerEnabled,
            false
        ),
        Effect.provideService(
            References.CurrentTraceLevel,
            "Debug"
        )
    )`,
        apis: [
            "TracerEnabled",
            "TracerTimingEnabled",
            "CurrentTraceLevel",
            "MinimumTraceLevel",
            "TracerSpanAnnotations",
            "TracerSpanLinks",
            "DisablePropagation",
            "Tracer",
            "CurrentStackFrame",
            "StackFrame",
        ],
        notice: "TracerEnabled disables span registration; DisablePropagation is a different control that blocks propagation while still allowing local tracing behavior. CurrentStackFrame and StackFrame are low-level diagnostic plumbing and normally should be left to Effect tracing APIs.",
    },

    Scheduler: {
        eyebrow:
            "runtime scheduler service · operation budget · cooperative yielding",
        title: "Tune fairness carefully—or replace the scheduler deliberately",
        description:
            "References re-exports the scheduler service plus its two yield controls. MaxOpsBeforeYield adjusts the operation budget before the default scheduler asks a fiber to yield. PreventSchedulerYield bypasses those checks entirely. Scheduler replaces the dispatch implementation.",
        code: `const scoped =
    Effect.gen(function* () {
        return {
            scheduler:
                yield* References.Scheduler,
            budget:
                yield* References
                    .MaxOpsBeforeYield,
            prevent:
                yield* References
                    .PreventSchedulerYield,
        }
    }).pipe(
        Effect.provideService(
            References.MaxOpsBeforeYield,
            64
        )
    )`,
        apis: [
            "Scheduler",
            "Scheduler interface",
            "MaxOpsBeforeYield",
            "PreventSchedulerYield",
        ],
        notice: "The default operation budget is 2048 and PreventSchedulerYield defaults to false. Setting the latter to true can let a long-running fiber monopolize the JavaScript thread, so treat it as a specialized runtime knob rather than a performance shortcut.",
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

export const read_snapshot = (model: Model): Snapshot => {
    switch (model.readCase) {
        case "Default":
            return {
                input: "yield* References.CurrentLogLevel",
                operation: "read Reference from current fiber Context",
                result: '"Info" when nothing overrides it',
                invariant: "every built-in reference owns a default value",
                implementation:
                    "Context.Reference behaves as a yieldable service key",
                guidance:
                    "Read the reference directly when you intentionally need the runtime setting itself.",
            }

        case "Override":
            return {
                input: 'CurrentLogLevel default "Info"',
                operation: 'provideService(CurrentLogLevel, "Error")',
                result: 'nested reads observe "Error"',
                invariant: "the override is scoped to the provided Effect",
                implementation:
                    "the surrounding Context is extended, not globally mutated",
                guidance:
                    "Use scoped overrides for tests and bounded runtime policy changes.",
            }

        case "Scope":
            return {
                input: "Effect starts nested work / child fibers",
                operation: "runtime carries the current Context",
                result: "reference values flow with that execution scope",
                invariant:
                    "configuration follows Effect context rather than call parameters",
                implementation:
                    "fiber-local context supplies Reference values dynamically",
                guidance:
                    "This is why references are useful for cross-cutting runtime policy such as logging and tracing.",
            }

        case "Boundary":
            return {
                input: "Foldkit Model / update",
                operation: "runtime owns References configuration",
                result: "plain UI model + contextual runtime policy",
                invariant:
                    "do not mirror runtime references into serializable view state without a domain reason",
                implementation:
                    "configure references in handlers, services, layers, or entry/runtime integration",
                guidance:
                    "Keep Foldkit state explicit and pure; References belongs to the Effect runtime side of the boundary.",
            }
    }
}

export const logging_snapshot = (model: Model): Snapshot => {
    switch (model.loggingCase) {
        case "Levels":
            return {
                input: 'CurrentLogLevel = "Error" · MinimumLogLevel = "Warn"',
                operation: "emit unqualified and explicit logs",
                result: "default severity changes; messages below Warn are filtered",
                invariant:
                    "default severity and filtering threshold are separate controls",
                implementation:
                    'both defaults are "Info" in the vendored Effect source',
                guidance:
                    "Change CurrentLogLevel to label unqualified logs; change MinimumLogLevel to change what gets through.",
            }

        case "Annotations":
            return {
                input: '{ requestId: "req-42", feature: "references-demo" }',
                operation: "provide CurrentLogAnnotations",
                result: "shared metadata is attached to logs in the scope",
                invariant: "the default annotation record is empty",
                implementation:
                    "ReadonlyRecord<string, unknown> travels in Context",
                guidance:
                    "Use annotations for contextual metadata rather than manually appending identifiers to every message.",
            }

        case "Spans":
            return {
                input: '[["load-account", 1000], ["render-summary", 1250]]',
                operation: "provide CurrentLogSpans",
                result: "log entries can carry labeled timing hierarchy",
                invariant: "the default span list is empty",
                implementation: "each entry is [label, timestamp]",
                guidance:
                    "Prefer higher-level log-span helpers for normal code; set the raw reference mainly for integrations and tests.",
            }

        case "Outputs":
            return {
                input: "CurrentLoggers · LogToStderr · UnhandledLogLevel",
                operation: "change destinations / error-report behavior",
                result: "logger set, console stream, and unhandled severity can differ independently",
                invariant:
                    "UnhandledLogLevel may be undefined to suppress that report",
                implementation:
                    "LogToStderr defaults false · UnhandledLogLevel defaults Error",
                guidance:
                    "Treat CurrentLoggers as a low-level complete replacement of the active logger set, not an additive convenience API.",
            }
    }
}

export const tracing_snapshot = (model: Model): Snapshot => {
    switch (model.tracingCase) {
        case "Enablement":
            return {
                input: "TracerEnabled = false · TracerTimingEnabled = false",
                operation: "create traced work inside the scope",
                result: "span registration and timing capture are controlled separately",
                invariant: "both references default to true",
                implementation:
                    "runtime reads these flags from the current Context",
                guidance:
                    "Disable only the capability you intend; timing and registration are not the same switch.",
            }

        case "Levels":
            return {
                input: 'CurrentTraceLevel = "Debug" · MinimumTraceLevel = "Warn"',
                operation: "derive a span sampling decision",
                result: "default span level is compared with the threshold",
                invariant:
                    "CurrentTraceLevel defaults Info · MinimumTraceLevel defaults All",
                implementation:
                    "explicit span sampled options can bypass threshold computation",
                guidance:
                    "Think of CurrentTraceLevel as the span's default level and MinimumTraceLevel as the sampling threshold.",
            }

        case "Metadata":
            return {
                input: "TracerSpanAnnotations · TracerSpanLinks",
                operation: "provide shared metadata / non-parent relationships",
                result: "new spans inherit annotations and links from context",
                invariant: "both collections default empty",
                implementation:
                    "links reference AnySpan values plus relationship attributes",
                guidance:
                    "Use links for causal relationships that are not parent-child; use annotations for shared trace metadata.",
            }

        case "Internals":
            return {
                input: "DisablePropagation · Tracer · CurrentStackFrame",
                operation:
                    "alter propagation/backend or inspect captured diagnostic frames",
                result: "low-level tracing mechanics become configurable",
                invariant:
                    "DisablePropagation defaults false; CurrentStackFrame defaults undefined",
                implementation:
                    "StackFrame is a name + lazy stack + optional parent chain",
                guidance:
                    "Prefer Effect.withSpan and ordinary tracing configuration unless you are building instrumentation or runtime tooling.",
            }
    }
}

export const scheduler_snapshot = (model: Model): Snapshot => {
    switch (model.schedulerCase) {
        case "Default":
            return {
                input: "yield* References.Scheduler",
                operation: "read active scheduler service",
                result: 'default MixedScheduler · executionMode "async"',
                invariant: "scheduler is a Context.Reference service",
                implementation:
                    "the default reference constructs MixedScheduler",
                guidance:
                    "Most application code should let the runtime own this default.",
            }

        case "Budget":
            return {
                input: "MaxOpsBeforeYield = 2048",
                operation: "fiber consumes runtime operations",
                result: "scheduler asks it to yield when its budget is reached",
                invariant: "lower budgets generally increase fairness checks",
                implementation:
                    "MixedScheduler compares currentOpCount with maxOpsBeforeYield",
                guidance:
                    "Tune only with a measured scheduling problem; the default balances throughput and fairness.",
            }

        case "Prevent":
            return {
                input: "PreventSchedulerYield = true",
                operation: "fiber run loop skips scheduler yield checks",
                result: "long-running work may retain the JavaScript thread",
                invariant: "default is false",
                implementation:
                    "this bypasses shouldYield rather than changing the operation budget",
                guidance:
                    "Use only for controlled runtime workloads where monopolizing the thread is understood and acceptable.",
            }

        case "Custom":
            return {
                input: 'new Scheduler.MixedScheduler("sync")',
                operation: "provideService(References.Scheduler, custom)",
                result: 'nested runtime reads executionMode "sync"',
                invariant: "custom schedulers satisfy the Scheduler interface",
                implementation:
                    "Scheduler defines executionMode, shouldYield, and makeDispatcher",
                guidance:
                    "Custom scheduler replacement is primarily a runtime/testing concern, not feature-level UI state.",
            }
    }
}

// -----------------------------------------------------------------------------
// MESSAGE / UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedReferencesStage: {
        stage: Stage,
    },
    SelectedReferencesReadCase: {
        readCase: ReadCase,
    },
    SelectedReferencesLoggingCase: {
        loggingCase: LoggingCase,
    },
    SelectedReferencesTracingCase: {
        tracingCase: TracingCase,
    },
    SelectedReferencesSchedulerCase: {
        schedulerCase: SchedulerCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Read",
    readCase: "Default",
    loggingCase: "Levels",
    tracingCase: "Enablement",
    schedulerCase: "Budget",
})

type StagePayload = Readonly<{ stage: Stage }>
type ReadCasePayload = Readonly<{ readCase: ReadCase }>
type LoggingCasePayload = Readonly<{ loggingCase: LoggingCase }>
type TracingCasePayload = Readonly<{ tracingCase: TracingCase }>
type SchedulerCasePayload = Readonly<{ schedulerCase: SchedulerCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedReferencesStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedReferencesReadCase: ({ readCase }: ReadCasePayload) => ({
            model: modifyFields(model, {
                readCase: () => readCase,
            }),
        }),

        SelectedReferencesLoggingCase: ({
            loggingCase,
        }: LoggingCasePayload) => ({
            model: modifyFields(model, {
                loggingCase: () => loggingCase,
            }),
        }),

        SelectedReferencesTracingCase: ({
            tracingCase,
        }: TracingCasePayload) => ({
            model: modifyFields(model, {
                tracingCase: () => tracingCase,
            }),
        }),

        SelectedReferencesSchedulerCase: ({
            schedulerCase,
        }: SchedulerCasePayload) => ({
            model: modifyFields(model, {
                schedulerCase: () => schedulerCase,
            }),
        }),
    })

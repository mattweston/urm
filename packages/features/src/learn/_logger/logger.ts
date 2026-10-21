import { Effect, Logger, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL LOGGER EXAMPLES
// -----------------------------------------------------------------------------

export const text_logger = Logger.make<unknown, string>(
    (options: Logger.Options<unknown>): string =>
        `[${options.logLevel.toUpperCase()}] ${JSON.stringify(options.message)}`
)

export const upper_text_logger = Logger.map(
    text_logger,
    (output: string): string => output.toUpperCase()
)

export const capture_program = (
    entries: Array<string>
): Effect.Effect<void> => {
    const collector = Logger.make<unknown, void>(
        (options: Logger.Options<unknown>): void => {
            entries.push(
                `${options.logLevel}:${JSON.stringify(options.message)}`
            )
        }
    )

    return Effect.gen(function* () {
        yield* Effect.logInfo("started")
        yield* Effect.logWarning("slow")
        yield* Effect.logError("failed")
    }).pipe(Effect.provide(Logger.layer([collector])))
}

export const format_probe_program = (out: {
    simple: string
    logfmt: string
    json: string
    structuredLevel: string
}): Effect.Effect<void> => {
    const probe = Logger.make<unknown, void>(
        (options: Logger.Options<unknown>): void => {
            out.simple = Logger.formatSimple.log(options)

            out.logfmt = Logger.formatLogFmt.log(options)

            out.json = Logger.formatJson.log(options)

            out.structuredLevel = Logger.formatStructured.log(options).level
        }
    )

    return Effect.log("hello").pipe(Effect.provide(Logger.layer([probe])))
}

export const batched_program = (
    flushed: Array<ReadonlyArray<string>>
): Effect.Effect<void, never> =>
    Effect.scoped(
        Effect.gen(function* () {
            const base = Logger.make<unknown, string>(
                (options: Logger.Options<unknown>): string =>
                    JSON.stringify(options.message)
            )

            const batched = yield* Logger.batched(base, {
                window: "1 hour",
                flush: (messages: Array<string>) =>
                    Effect.sync(() => {
                        flushed.push(messages.slice())
                    }),
            })

            yield* Effect.log("one").pipe(
                Effect.provide(Logger.layer([batched]))
            )

            yield* Effect.log("two").pipe(
                Effect.provide(Logger.layer([batched]))
            )
        })
    )

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Build"),
    S.Literal("Format"),
    S.Literal("Route"),
    S.Literal("Install"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Build",
    "Format",
    "Route",
    "Install",
]

export const BuildCase = S.Union([
    S.Literal("Make"),
    S.Literal("Map"),
    S.Literal("Options"),
])
export type BuildCase = typeof BuildCase.Type

export const FormatCase = S.Union([
    S.Literal("Text"),
    S.Literal("Structured"),
    S.Literal("Pretty"),
])
export type FormatCase = typeof FormatCase.Type

export const RouteCase = S.Union([
    S.Literal("Console"),
    S.Literal("Batch"),
    S.Literal("FileTrace"),
])
export type RouteCase = typeof RouteCase.Type

export const InstallCase = S.Union([
    S.Literal("Replace"),
    S.Literal("Merge"),
    S.Literal("References"),
])
export type InstallCase = typeof InstallCase.Type

export const Model = S.Struct({
    stage: Stage,
    buildCase: BuildCase,
    formatCase: FormatCase,
    routeCase: RouteCase,
    installCase: InstallCase,
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
    Build: {
        eyebrow: "log event → output",
        title: "Create a logger from Options and transform its output independently",
        description:
            "Logger<Message, Output> receives one Options<Message> event and returns an arbitrary Output. make defines the log function, map transforms only that output, and isLogger checks the module's runtime type marker.",
        code: `const text =
    Logger.make<
        unknown,
        string
    >(
        (
            options:
                Logger.Options<
                    unknown
                >
        ) =>
            \`[\${options.logLevel}]
             \${String(
                 options.message
             )}\`
    )

const upper =
    Logger.map(
        text,
        (
            output: string
        ) =>
            output.toUpperCase()
    )

Logger.isLogger(
    upper
)
// true`,
        apis: [
            "Logger.Logger",
            "Logger.Options",
            "Logger.make",
            "Logger.map",
            "Logger.isLogger",
        ],
        notice: "A Logger does not have to perform I/O. Its Output can be a string, object, void, or any other value. Console/file routing can be added afterward.",
    },

    Format: {
        eyebrow: "built-in formatters",
        title: "Choose human-readable text, logfmt, structured objects, JSON, or pretty console output",
        description:
            "formatSimple and formatLogFmt return strings; formatStructured returns an object containing level, timestamp, message, annotations, spans, cause, and fiber id; formatJson serializes that structured record. Pretty variants write directly to a console.",
        code: `Logger.formatSimple
// Logger<unknown, string>

Logger.formatLogFmt
// Logger<unknown, string>

Logger.formatStructured
// Logger<unknown, {
//   level,
//   fiberId,
//   timestamp,
//   message,
//   cause,
//   annotations,
//   spans
// }>

Logger.formatJson
// Logger<unknown, string>

Logger.consolePretty()
Logger.consolePrettyBrowser()
Logger.consolePrettyTty()`,
        apis: [
            "Logger.formatSimple",
            "Logger.formatLogFmt",
            "Logger.formatStructured",
            "Logger.formatJson",
            "Logger.consolePretty",
            "Logger.consolePrettyBrowser",
            "Logger.consolePrettyTty",
            "Logger.consoleLogFmt",
            "Logger.consoleStructured",
            "Logger.consoleJson",
            "Logger.defaultLogger",
        ],
        notice: "The format* values are formatter loggers whose Output is still available to compose. console* variants perform console I/O and therefore produce void.",
    },

    Route: {
        eyebrow: "send formatted output somewhere",
        title: "Route logger output to console methods, batches, files, or tracing",
        description:
            "withConsoleLog and withConsoleError write a formatter's output to a chosen console channel. withLeveledConsole chooses a console method from LogLevel. batched buffers another logger's Output, toFile writes string output through FileSystem, and tracerLogger records log messages as span events.",
        code: `const text =
    Logger.formatLogFmt

const stdout =
    Logger.withConsoleLog(
        text
    )

const stderr =
    Logger.withConsoleError(
        text
    )

const leveled =
    Logger.withLeveledConsole(
        text
    )

const file =
    Logger.toFile(
        text,
        "/tmp/app.log",
        {
            batchWindow:
                "1 second"
        }
    )`,
        apis: [
            "Logger.withConsoleLog",
            "Logger.withConsoleError",
            "Logger.withLeveledConsole",
            "Logger.batched",
            "Logger.toFile",
            "Logger.tracerLogger",
        ],
        notice: "batched and toFile are scoped because they own background / file resources and flush remaining buffered entries when their scope closes.",
    },

    Install: {
        eyebrow: "active logger set",
        title: "Install a logger set with a Layer, replacing or merging with existing loggers",
        description:
            "Logger.layer constructs the CurrentLoggers service for a program. By default it starts from an empty set and installs exactly the supplied loggers; mergeWithExisting preserves the current set and adds the new entries.",
        code: `const custom =
    Logger.make(
        (
            options:
                Logger.Options<
                    unknown
                >
        ) =>
            void options
    )

const replace =
    Logger.layer([
        custom,
        Logger.tracerLogger
    ])

const merge =
    Logger.layer(
        [
            custom
        ],
        {
            mergeWithExisting:
                true
        }
    )

// LogToStderr can route
// built-in default / TTY output
// to console.error`,
        apis: [
            "Logger.layer",
            "Logger.CurrentLoggers",
            "Logger.LogToStderr",
            "Logger.defaultLogger",
            "Logger.tracerLogger",
        ],
        notice: "Effect's default active set includes the default logger and tracer logger. A normal Logger.layer replaces that set; mergeWithExisting: true adds to whatever is already active.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type BuildSnapshot = Readonly<{
    mode: BuildCase
    shape: string
    fields: string
    output: string
    mappedOutput: string
    guard: boolean
}>

export const build_snapshot = (model: Model): BuildSnapshot => ({
    mode: model.buildCase,
    shape: "Logger<Message, Output>",
    fields: "message · logLevel · cause · fiber · date",
    output: "Options<Message> → Output",
    mappedOutput: "map: Output → Output2",
    guard: Logger.isLogger(text_logger),
})

export type FormatSnapshot = Readonly<{
    mode: FormatCase
    simple: string
    logfmt: string
    structured: string
    json: string
    pretty: string
    consoleVariants: string
}>

export const format_snapshot = (model: Model): FormatSnapshot => ({
    mode: model.formatCase,
    simple: "timestamp=… level=INFO fiber=#… message=hello",
    logfmt: "compact key=value text",
    structured:
        "{ level, fiberId, timestamp, message, cause, annotations, spans }",
    json: "single-line JSON of formatStructured output",
    pretty: "[time] INFO (#fiber) span: message + indented annotations",
    consoleVariants:
        "consolePretty · consolePrettyBrowser · consolePrettyTty · consoleLogFmt · consoleStructured · consoleJson",
})

export type RouteSnapshot = Readonly<{
    mode: RouteCase
    stdout: string
    stderr: string
    leveled: string
    batch: string
    file: string
    trace: string
}>

export const route_snapshot = (model: Model): RouteSnapshot => ({
    mode: model.routeCase,
    stdout: "withConsoleLog → console.log",
    stderr: "withConsoleError → console.error",
    leveled:
        "Debug→debug · Info→info · Trace→trace · Warn→warn · Error/Fatal→error",
    batch: "window + flush(outputs[]) · final scope close flushes leftovers",
    file: "toFile requires Scope + FileSystem and accepts optional batchWindow",
    trace: "tracerLogger records logs as events on the current trace span",
})

export type InstallSnapshot = Readonly<{
    mode: InstallCase
    defaultSet: string
    replace: string
    merge: string
    current: string
    stderr: string
}>

export const install_snapshot = (model: Model): InstallSnapshot => ({
    mode: model.installCase,
    defaultSet: "defaultLogger + tracerLogger",
    replace: "Logger.layer(loggers) → supplied set replaces current set",
    merge: "Logger.layer(loggers, { mergeWithExisting: true }) → union with current set",
    current:
        "CurrentLoggers: Context.Reference<ReadonlySet<Logger<unknown, …>>>",
    stderr: "LogToStderr: Context.Reference<boolean>, default false",
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedLoggerStage: {
        stage: Stage,
    },
    SelectedLoggerBuildCase: {
        buildCase: BuildCase,
    },
    SelectedLoggerFormatCase: {
        formatCase: FormatCase,
    },
    SelectedLoggerRouteCase: {
        routeCase: RouteCase,
    },
    SelectedLoggerInstallCase: {
        installCase: InstallCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Build",
    buildCase: "Make",
    formatCase: "Text",
    routeCase: "Console",
    installCase: "Replace",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type BuildCasePayload = Readonly<{
    buildCase: BuildCase
}>

type FormatCasePayload = Readonly<{
    formatCase: FormatCase
}>

type RouteCasePayload = Readonly<{
    routeCase: RouteCase
}>

type InstallCasePayload = Readonly<{
    installCase: InstallCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedLoggerStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedLoggerBuildCase: ({ buildCase }: BuildCasePayload) => ({
            model: modifyFields(model, {
                buildCase: () => buildCase,
            }),
        }),

        SelectedLoggerFormatCase: ({ formatCase }: FormatCasePayload) => ({
            model: modifyFields(model, {
                formatCase: () => formatCase,
            }),
        }),

        SelectedLoggerRouteCase: ({ routeCase }: RouteCasePayload) => ({
            model: modifyFields(model, {
                routeCase: () => routeCase,
            }),
        }),

        SelectedLoggerInstallCase: ({ installCase }: InstallCasePayload) => ({
            model: modifyFields(model, {
                installCase: () => installCase,
            }),
        }),
    })

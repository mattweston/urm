import { Effect, Schema as S, Sink, Stdio, Stream } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL STDIO PROGRAMS
// -----------------------------------------------------------------------------

export const inspect_stdio_program = Effect.gen(function* () {
    const stdio = yield* Stdio.Stdio
    const args = yield* stdio.args
    const stdinIsTerminal = yield* stdio.stdinIsTerminal
    const stdoutIsTerminal = yield* stdio.stdoutIsTerminal

    return {
        args,
        stdinIsTerminal,
        stdoutIsTerminal,
    } as const
})

export const custom_stdio_service = Stdio.make({
    args: Effect.succeed(["--mode", "demo"]),
    stdout: () => Sink.drain,
    stderr: () => Sink.drain,
    stdin: Stream.empty,
})

export const write_stdout_program = Effect.gen(function* () {
    const stdio = yield* Stdio.Stdio
    yield* Stream.run(Stream.make("hello on stdout\n"), stdio.stdout())
    return "stdout complete" as const
})

export const write_stderr_program = Effect.gen(function* () {
    const stdio = yield* Stdio.Stdio
    yield* Stream.run(Stream.make("warning on stderr\n"), stdio.stderr())
    return "stderr complete" as const
})

export const write_bytes_program = Effect.gen(function* () {
    const stdio = yield* Stdio.Stdio
    const bytes = new TextEncoder().encode("bytes on stdout\n")
    yield* Stream.run(Stream.make(bytes), stdio.stdout())
    return bytes.byteLength
})

export const keep_stdout_open_program = Effect.gen(function* () {
    const stdio = yield* Stdio.Stdio
    yield* Stream.run(
        Stream.make("chunk\n"),
        stdio.stdout({ endOnDone: false })
    )
    return "sink completed without asking the concrete output to end" as const
})

export const read_stdin_program = Effect.gen(function* () {
    const stdio = yield* Stdio.Stdio
    const first = yield* Stream.run(stdio.stdin, Sink.head<Uint8Array>())
    return first
})

export const read_args_program = Effect.gen(function* () {
    const stdio = yield* Stdio.Stdio
    return yield* stdio.args
})

export const terminal_flags_program = Effect.gen(function* () {
    const stdio = yield* Stdio.Stdio
    const stdin = yield* stdio.stdinIsTerminal
    const stdout = yield* stdio.stdoutIsTerminal
    return { stdin, stdout } as const
})

export const stdio_test_layer = Stdio.layerTest({
    args: Effect.succeed(["--dry-run", "input.txt"]),
    stdinIsTerminal: Effect.succeed(true),
    stdoutIsTerminal: Effect.succeed(false),
})

export const test_args_program = Effect.gen(function* () {
    const stdio = yield* Stdio.Stdio
    return yield* stdio.args
}).pipe(Effect.provide(stdio_test_layer))

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Service"),
    S.Literal("Write"),
    S.Literal("Read"),
    S.Literal("Test"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = ["Service", "Write", "Read", "Test"]

export const ServiceCase = S.Union([
    S.Literal("Contract"),
    S.Literal("Make"),
    S.Literal("TypeId"),
    S.Literal("Platform"),
])
export type ServiceCase = typeof ServiceCase.Type

export const service_cases: ReadonlyArray<ServiceCase> = [
    "Contract",
    "Make",
    "TypeId",
    "Platform",
]

export const WriteCase = S.Union([
    S.Literal("Stdout"),
    S.Literal("Stderr"),
    S.Literal("Bytes"),
    S.Literal("EndOnDone"),
])
export type WriteCase = typeof WriteCase.Type

export const write_cases: ReadonlyArray<WriteCase> = [
    "Stdout",
    "Stderr",
    "Bytes",
    "EndOnDone",
]

export const ReadCase = S.Union([
    S.Literal("Stdin"),
    S.Literal("Args"),
    S.Literal("TTY"),
    S.Literal("Errors"),
])
export type ReadCase = typeof ReadCase.Type

export const read_cases: ReadonlyArray<ReadCase> = [
    "Stdin",
    "Args",
    "TTY",
    "Errors",
]

export const TestCase = S.Union([
    S.Literal("Layer"),
    S.Literal("Defaults"),
    S.Literal("Override"),
    S.Literal("Boundary"),
])
export type TestCase = typeof TestCase.Type

export const test_cases: ReadonlyArray<TestCase> = [
    "Layer",
    "Defaults",
    "Override",
    "Boundary",
]

export const Model = S.Struct({
    stage: Stage,
    serviceCase: ServiceCase,
    writeCase: WriteCase,
    readCase: ReadCase,
    testCase: TestCase,
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
    Service: {
        eyebrow:
            "standard I/O is a service contract, not a global process handle",
        title: "Depend on Stdio through the Effect environment",
        description:
            "The Stdio service groups command-line arguments, terminal detection, stdout/stderr sinks, and a stdin byte stream. Programs can ask for Stdio.Stdio without coupling themselves to Node, Bun, Deno, or a test fake.",
        code: `const program = Effect.gen(function* () {
    const stdio = yield* Stdio.Stdio

    const args = yield* stdio.args
    const isTty =
        yield* stdio.stdoutIsTerminal

    return { args, isTty }
})`,
        apis: [
            "Stdio.Stdio",
            "Stdio.Stdio interface",
            "Stdio.make",
            "Stdio.TypeId",
        ],
        notice: "This module defines the contract and constructors. A real process binding is supplied by platform wiring elsewhere; application code should depend on the Stdio service rather than direct global process streams.",
    },

    Write: {
        eyebrow: "stdout and stderr are sinks over strings or bytes",
        title: "Write by running a Stream into the requested output Sink",
        description:
            "stdout() and stderr() return Sink values that consume string or Uint8Array input and may fail with PlatformError. This keeps writing composable with Stream rather than exposing imperative write methods on the service.",
        code: `const stdio = yield* Stdio.Stdio

yield* Stream.run(
    Stream.make("hello\\n"),
    stdio.stdout()
)

yield* Stream.run(
    Stream.make("warning\\n"),
    stdio.stderr()
)`,
        apis: ["Stdio.stdout", "Stdio.stderr", "Sink.Sink", "Stream.run"],
        notice: "The output methods return fresh Sink values. endOnDone is a lifecycle hint for the concrete output implementation; false lets a sink finish without asking the underlying output to end.",
    },

    Read: {
        eyebrow: "stdin is bytes; argv and terminal status are Effects",
        title: "Keep input streaming and metadata effectful",
        description:
            "stdin is a Stream<Uint8Array, PlatformError>, so decoding text is a separate concern. args, stdinIsTerminal, and stdoutIsTerminal are Effects, allowing implementations and tests to determine those values at runtime.",
        code: `const stdio = yield* Stdio.Stdio

const firstChunk = yield* Stream.run(
    stdio.stdin,
    Sink.head<Uint8Array>()
)

const args = yield* stdio.args
const tty =
    yield* stdio.stdinIsTerminal`,
        apis: [
            "Stdio.stdin",
            "Stdio.args",
            "Stdio.stdinIsTerminal",
            "Stdio.stdoutIsTerminal",
        ],
        notice: "Stdio does not decode stdin to text for you. Keeping stdin byte-oriented avoids assuming an encoding and lets downstream Stream transformations decide how bytes should be interpreted.",
    },

    Test: {
        eyebrow: "replace process I/O with deterministic Layer wiring",
        title: "Use layerTest to override only what the test needs",
        description:
            "layerTest accepts a Partial<Stdio>. Anything omitted receives safe defaults: empty args, draining stdout/stderr sinks, an empty stdin stream, and false terminal flags. Override only the observations or streams relevant to the test.",
        code: `const layer = Stdio.layerTest({
    args: Effect.succeed([
        "--dry-run",
        "input.txt"
    ]),
    stdinIsTerminal:
        Effect.succeed(true)
})

const result = program.pipe(
    Effect.provide(layer)
)`,
        apis: [
            "Stdio.layerTest",
            "Layer.Layer<Stdio>",
            "Sink.drain",
            "Stream.empty",
        ],
        notice: "Keep the live Stdio service out of serializable Foldkit Model state. Tests should provide Stdio through Layer wiring while the UI model stores only plain selected stage/case values.",
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

export const service_snapshot = (model: Model): Snapshot => {
    switch (model.serviceCase) {
        case "Contract":
            return {
                input: "program requires process I/O",
                operation: "yield* Stdio.Stdio",
                result: "environment-supplied Stdio service",
                invariant: "application code depends on a service contract",
                implementation: "Context.Service<Stdio, Stdio>",
                guidance:
                    "Ask for Stdio in Effect code instead of reading process globals directly.",
            }

        case "Make":
            return {
                input: "args + stdout/stderr sinks + stdin stream",
                operation: "Stdio.make(fields)",
                result: "branded Stdio implementation",
                invariant: "supplied stream/sink fields are reused unchanged",
                implementation:
                    "missing terminal flags default to Effect.succeed(false)",
                guidance:
                    "Use make when assembling a concrete or custom service value yourself.",
            }

        case "TypeId":
            return {
                input: 'runtime marker "~effect/Stdio"',
                operation: "Stdio.TypeId",
                result: "service brand + Context identity",
                invariant: "TypeId has both a type and runtime value export",
                implementation: "make attaches [TypeId]: TypeId",
                guidance:
                    "Treat the marker as service machinery rather than application-domain state.",
            }

        case "Platform":
            return {
                input: "portable Stdio-dependent program",
                operation: "provide platform-specific implementation",
                result: "same program on a concrete runtime",
                invariant:
                    "Stdio.ts itself does not bind global process handles",
                implementation:
                    "platform package/layer supplies real streams and sinks",
                guidance:
                    "Keep runtime binding at the application edge so business logic stays portable and testable.",
            }
    }
}

export const write_snapshot = (model: Model): Snapshot => {
    switch (model.writeCase) {
        case "Stdout":
            return {
                input: 'Stream.make("hello\\n")',
                operation: "Stream.run(stream, stdio.stdout())",
                result: "void or PlatformError",
                invariant: "stdout is modeled as a Sink",
                implementation: "Sink consumes string | Uint8Array values",
                guidance:
                    "Use Stream composition for chunking, transformation, and output sequencing.",
            }

        case "Stderr":
            return {
                input: 'Stream.make("warning\\n")',
                operation: "Stream.run(stream, stdio.stderr())",
                result: "separate stderr channel",
                invariant:
                    "stdout and stderr share the same Sink input contract",
                implementation: "both may fail with PlatformError",
                guidance:
                    "Route diagnostic output to stderr without changing the program's stream model.",
            }

        case "Bytes":
            return {
                input: "Uint8Array from TextEncoder",
                operation: "Stream.run(bytes, stdio.stdout())",
                result: "raw bytes written without text coercion",
                invariant: "output accepts text or binary chunks",
                implementation:
                    "Sink<void, string | Uint8Array, ..., PlatformError>",
                guidance:
                    "Use Uint8Array when encoding is already explicit or output is binary-framed.",
            }

        case "EndOnDone":
            return {
                input: "stdout({ endOnDone: false })",
                operation: "run a finite output stream",
                result: "sink finishes without requesting output end",
                invariant:
                    "sink completion and underlying output lifetime are separable",
                implementation:
                    "option is forwarded to the concrete output Sink",
                guidance:
                    "Use false when several independent writes share one longer-lived underlying output.",
            }
    }
}

export const read_snapshot = (model: Model): Snapshot => {
    switch (model.readCase) {
        case "Stdin":
            return {
                input: "process standard input",
                operation: "Stream.run(stdio.stdin, Sink.head())",
                result: "Option<Uint8Array>",
                invariant: "stdin remains byte-oriented",
                implementation: "Stream<Uint8Array, PlatformError>",
                guidance:
                    "Decode bytes explicitly downstream instead of assuming text encoding in Stdio.",
            }

        case "Args":
            return {
                input: "runtime command-line arguments",
                operation: "yield* stdio.args",
                result: "ReadonlyArray<string>",
                invariant: "argv is accessed through the service",
                implementation: "args is Effect<ReadonlyArray<string>>",
                guidance:
                    "Read arguments where Effect dependencies are already explicit and easy to replace in tests.",
            }

        case "TTY":
            return {
                input: "stdin/stdout attachment state",
                operation: "yield* terminal detection effects",
                result: "boolean flags",
                invariant: "TTY status is runtime data, not a static field",
                implementation:
                    "stdinIsTerminal / stdoutIsTerminal are Effects",
                guidance:
                    "Use terminal flags for behavior differences such as interactive formatting or prompts.",
            }

        case "Errors":
            return {
                input: "platform I/O failure",
                operation: "run stdin/out stream interaction",
                result: "typed PlatformError failure",
                invariant:
                    "I/O failure is visible in Stream/Sink error channels",
                implementation: "stdin and output sinks carry PlatformError",
                guidance:
                    "Recover at the Stream/Effect boundary instead of relying on thrown process I/O exceptions.",
            }
    }
}

export const test_snapshot = (model: Model): Snapshot => {
    switch (model.testCase) {
        case "Layer":
            return {
                input: "Partial<Stdio> overrides",
                operation: "Stdio.layerTest(overrides)",
                result: "Layer<Stdio>",
                invariant: "test wiring uses the same service identity",
                implementation: "Layer.succeed(Stdio.Stdio, Stdio.make(...))",
                guidance:
                    "Provide the layer to the Effect under test instead of monkey-patching global streams.",
            }

        case "Defaults":
            return {
                input: "Stdio.layerTest({})",
                operation: "use omitted-field defaults",
                result: "[] args · drain outputs · empty stdin · false TTYs",
                invariant: "tests start from inert deterministic I/O",
                implementation:
                    "Sink.drain + Stream.empty + Effect.succeed(false)",
                guidance:
                    "Override only the behavior your test actually observes.",
            }

        case "Override":
            return {
                input: 'args = ["--dry-run", "input.txt"]',
                operation: "override args / flags / streams / sinks as needed",
                result: "deterministic program observation",
                invariant: "provided fields win over test defaults",
                implementation: "layerTest spreads impl after its defaults",
                guidance:
                    "Build focused fakes instead of recreating a full platform implementation for every test.",
            }

        case "Boundary":
            return {
                input: "Foldkit model + Stdio-dependent effects",
                operation: "keep service in runtime wiring",
                result: "plain serializable Model",
                invariant:
                    "Stream, Sink, Effect, and service values stay out of Model",
                implementation:
                    "messages carry intent; effects read/write through provided Stdio",
                guidance:
                    "Keep Stdio near execution boundaries while the UI model stores only durable domain state.",
            }
    }
}

export const initial_model: Model = {
    stage: "Service",
    serviceCase: "Contract",
    writeCase: "Stdout",
    readCase: "Stdin",
    testCase: "Layer",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

type StagePayload = Readonly<{ stage: Stage }>
type ServiceCasePayload = Readonly<{ serviceCase: ServiceCase }>
type WriteCasePayload = Readonly<{ writeCase: WriteCase }>
type ReadCasePayload = Readonly<{ readCase: ReadCase }>
type TestCasePayload = Readonly<{ testCase: TestCase }>

export const Message = defineMessageUnion({
    SelectedStdioStage: { stage: Stage },
    SelectedStdioServiceCase: { serviceCase: ServiceCase },
    SelectedStdioWriteCase: { writeCase: WriteCase },
    SelectedStdioReadCase: { readCase: ReadCase },
    SelectedStdioTestCase: { testCase: TestCase },
})
export type Message = typeof Message.Type

export const update = (
    model: Model,
    message: Message
): Update.Return<Model, Message> =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedStdioStage: ({ stage }: StagePayload) => ({
            model: evo(model, { stage: () => stage }),
        }),

        SelectedStdioServiceCase: ({ serviceCase }: ServiceCasePayload) => ({
            model: evo(model, { serviceCase: () => serviceCase }),
        }),

        SelectedStdioWriteCase: ({ writeCase }: WriteCasePayload) => ({
            model: evo(model, { writeCase: () => writeCase }),
        }),

        SelectedStdioReadCase: ({ readCase }: ReadCasePayload) => ({
            model: evo(model, { readCase: () => readCase }),
        }),

        SelectedStdioTestCase: ({ testCase }: TestCasePayload) => ({
            model: evo(model, { testCase: () => testCase }),
        }),
    })

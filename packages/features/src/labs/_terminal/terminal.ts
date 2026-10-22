import { Effect, Option, Schema as S, Terminal } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL TERMINAL PROGRAMS
// -----------------------------------------------------------------------------

export const demo_terminal = Terminal.make({
    columns: Effect.succeed(120),
    rows: Effect.succeed(40),
    readInput: Effect.die(
        new Error("low-level input is supplied by a platform adapter")
    ),
    readLine: Effect.succeed("Ada"),
    display: (_text: string) => Effect.void,
})

export const read_dimensions = Effect.gen(function* () {
    const terminal = yield* Effect.service(Terminal.Terminal)
    const columns = yield* terminal.columns
    const rows = yield* terminal.rows
    return { columns, rows } as const
})

export const read_line = Effect.gen(function* () {
    const terminal = yield* Effect.service(Terminal.Terminal)
    return yield* terminal.readLine
})

export const read_input_queue = Effect.gen(function* () {
    const terminal = yield* Effect.service(Terminal.Terminal)
    return yield* terminal.readInput
})

export const display_hello = Effect.gen(function* () {
    const terminal = yield* Effect.service(Terminal.Terminal)
    yield* terminal.display("Hello from Effect\n")
})

export const ctrl_c_key: Terminal.Key = {
    name: "c",
    ctrl: true,
    meta: false,
    shift: false,
}

export const ctrl_c_input: Terminal.UserInput = {
    input: Option.some("\u0003"),
    key: ctrl_c_key,
}

export const quit_error = new Terminal.QuitError()
export const quit_is_recognized = Terminal.isQuitError(quit_error)

export const recover_quit = Effect.catch(
    Effect.fail(quit_error),
    (error: unknown) =>
        Terminal.isQuitError(error)
            ? Effect.succeed("cancelled" as const)
            : Effect.fail(error)
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Service"),
    S.Literal("Read"),
    S.Literal("Display"),
    S.Literal("Quit"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Service",
    "Read",
    "Display",
    "Quit",
]

export const ServiceCase = S.Union([
    S.Literal("Contract"),
    S.Literal("Make"),
    S.Literal("Dimensions"),
    S.Literal("Tag"),
])
export type ServiceCase = typeof ServiceCase.Type

export const service_cases: ReadonlyArray<ServiceCase> = [
    "Contract",
    "Make",
    "Dimensions",
    "Tag",
]

export const ReadCase = S.Union([
    S.Literal("Line"),
    S.Literal("Input"),
    S.Literal("Key"),
    S.Literal("Scope"),
])
export type ReadCase = typeof ReadCase.Type

export const read_cases: ReadonlyArray<ReadCase> = [
    "Line",
    "Input",
    "Key",
    "Scope",
]

export const DisplayCase = S.Union([
    S.Literal("Text"),
    S.Literal("Failure"),
    S.Literal("Boundary"),
    S.Literal("Adapter"),
])
export type DisplayCase = typeof DisplayCase.Type

export const display_cases: ReadonlyArray<DisplayCase> = [
    "Text",
    "Failure",
    "Boundary",
    "Adapter",
]

export const QuitCase = S.Union([
    S.Literal("Error"),
    S.Literal("Guard"),
    S.Literal("Catch"),
    S.Literal("CtrlC"),
])
export type QuitCase = typeof QuitCase.Type

export const quit_cases: ReadonlyArray<QuitCase> = [
    "Error",
    "Guard",
    "Catch",
    "CtrlC",
]

export const Model = S.Struct({
    stage: Stage,
    serviceCase: ServiceCase,
    readCase: ReadCase,
    displayCase: DisplayCase,
    quitCase: QuitCase,
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
        eyebrow: "interactive capabilities live behind a Context service",
        title: "Depend on a terminal service, not global process handles",
        description:
            "Terminal groups dimensions, line input, low-level key events, and display output behind one Effect service. Platform adapters or tests can construct an implementation with Terminal.make and provide it through Terminal.Terminal.",
        code: `const terminal = Terminal.make({
  columns: Effect.succeed(120),
  rows: Effect.succeed(40),
  readInput,
  readLine,
  display
})`,
        apis: [
            "Terminal.Terminal",
            "Terminal.make",
            "Terminal.Terminal interface",
        ],
        notice: "Terminal is an interactive capability service. Stdio is the lower-level argv/stdin/stdout/stderr service; use the abstraction that matches the program boundary you actually need.",
    },

    Read: {
        eyebrow:
            "readLine is simple; readInput exposes low-level terminal events",
        title: "Choose line input or scoped key-event input",
        description:
            "readLine returns one string and may fail with QuitError. readInput instead acquires a scoped Dequeue of UserInput events, where each event carries an optional raw character plus parsed key metadata.",
        code: `const terminal = yield* Effect.service(Terminal.Terminal)

const line = yield* terminal.readLine
const queue = yield* terminal.readInput
// queue lifetime requires Scope`,
        apis: [
            "Terminal.readLine",
            "Terminal.readInput",
            "Terminal.UserInput",
            "Terminal.Key",
        ],
        notice: "readInput requires Scope because the Dequeue is a live resource. Keep it inside scoped Effect code rather than extracting and retaining it past the scope lifetime.",
    },

    Display: {
        eyebrow: "display writes text through the platform terminal adapter",
        title: "Keep output failures typed as PlatformError",
        description:
            "display accepts text and returns an Effect that can fail with PlatformError. The Terminal contract therefore keeps interactive output platform-independent without pretending terminal writes cannot fail.",
        code: `const terminal = yield* Effect.service(Terminal.Terminal)

yield* terminal.display(
  "Hello from Effect\\n"
)`,
        apis: ["Terminal.display", "PlatformError", "Effect.service"],
        notice: "Terminal.display is text-oriented interactive output. If your program needs raw stdout/stderr sinks or byte I/O, Stdio is the more direct boundary.",
    },

    Quit: {
        eyebrow: "user cancellation is a typed terminal outcome",
        title: "Represent Ctrl+C cancellation with QuitError",
        description:
            "QuitError models a user abandoning terminal input, commonly through Ctrl+C. isQuitError is the public runtime guard, so application recovery does not need to depend on the module's private marker string.",
        code: `const error = new Terminal.QuitError()

Terminal.isQuitError(error) // true

const recovered = Effect.catch(
  Effect.fail(error),
  (e) => Terminal.isQuitError(e)
    ? Effect.succeed("cancelled")
    : Effect.fail(e)
)`,
        apis: ["Terminal.QuitError", "Terminal.isQuitError"],
        notice: "The hidden QuitError marker changed between rc.112 and rc.117. Use isQuitError rather than checking the marker property yourself.",
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
                input: "interactive terminal capabilities",
                operation: "Terminal.Terminal service",
                result: "dimensions + input + display",
                invariant:
                    "program code depends on an Effect service, not process globals",
                implementation: "Context.Service<Terminal, Terminal>",
                guidance:
                    "Use Terminal when application logic needs interactive terminal semantics.",
            }
        case "Make":
            return {
                input: "columns / rows / readInput / readLine / display",
                operation: "Terminal.make(impl)",
                result: "Terminal implementation",
                invariant: "make attaches the service runtime marker",
                implementation: "Terminal.of({ ...impl, marker })",
                guidance:
                    "Use make in platform adapters, deterministic tests, and custom runtimes.",
            }
        case "Dimensions":
            return {
                input: "Terminal service",
                operation: "yield* columns + rows",
                result: "{ columns, rows }",
                invariant:
                    "dimensions are Effects, not frozen constructor fields",
                implementation: "Effect<number> for each dimension",
                guidance:
                    "Read dimensions when needed so platform adapters can report the current terminal size.",
            }
        case "Tag":
            return {
                input: "Effect.service(Terminal.Terminal)",
                operation: "resolve from Context",
                result: "Terminal service value",
                invariant:
                    "public service tag hides private runtime identifier changes",
                implementation: "Context.Service",
                guidance:
                    "Prefer the exported service tag to manual Context keys or marker strings.",
            }
    }
}

export const read_snapshot = (model: Model): Snapshot => {
    switch (model.readCase) {
        case "Line":
            return {
                input: "terminal.readLine",
                operation: "yield*",
                result: "string | QuitError failure",
                invariant: "line input has typed user-cancellation",
                implementation: "Effect<string, QuitError>",
                guidance:
                    "Use readLine when prompts only need one completed line rather than raw key events.",
            }
        case "Input":
            return {
                input: "terminal.readInput",
                operation: "yield* inside Scope",
                result: "Dequeue<UserInput, Done<void>>",
                invariant: "the queue is a scoped live input resource",
                implementation: "Effect<Dequeue<...>, never, Scope>",
                guidance:
                    "Use low-level input when arrow keys, modifiers, or immediate key handling matter.",
            }
        case "Key":
            return {
                input: "UserInput",
                operation: "inspect .input + .key",
                result: "raw char + parsed metadata",
                invariant: "raw input may be Option.none",
                implementation: "Key{name, ctrl, meta, shift}",
                guidance:
                    "Use key metadata for control/navigation keys instead of assuming every event has a character.",
            }
        case "Scope":
            return {
                input: "readInput Dequeue",
                operation: "consume within owning Scope",
                result: "bounded resource lifetime",
                invariant: "do not retain the queue after Scope closes",
                implementation: "Scope requirement in readInput Effect",
                guidance:
                    "Wrap long-lived raw input loops in Effect.scoped or an equivalent owning scope.",
            }
    }
}

export const display_snapshot = (model: Model): Snapshot => {
    switch (model.displayCase) {
        case "Text":
            return {
                input: '"Hello\\n"',
                operation: "terminal.display(text)",
                result: "Effect<void, PlatformError>",
                invariant: "interactive output is text-oriented",
                implementation: "platform adapter performs the write",
                guidance:
                    "Use display for terminal-oriented messages and prompts.",
            }
        case "Failure":
            return {
                input: "platform write",
                operation: "display",
                result: "typed PlatformError on failure",
                invariant: "I/O failure is not hidden as a defect",
                implementation: "Effect error channel",
                guidance:
                    "Handle or propagate PlatformError according to the application's I/O policy.",
            }
        case "Boundary":
            return {
                input: "interactive text output",
                operation: "Terminal.display",
                result: "terminal abstraction",
                invariant: "Terminal is not the raw byte stdio API",
                implementation: "string -> Effect<void, PlatformError>",
                guidance:
                    "Choose Stdio for byte streams / raw stdout and Terminal for interactive terminal capabilities.",
            }
        case "Adapter":
            return {
                input: "custom platform implementation",
                operation: "Terminal.make",
                result: "replaceable display behavior",
                invariant: "application code stays platform-agnostic",
                implementation: "dependency injection through Context",
                guidance:
                    "Adapters can translate display into Node, browser-like, test, or embedded terminal behavior.",
            }
    }
}

export const quit_snapshot = (model: Model): Snapshot => {
    switch (model.quitCase) {
        case "Error":
            return {
                input: "new Terminal.QuitError()",
                operation: "fail readLine / prompt",
                result: "typed user cancellation",
                invariant: "quit is distinct from PlatformError",
                implementation: 'Schema.Error tagged "QuitError"',
                guidance:
                    "Treat user cancellation as its own domain outcome instead of conflating it with terminal I/O failure.",
            }
        case "Guard":
            return {
                input: "unknown failure",
                operation: "Terminal.isQuitError(value)",
                result: "value is QuitError",
                invariant: "guard uses the current runtime marker internally",
                implementation: "Predicate.hasProperty(marker)",
                guidance:
                    "The guard is the compatibility-safe way to narrow unknown errors.",
            }
        case "Catch":
            return {
                input: "Effect failing with QuitError",
                operation: "Effect.catch + isQuitError",
                result: "recover as cancelled",
                invariant: "unrelated errors can still be re-failed",
                implementation: "typed branch in the error handler",
                guidance:
                    "Recover only the user-cancel path; preserve other failures.",
            }
        case "CtrlC":
            return {
                input: "Key{name:'c', ctrl:true}",
                operation: "platform prompt logic",
                result: "QuitError",
                invariant:
                    "Ctrl+C is the usual convention, not a hard-coded Terminal algorithm",
                implementation:
                    "adapter decides how raw events map to prompt cancellation",
                guidance:
                    "Keep raw key handling in the adapter or prompt layer and expose cancellation as QuitError.",
            }
    }
}

export const initial_model: Model = {
    stage: "Service",
    serviceCase: "Contract",
    readCase: "Line",
    displayCase: "Text",
    quitCase: "Error",
}

// -----------------------------------------------------------------------------
// MESSAGES + UPDATE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedTerminalStage: { stage: Stage },
    SelectedTerminalServiceCase: { serviceCase: ServiceCase },
    SelectedTerminalReadCase: { readCase: ReadCase },
    SelectedTerminalDisplayCase: { displayCase: DisplayCase },
    SelectedTerminalQuitCase: { quitCase: QuitCase },
})
export type Message = typeof Message.Type

type StagePayload = Readonly<{ stage: Stage }>
type ServiceCasePayload = Readonly<{ serviceCase: ServiceCase }>
type ReadCasePayload = Readonly<{ readCase: ReadCase }>
type DisplayCasePayload = Readonly<{ displayCase: DisplayCase }>
type QuitCasePayload = Readonly<{ quitCase: QuitCase }>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedTerminalStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, { stage: () => stage }),
        }),
        SelectedTerminalServiceCase: ({ serviceCase }: ServiceCasePayload) => ({
            model: modifyFields(model, { serviceCase: () => serviceCase }),
        }),
        SelectedTerminalReadCase: ({ readCase }: ReadCasePayload) => ({
            model: modifyFields(model, { readCase: () => readCase }),
        }),
        SelectedTerminalDisplayCase: ({ displayCase }: DisplayCasePayload) => ({
            model: modifyFields(model, { displayCase: () => displayCase }),
        }),
        SelectedTerminalQuitCase: ({ quitCase }: QuitCasePayload) => ({
            model: modifyFields(model, { quitCase: () => quitCase }),
        }),
    })

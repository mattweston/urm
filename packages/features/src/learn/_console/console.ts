import { Console, Effect, Schema as S } from "effect"
import { Command, type Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// MODEL

export const Stage = S.Union([
    S.Literal("Levels"),
    S.Literal("Inspect"),
    S.Literal("Counters"),
    S.Literal("Scope"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Levels",
    "Inspect",
    "Counters",
    "Scope",
]

export const EntryKind = S.Union([
    S.Literal("Log"),
    S.Literal("Info"),
    S.Literal("Debug"),
    S.Literal("Warn"),
    S.Literal("Error"),
    S.Literal("Assert"),
    S.Literal("Inspect"),
    S.Literal("Table"),
    S.Literal("Count"),
    S.Literal("Group"),
    S.Literal("Timer"),
    S.Literal("Trace"),
    S.Literal("Clear"),
])
export type EntryKind = typeof EntryKind.Type

export const ConsoleEntry = S.Struct({
    id: S.String,
    kind: EntryKind,
    depth: S.Number,
    value: S.String,
})
export type ConsoleEntry = typeof ConsoleEntry.Type

export const Model = S.Struct({
    stage: Stage,
    entries: S.Array(ConsoleEntry),
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
    Levels: {
        eyebrow: "accessors",
        title: "Console calls are Effects",
        description:
            "log, info, debug, warn, error, and assert defer console access until the Effect runs.",
        code: `const program = Effect.gen(function* () {
    yield* Console.log("request started", { id: 42 })
    yield* Console.info("cache", "hit")
    yield* Console.debug("flags", { beta: true })
    yield* Console.warn("slow response", 640)
    yield* Console.error("retry exhausted")
    yield* Console.assert(false, "user must be active")
})`,
        apis: [
            "Console.log",
            "Console.info",
            "Console.debug",
            "Console.warn",
            "Console.error",
            "Console.assert",
        ],
        notice: "The active Console service decides what these calls do. The program itself only describes the operations.",
    },
    Inspect: {
        eyebrow: "structured output",
        title: "Inspect data without leaving Effect",
        description:
            "dir, dirxml, and table keep debugging helpers behind the same service boundary as ordinary logging.",
        code: `const program = Effect.gen(function* () {
    yield* Console.dir({
        user: "Ada",
        permissions: ["read", "write"]
    })

    yield* Console.table(users, ["name", "role"])
    yield* Console.dirxml("<user id=\"42\">Ada</user>")
})`,
        apis: ["Console.dir", "Console.table", "Console.dirxml"],
        notice: "Console.table accepts optional property names, so the console implementation can choose which columns to present.",
    },
    Counters: {
        eyebrow: "stateful console",
        title: "Counters live in the Console implementation",
        description:
            "count increments a label-owned counter and countReset resets that same label without adding application state.",
        code: `const program = Effect.gen(function* () {
    yield* Console.count("cache-hit")
    yield* Console.count("cache-hit")
    yield* Console.count("cache-miss")
    yield* Console.countReset("cache-hit")
    yield* Console.count("cache-hit")
})`,
        apis: ["Console.count", "Console.countReset"],
        notice: "The counter is deliberately outside your Foldkit Model. It belongs to the injected Console service, just like a browser or test console.",
    },
    Scope: {
        eyebrow: "scoped lifecycle",
        title: "Groups and timers close automatically",
        description:
            "Console.group and Console.time acquire scoped resources, so groupEnd and timeEnd run when the Effect scope is finalized.",
        code: `const program = Effect.scoped(
    Effect.gen(function* () {
        yield* Console.group({ label: "load profile" })
        yield* Console.time("profile")
        yield* Console.log("fetch user")
        yield* Console.timeLog("profile", "cache miss")

        yield* Console.withGroup(
            Console.log("check permissions"),
            { label: "permissions", collapsed: true }
        )

        yield* Console.info("profile ready")
    })
)`,
        apis: [
            "Console.group",
            "Console.time",
            "Console.timeLog",
            "Console.withGroup",
            "Console.withTime",
        ],
        notice: "Scope finalizers make cleanup interruption-safe. withGroup and withTime are the convenience wrappers for running an Effect inside the same lifecycle.",
    },
}

// MESSAGE

export const Message = defineMessageUnion({
    SelectedConsoleStage: { stage: Stage },
    ClickedRunConsoleDemo: {},
    ClickedClearConsoleOutput: {},
    CompletedRunConsoleDemo: { entries: S.Array(ConsoleEntry) },
})
export type Message = typeof Message.Type

// COMMAND

const format_value = (value: unknown): string => {
    if (typeof value === "string") {
        return value
    }

    if (typeof value === "undefined") {
        return "undefined"
    }

    if (typeof value === "bigint") {
        return `${value}n`
    }

    if (typeof value === "symbol") {
        return String(value)
    }

    if (typeof value === "function") {
        return value.name === "" ? "[Function]" : `[Function ${value.name}]`
    }

    try {
        const json = JSON.stringify(value)
        return json === undefined ? String(value) : json
    } catch {
        return String(value)
    }
}

const format_args = (args: ReadonlyArray<unknown>): string =>
    args.map(format_value).join(" ")

const make_capture_console = (): Readonly<{
    service: Console.Console
    entries: Array<ConsoleEntry>
}> => {
    const entries: Array<ConsoleEntry> = []
    const counters = new Map<string, number>()
    const state = {
        depth: 0,
        next_entry_id: 1,
    }

    const push = (kind: EntryKind, value: string): void => {
        const id = `console-entry-${state.next_entry_id}`
        state.next_entry_id += 1

        entries.push(
            ConsoleEntry.make({
                id,
                kind,
                depth: state.depth,
                value,
            })
        )
    }

    const service: Console.Console = {
        assert: (condition, ...args) => {
            if (!condition) {
                push("Assert", format_args(args))
            }
        },
        clear: () => {
            entries.splice(0, entries.length)
            push("Clear", "console cleared")
        },
        count: (label) => {
            const counter_label = label ?? "default"
            const next_count = (counters.get(counter_label) ?? 0) + 1
            counters.set(counter_label, next_count)
            push("Count", `${counter_label}: ${next_count}`)
        },
        countReset: (label) => {
            const counter_label = label ?? "default"
            counters.set(counter_label, 0)
            push("Count", `${counter_label}: reset`)
        },
        debug: (...args) => {
            push("Debug", format_args(args))
        },
        dir: (item, options) => {
            const options_label =
                options === undefined ? "" : ` options=${format_value(options)}`
            push("Inspect", `${format_value(item)}${options_label}`)
        },
        dirxml: (...args) => {
            push("Inspect", `dirxml ${format_args(args)}`)
        },
        error: (...args) => {
            push("Error", format_args(args))
        },
        group: (...args) => {
            push("Group", `group ${format_args(args)}`)
            state.depth += 1
        },
        groupCollapsed: (...args) => {
            push("Group", `groupCollapsed ${format_args(args)}`)
            state.depth += 1
        },
        groupEnd: () => {
            state.depth = Math.max(0, state.depth - 1)
            push("Group", "groupEnd")
        },
        info: (...args) => {
            push("Info", format_args(args))
        },
        log: (...args) => {
            push("Log", format_args(args))
        },
        table: (tabular_data, properties) => {
            const columns =
                properties === undefined ? "all columns" : properties.join(", ")
            push("Table", `${columns} · ${format_value(tabular_data)}`)
        },
        time: (label) => {
            push("Timer", `${label ?? "default"}: started`)
        },
        timeEnd: (label) => {
            push("Timer", `${label ?? "default"}: ended`)
        },
        timeLog: (label, ...args) => {
            push("Timer", `${label ?? "default"}: ${format_args(args)}`)
        },
        trace: (...args) => {
            push("Trace", format_args(args))
        },
        warn: (...args) => {
            push("Warn", format_args(args))
        },
    }

    return { service, entries }
}

const levels_program = Effect.gen(function* () {
    yield* Console.log("request started", { id: 42 })
    yield* Console.info("cache", "hit")
    yield* Console.debug("flags", { beta: true })
    yield* Console.warn("slow response", 640)
    yield* Console.error("retry exhausted")
    yield* Console.assert(true, "this stays silent")
    yield* Console.assert(false, "user must be active")
})

const inspect_program = Effect.gen(function* () {
    const users = [
        { name: "Ada", role: "admin", active: true },
        { name: "Grace", role: "editor", active: true },
        { name: "Alan", role: "viewer", active: false },
    ]

    yield* Console.dir({
        user: "Ada",
        permissions: ["read", "write"],
    })
    yield* Console.table(users, ["name", "role"])
    yield* Console.dirxml('<user id="42">Ada</user>')
})

const counters_program = Effect.gen(function* () {
    yield* Console.count("cache-hit")
    yield* Console.count("cache-hit")
    yield* Console.count("cache-miss")
    yield* Console.countReset("cache-hit")
    yield* Console.count("cache-hit")
})

const scope_program = Effect.scoped(
    Effect.gen(function* () {
        yield* Console.group({ label: "load profile" })
        yield* Console.time("profile")
        yield* Console.log("fetch user")
        yield* Console.timeLog("profile", "cache miss")

        yield* Console.withGroup(Console.log("check permissions"), {
            label: "permissions",
            collapsed: true,
        })

        yield* Console.info("profile ready")
    })
)

const program_for_stage = (stage: Stage): Effect.Effect<void> => {
    if (stage === "Levels") {
        return levels_program
    }

    if (stage === "Inspect") {
        return inspect_program
    }

    if (stage === "Counters") {
        return counters_program
    }

    return scope_program
}

export const RunConsoleDemo = Command.define("RunConsoleDemo", {
    args: { stage: Stage },
    messages: [Message.CompletedRunConsoleDemo],
    execute: ({ stage }) =>
        Effect.gen(function* () {
            const capture = make_capture_console()

            yield* program_for_stage(stage).pipe(
                Effect.provideService(Console.Console, capture.service)
            )

            return Message.CompletedRunConsoleDemo({
                entries: capture.entries,
            })
        }),
})

// INIT

export const init: Model = Model.make({
    stage: "Levels",
    entries: [],
})

// UPDATE

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedConsoleStage: ({ stage }) => ({
            model: evo(model, {
                stage: () => stage,
                entries: () => [],
            }),
        }),
        ClickedRunConsoleDemo: () => ({
            model,
            commands: [RunConsoleDemo({ stage: model.stage })],
        }),
        ClickedClearConsoleOutput: () => ({
            model: evo(model, {
                entries: () => [],
            }),
        }),
        CompletedRunConsoleDemo: ({ entries }) => ({
            model: evo(model, {
                entries: () => entries,
            }),
        }),
    })

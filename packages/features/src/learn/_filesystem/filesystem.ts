import {
    ByteSize,
    Effect,
    Exit,
    FileSystem,
    Option,
    Schema as S,
    Stream,
} from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { evo } from "foldkit/struct"

// -----------------------------------------------------------------------------
// DETERMINISTIC TEST VALUES
// -----------------------------------------------------------------------------

const demo_info: FileSystem.File.Info = {
    type: "File",
    mtime: Option.none(),
    atime: Option.none(),
    birthtime: Option.none(),
    dev: 1,
    ino: Option.none(),
    mode: 0o644,
    nlink: Option.none(),
    uid: Option.none(),
    gid: Option.none(),
    rdev: Option.none(),
    size: ByteSize.bytes(18),
    blksize: Option.none(),
    blocks: Option.none(),
}

const make_demo_file = (): FileSystem.File => {
    const bytes = new TextEncoder().encode("hello from a handle")

    let cursor = 0n

    return {
        [FileSystem.FileTypeId]: FileSystem.FileTypeId,

        stat: Effect.succeed(demo_info),

        seek: (offset: bigint, from: FileSystem.SeekMode) =>
            Effect.sync(() => {
                cursor = from === "start" ? offset : cursor + offset

                return cursor
            }),

        sync: Effect.void,

        read: (buffer: Uint8Array) =>
            Effect.sync(() => {
                const start = Number(cursor)

                const available = bytes.subarray(start, start + buffer.length)

                buffer.set(available)

                cursor += BigInt(available.length)

                return available.length
            }),

        readAlloc: (size: number) =>
            Effect.sync(() => {
                const start = Number(cursor)

                if (start >= bytes.length) {
                    return Option.none<Uint8Array>()
                }

                const value = bytes.slice(start, start + size)

                cursor += BigInt(value.length)

                return Option.some(value)
            }),

        truncate: (_length?: number) => Effect.void,

        write: (buffer: Uint8Array) => Effect.succeed(buffer.length),

        writeAll: (_buffer: Uint8Array) => Effect.void,
    }
}

const watch_events: ReadonlyArray<FileSystem.WatchEvent> = [
    {
        _tag: "Create",
        path: "/demo/new.txt",
    },
    {
        _tag: "Update",
        path: "/demo/config.json",
    },
    {
        _tag: "Remove",
        path: "/demo/old.txt",
    },
]

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("ReadWrite"),
    S.Literal("Handles"),
    S.Literal("Streams"),
    S.Literal("Test"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "ReadWrite",
    "Handles",
    "Streams",
    "Test",
]

export const ReadWriteCase = S.Union([
    S.Literal("Config"),
    S.Literal("Directory"),
])
export type ReadWriteCase = typeof ReadWriteCase.Type

export const HandleCase = S.Union([
    S.Literal("Read"),
    S.Literal("Seek"),
    S.Literal("Flags"),
])
export type HandleCase = typeof HandleCase.Type

export const StreamCase = S.Union([S.Literal("Stream"), S.Literal("Watch")])
export type StreamCase = typeof StreamCase.Type

export const Model = S.Struct({
    stage: Stage,
    readWriteCase: ReadWriteCase,
    handleCase: HandleCase,
    streamCase: StreamCase,
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
    ReadWrite: {
        eyebrow: "portable service boundary",
        title: "File operations stay inside Effect and fail with PlatformError",
        description:
            "Programs access FileSystem from Context, not directly from Node or Bun. The service covers files, directories, metadata, links, permissions, temporary paths, and string / byte operations.",
        code: `const program =
    Effect.gen(function* () {
        const fs =
            yield* FileSystem.FileSystem

        const exists =
            yield* fs.exists(
                "/demo/config.json"
            )

        const content =
            yield* fs.readFileString(
                "/demo/config.json"
            )

        yield* fs.writeFileString(
            "/demo/output.txt",
            content
        )

        return exists
    })`,
        apis: [
            "FileSystem.FileSystem",
            "fs.exists",
            "fs.readFile",
            "fs.readFileString",
            "fs.writeFile",
            "fs.writeFileString",
            "fs.readDirectory",
            "fs.glob",
            "fs.stat",
            "fs.makeDirectory",
        ],
        notice: "The core module defines the service contract; a platform package supplies the real implementation. This demo uses makeNoop overrides so the teaching snapshots never touch the host file system.",
    },

    Handles: {
        eyebrow: "scoped low-level I/O",
        title: "open returns a scoped File handle with its own cursor",
        description:
            "File handles expose stat, seek, read, readAlloc, write, writeAll, truncate, and sync. OpenFlag selects POSIX-style access semantics, and isFile narrows unknown handles through FileTypeId.",
        code: `const file =
    yield* fs.open(
        "/demo/data.bin",
        { flag: "r+" }
    )

yield* file.seek(
    0n,
    "start"
)

const bytes =
    yield* file.readAlloc(5)

yield* file.writeAll(
    new TextEncoder()
        .encode("hello")
)

// file closes with Scope`,
        apis: [
            "FileSystem.File",
            "FileSystem.FileTypeId",
            "FileSystem.isFile",
            "FileSystem.OpenFlag",
            "FileSystem.SeekMode",
            "fs.open",
        ],
        notice: "FileSystem.open requires Scope so file-handle cleanup is structured. Seeking before the start is a BadArgument error on real implementations and leaves the cursor unchanged.",
    },

    Streams: {
        eyebrow: "incremental I/O + change feeds",
        title: "Large I/O is exposed as Stream, Sink, and watch events",
        description:
            "stream reads Uint8Array chunks, sink consumes Uint8Array chunks, and watch produces tagged Create / Update / Remove events. WatchBackend is the platform-specific registration service beneath watch.",
        code: `const chunks =
    yield* fs.stream(
        "/demo/data.bin",
        {
            chunkSize: 64 * 1024,
            offset: 0,
            bytesToRead: 128 * 1024
        }
    ).pipe(
        Stream.runCollect
    )

const changes =
    yield* fs.watch(
        "/demo",
        { recursive: true }
    ).pipe(
        Stream.runCollect
    )`,
        apis: [
            "fs.stream",
            "fs.sink",
            "fs.watch",
            "FileSystem.WatchEvent",
            "FileSystem.WatchOptions",
            "FileSystem.WatchBackend",
        ],
        notice: "stream defaults to 64 KiB chunks in the derived implementation. watch reports path-tagged events; concrete watch behavior comes from the platform's WatchBackend.",
    },

    Test: {
        eyebrow: "build + test implementations",
        title: "make derives conveniences; makeNoop makes focused tests cheap",
        description:
            "make builds a service from lower-level operations and derives exists, string read/write, stream, and sink. makeNoop starts from safe test defaults and accepts only the overrides a test needs; layerNoop wraps that stub in a Layer.",
        code: `const testFs =
    FileSystem.makeNoop({
        exists: (path: string) =>
            Effect.succeed(
                path === "config.json"
            ),

        readFileString: (
            _path: string
        ) =>
            Effect.succeed(
                "mocked"
            )
    })

const TestLayer =
    FileSystem.layerNoop({
        readFileString: (
            _path: string
        ) =>
            Effect.succeed(
                "layered"
            )
    })`,
        apis: [
            "FileSystem.make",
            "FileSystem.makeNoop",
            "FileSystem.layerNoop",
        ],
        notice: "A bare makeNoop reports exists = false, remove succeeds, many ordinary operations fail with PlatformError NotFound, and temp-path operations defect as not implemented.",
    },
}

// -----------------------------------------------------------------------------
// READ / WRITE SNAPSHOT
// -----------------------------------------------------------------------------

export type ReadWriteSnapshot = Readonly<{
    mode: ReadWriteCase
    exists: boolean
    content: string
    writes: string
    directoryEntries: string
    globMatches: string
    statType: string
    statMode: string
    serviceProvided: boolean
}>

export const read_write_snapshot = (model: Model): ReadWriteSnapshot => {
    const writes: Array<string> = []

    const testFs = FileSystem.makeNoop({
        exists: (path: string) => Effect.succeed(path === "/demo/config.json"),

        readFileString: (path: string) =>
            Effect.succeed(
                path === "/demo/config.json" ? '{"env":"test"}' : ""
            ),

        writeFileString: (path: string, data: string) =>
            Effect.sync(() => {
                writes.push(`${path} ← ${data}`)
            }),

        readDirectory: (_path: string) =>
            Effect.succeed(["config.json", "notes.txt", "src"]),

        glob: (_pattern: string) =>
            Effect.succeed(["src/app.ts", "src/lib.ts"]),

        stat: (_path: string) => Effect.succeed(demo_info),

        makeDirectory: (_path: string) => Effect.void,
    })

    const program = Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        const exists = yield* fs.exists("/demo/config.json")

        const content = yield* fs.readFileString("/demo/config.json")

        yield* fs.writeFileString("/demo/output.txt", content)

        const directoryEntries = yield* fs.readDirectory("/demo")

        const globMatches = yield* fs.glob("**/*.ts", {
            root: "/demo",
        })

        const info = yield* fs.stat("/demo/config.json")

        if (model.readWriteCase === "Directory") {
            yield* fs.makeDirectory("/demo/cache", {
                recursive: true,
            })
        }

        return {
            exists,
            content,
            directoryEntries,
            globMatches,
            info,
        }
    }).pipe(Effect.provideService(FileSystem.FileSystem, testFs))

    const result = Effect.runSync(program)

    return {
        mode: model.readWriteCase,
        exists: result.exists,
        content: result.content,
        writes: writes.join("\n"),
        directoryEntries: result.directoryEntries.join(", "),
        globMatches: result.globMatches.join(", "),
        statType: result.info.type,
        statMode: result.info.mode.toString(8),
        serviceProvided: true,
    }
}

// -----------------------------------------------------------------------------
// HANDLE SNAPSHOT
// -----------------------------------------------------------------------------

const open_flags: ReadonlyArray<FileSystem.OpenFlag> = [
    "r",
    "r+",
    "w",
    "wx",
    "w+",
    "wx+",
    "a",
    "ax",
    "a+",
    "ax+",
]

export type HandleSnapshot = Readonly<{
    mode: HandleCase
    isFile: boolean
    typeId: string
    statType: string
    statMode: string
    firstRead: string
    cursorAfterSeek: string
    secondRead: string
    openFlags: string
    seekModes: string
}>

const option_bytes = (option: Option.Option<Uint8Array>): string =>
    Option.match(option, {
        onNone: () => "None",
        onSome: (bytes: Uint8Array) => new TextDecoder().decode(bytes),
    })

export const handle_snapshot = (model: Model): HandleSnapshot => {
    const file = make_demo_file()

    const firstRead = Effect.runSync(file.readAlloc(5))

    const cursorAfterSeek = Effect.runSync(file.seek(6n, "start"))

    const secondRead = Effect.runSync(file.readAlloc(4))

    const info = Effect.runSync(file.stat)

    if (model.handleCase === "Read") {
        Effect.runSync(file.writeAll(new TextEncoder().encode("written")))
    }

    return {
        mode: model.handleCase,
        isFile: FileSystem.isFile(file),
        typeId: FileSystem.FileTypeId,
        statType: info.type,
        statMode: info.mode.toString(8),
        firstRead: option_bytes(firstRead),
        cursorAfterSeek: cursorAfterSeek.toString(),
        secondRead: option_bytes(secondRead),
        openFlags: open_flags.join(" "),
        seekModes: "start · current",
    }
}

// -----------------------------------------------------------------------------
// STREAM / WATCH SNAPSHOT
// -----------------------------------------------------------------------------

export type StreamSnapshot = Readonly<{
    mode: StreamCase
    streamChunkCount: number
    streamBytes: string
    watchCount: number
    watchEvents: string
    recursive: boolean
    sinkRole: string
    backendRole: string
}>

export const stream_snapshot = (model: Model): StreamSnapshot => {
    const testFs = FileSystem.makeNoop({
        stream: (_path: string) =>
            Stream.fromIterable([
                Uint8Array.from([1, 2, 3]),
                Uint8Array.from([4, 5]),
            ]),

        watch: (_path: string, _options?: FileSystem.WatchOptions) =>
            Stream.fromIterable(watch_events),
    })

    const program = Effect.gen(function* () {
        const chunks = yield* Stream.runCollect(testFs.stream("/demo/data.bin"))

        const events = yield* Stream.runCollect(
            testFs.watch("/demo", {
                recursive: true,
            })
        )

        return {
            chunks,
            events,
        }
    })

    const result = Effect.runSync(program)

    return {
        mode: model.streamCase,
        streamChunkCount: result.chunks.length,
        streamBytes: result.chunks
            .flatMap((chunk: Uint8Array) => Array.from(chunk))
            .join(", "),
        watchCount: result.events.length,
        watchEvents: result.events
            .map(
                (event: FileSystem.WatchEvent) => `${event._tag}:${event.path}`
            )
            .join("\n"),
        recursive: true,
        sinkRole: "Sink<void, Uint8Array, …>",
        backendRole: "platform watch registration",
    }
}

// -----------------------------------------------------------------------------
// TEST SNAPSHOT
// -----------------------------------------------------------------------------

export type TestSnapshot = Readonly<{
    bareExists: boolean
    bareRemove: string
    bareRead: string
    overriddenRead: string
    layeredRead: string
    derivedByMake: string
}>

export const test_snapshot = (): TestSnapshot => {
    const bare = FileSystem.makeNoop({})

    const bareExists = Effect.runSync(bare.exists("missing.txt"))

    const bareRemove = Effect.runSync(
        Effect.exit(bare.remove("missing.txt"))
    )._tag

    const bareRead = Effect.runSync(
        Effect.exit(bare.readFileString("missing.txt"))
    )._tag

    const overridden = FileSystem.makeNoop({
        readFileString: (_path: string) => Effect.succeed("mocked"),
    })

    const overriddenRead = Effect.runSync(
        overridden.readFileString("anything.txt")
    )

    const layeredRead = Effect.runSync(
        Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem

            return yield* fs.readFileString("anything.txt")
        }).pipe(
            Effect.provide(
                FileSystem.layerNoop({
                    readFileString: (_path: string) =>
                        Effect.succeed("layered"),
                })
            )
        )
    )

    return {
        bareExists,
        bareRemove,
        bareRead,
        overriddenRead,
        layeredRead,
        derivedByMake:
            "exists · readFileString · writeFileString · stream · sink",
    }
}

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedFileSystemStage: {
        stage: Stage,
    },
    SelectedFileSystemReadWriteCase: {
        readWriteCase: ReadWriteCase,
    },
    SelectedFileSystemHandleCase: {
        handleCase: HandleCase,
    },
    SelectedFileSystemStreamCase: {
        streamCase: StreamCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "ReadWrite",
    readWriteCase: "Config",
    handleCase: "Read",
    streamCase: "Stream",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type ReadWriteCasePayload = Readonly<{
    readWriteCase: ReadWriteCase
}>

type HandleCasePayload = Readonly<{
    handleCase: HandleCase
}>

type StreamCasePayload = Readonly<{
    streamCase: StreamCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedFileSystemStage: ({ stage }: StagePayload) => ({
            model: evo(model, {
                stage: () => stage,
            }),
        }),

        SelectedFileSystemReadWriteCase: ({
            readWriteCase,
        }: ReadWriteCasePayload) => ({
            model: evo(model, {
                readWriteCase: () => readWriteCase,
            }),
        }),

        SelectedFileSystemHandleCase: ({ handleCase }: HandleCasePayload) => ({
            model: evo(model, {
                handleCase: () => handleCase,
            }),
        }),

        SelectedFileSystemStreamCase: ({ streamCase }: StreamCasePayload) => ({
            model: evo(model, {
                streamCase: () => streamCase,
            }),
        }),
    })

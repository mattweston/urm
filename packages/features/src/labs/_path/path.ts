import { Effect, Path, Schema as S } from "effect"
import type { Update } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { modifyFields } from "foldkit/struct"

// -----------------------------------------------------------------------------
// REAL EFFECT PROGRAMS
// -----------------------------------------------------------------------------

export const basic_path_program = Effect.gen(function* () {
    const path = yield* Path.Path

    return {
        separator: path.sep,
        joined: path.join("tmp", "reports", "daily.csv"),
        normalized: path.normalize("./tmp/../reports/./daily.csv"),
        absolute: path.isAbsolute("/tmp/reports"),
        basename: path.basename("/tmp/reports/daily.csv"),
        dirname: path.dirname("/tmp/reports/daily.csv"),
        extension: path.extname("/tmp/reports/daily.csv"),
    } as const
})

export const parse_format_program = Effect.gen(function* () {
    const path = yield* Path.Path

    const parsed: Path.Path.Parsed = path.parse("/srv/app/config.json")

    const formatted = path.format({
        dir: "/srv/app",
        name: "settings",
        ext: ".json",
    })

    return {
        parsed,
        formatted,
    } as const
})

export const relative_resolve_program = Effect.gen(function* () {
    const path = yield* Path.Path

    return {
        relative: path.relative("/srv/app/src", "/srv/app/test/unit"),
        resolved: path.resolve("/srv/app", "src", "../test"),
    } as const
})

export const url_program = Effect.gen(function* () {
    const path = yield* Path.Path

    const fileUrl = yield* path.toFileUrl("/tmp/report 1.txt")

    const roundTrip = yield* path.fromFileUrl(fileUrl)

    return {
        fileUrl: fileUrl.href,
        roundTrip,
    } as const
})

export const bad_url_program = Effect.gen(function* () {
    const path = yield* Path.Path

    return yield* Effect.result(
        path.fromFileUrl(new URL("https://example.com/file.txt"))
    )
})

export const run_with_posix_layer = Effect.provide(
    basic_path_program,
    Path.layer
)

// -----------------------------------------------------------------------------
// MODEL
// -----------------------------------------------------------------------------

export const Stage = S.Union([
    S.Literal("Service"),
    S.Literal("Compose"),
    S.Literal("Parse"),
    S.Literal("Urls"),
])
export type Stage = typeof Stage.Type

export const stages: ReadonlyArray<Stage> = [
    "Service",
    "Compose",
    "Parse",
    "Urls",
]

export const ServiceCase = S.Union([
    S.Literal("Tag"),
    S.Literal("Layer"),
    S.Literal("Surface"),
])
export type ServiceCase = typeof ServiceCase.Type

export const ComposeCase = S.Union([
    S.Literal("Join"),
    S.Literal("Normalize"),
    S.Literal("Relative"),
])
export type ComposeCase = typeof ComposeCase.Type

export const ParseCase = S.Union([
    S.Literal("Pieces"),
    S.Literal("Format"),
    S.Literal("Names"),
])
export type ParseCase = typeof ParseCase.Type

export const UrlsCase = S.Union([
    S.Literal("ToFileUrl"),
    S.Literal("FromFileUrl"),
    S.Literal("Failure"),
])
export type UrlsCase = typeof UrlsCase.Type

export const Model = S.Struct({
    stage: Stage,
    serviceCase: ServiceCase,
    composeCase: ComposeCase,
    parseCase: ParseCase,
    urlsCase: UrlsCase,
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
        eyebrow: "platform-independent path operations",
        title: "Depend on the Path service, then choose the concrete implementation at the application boundary",
        description:
            "Path.Path is an Effect service for path manipulation. The interface exposes synchronous string operations plus Effect-based file-URL conversion. Path.layer provides the built-in POSIX implementation with '/' as its separator.",
        code: `const program =
    Effect.gen(
        function* () {
            const path =
                yield* Path.Path

            return path.join(
                "tmp",
                "file.txt"
            )
        }
    )

Effect.runSync(
    Effect.provide(
        program,
        Path.layer
    )
)
// "tmp/file.txt"`,
        apis: ["Path.TypeId", "Path.Path", "Path.Path.Parsed", "Path.layer"],
        notice: "Path.Path is the abstract service; Path.layer is the bundled POSIX implementation. Platform packages can instead provide their own service layer when host-specific path semantics are required.",
    },

    Compose: {
        eyebrow: "join, normalize, resolve, relate",
        title: "Compose path segments without binding application logic to a host path module",
        description:
            "join combines segments and normalizes the result. normalize resolves dot segments. relative computes the route from one path to another, while resolve builds an absolute path from right-to-left segments and the current working directory when needed.",
        code: `path.join(
    "tmp",
    "reports",
    "daily.csv"
)
// "tmp/reports/daily.csv"

path.normalize(
    "./tmp/../reports/./daily.csv"
)
// "reports/daily.csv"

path.relative(
    "/srv/app/src",
    "/srv/app/test/unit"
)
// "../test/unit"

path.resolve(
    "/srv/app",
    "src",
    "../test"
)
// "/srv/app/test"`,
        apis: [
            "Path.Path.join",
            "Path.Path.normalize",
            "Path.Path.relative",
            "Path.Path.resolve",
            "Path.Path.isAbsolute",
            "Path.Path.sep",
        ],
        notice: "The built-in layer follows POSIX rules. resolve may consult process.cwd() only when the supplied segments do not already resolve to an absolute path.",
    },

    Parse: {
        eyebrow: "inspect and rebuild path structure",
        title: "Read filename pieces with basename / dirname / extname or work with the full Parsed shape",
        description:
            "parse returns root, dir, base, ext, and name. format rebuilds a path from a partial Parsed object. basename can optionally strip a suffix, while dirname and extname expose the most common pieces directly.",
        code: `const parsed =
    path.parse(
        "/srv/app/config.json"
    )

// {
//   root: "/",
//   dir: "/srv/app",
//   base: "config.json",
//   ext: ".json",
//   name: "config"
// }

path.format({
    dir:
        "/srv/app",
    name:
        "settings",
    ext:
        ".json"
})
// "/srv/app/settings.json"

path.basename(
    "/srv/app/config.json",
    ".json"
)
// "config"`,
        apis: [
            "Path.Path.parse",
            "Path.Path.Parsed",
            "Path.Path.format",
            "Path.Path.basename",
            "Path.Path.dirname",
            "Path.Path.extname",
            "Path.Path.toNamespacedPath",
        ],
        notice: "format prefers dir over root, and base over name + ext when those fields are supplied. The POSIX built-in toNamespacedPath is an identity operation.",
    },

    Urls: {
        eyebrow: "file path ↔ file URL",
        title: "Convert between paths and file URLs while preserving invalid-input failures in Effect",
        description:
            "toFileUrl and fromFileUrl are Effect-returning methods. The built-in converter percent-encodes path characters for file URLs. fromFileUrl rejects non-file schemes, non-empty hosts, and encoded slash characters with PlatformError.BadArgument.",
        code: `const url =
    yield* path.toFileUrl(
        "/tmp/report 1.txt"
    )

url.href
// "file:///tmp/report%201.txt"

yield* path.fromFileUrl(
    url
)
// "/tmp/report 1.txt"

yield* Effect.result(
    path.fromFileUrl(
        new URL(
            "https://example.com/a"
        )
    )
)
// Failure(BadArgument)`,
        apis: [
            "Path.Path.toFileUrl",
            "Path.Path.fromFileUrl",
            "PlatformError.BadArgument",
        ],
        notice: "URL conversion is Effect-based because malformed / unsupported file URLs can fail. Ordinary string operations such as join, parse, or normalize remain synchronous methods on the service.",
    },
}

// -----------------------------------------------------------------------------
// SNAPSHOTS
// -----------------------------------------------------------------------------

export type ServiceSnapshot = Readonly<{
    mode: ServiceCase
    typeId: string
    serviceKey: string
    separator: string
    layer: string
    syncOps: string
    effectOps: string
}>

export const service_snapshot = (model: Model): ServiceSnapshot => ({
    mode: model.serviceCase,
    typeId: Path.TypeId,
    serviceKey: "effect/Path",
    separator: 'Path.layer → "/"',
    layer: "Layer<Path> · built-in POSIX semantics",
    syncOps:
        "basename · dirname · extname · format · isAbsolute · join · normalize · parse · relative · resolve · toNamespacedPath",
    effectOps: "fromFileUrl · toFileUrl",
})

export type ComposeSnapshot = Readonly<{
    mode: ComposeCase
    join: string
    normalize: string
    relative: string
    resolve: string
    absoluteYes: boolean
    absoluteNo: boolean
    separator: string
}>

export const compose_snapshot = (model: Model): ComposeSnapshot => ({
    mode: model.composeCase,
    join: "tmp/reports/daily.csv",
    normalize: "reports/daily.csv",
    relative: "../test/unit",
    resolve: "/srv/app/test",
    absoluteYes: true,
    absoluteNo: false,
    separator: "/",
})

export type ParseSnapshot = Readonly<{
    mode: ParseCase
    root: string
    dir: string
    base: string
    ext: string
    name: string
    formatted: string
    basenameWithoutSuffix: string
    namespaced: string
}>

export const parse_snapshot = (model: Model): ParseSnapshot => ({
    mode: model.parseCase,
    root: "/",
    dir: "/srv/app",
    base: "config.json",
    ext: ".json",
    name: "config",
    formatted: "/srv/app/settings.json",
    basenameWithoutSuffix: "config",
    namespaced: "POSIX layer: unchanged",
})

export type UrlsSnapshot = Readonly<{
    mode: UrlsCase
    path: string
    fileUrl: string
    roundTrip: string
    invalidScheme: string
    invalidHost: string
    encodedSlash: string
}>

export const urls_snapshot = (model: Model): UrlsSnapshot => ({
    mode: model.urlsCase,
    path: "/tmp/report 1.txt",
    fileUrl: "file:///tmp/report%201.txt",
    roundTrip: "/tmp/report 1.txt",
    invalidScheme: "https: → BadArgument",
    invalidHost: "file://host/... → BadArgument",
    encodedSlash: "%2F in pathname → BadArgument",
})

// -----------------------------------------------------------------------------
// MESSAGE
// -----------------------------------------------------------------------------

export const Message = defineMessageUnion({
    SelectedPathStage: {
        stage: Stage,
    },
    SelectedPathServiceCase: {
        serviceCase: ServiceCase,
    },
    SelectedPathComposeCase: {
        composeCase: ComposeCase,
    },
    SelectedPathParseCase: {
        parseCase: ParseCase,
    },
    SelectedPathUrlsCase: {
        urlsCase: UrlsCase,
    },
})
export type Message = typeof Message.Type

export const init: Model = Model.make({
    stage: "Service",
    serviceCase: "Tag",
    composeCase: "Join",
    parseCase: "Pieces",
    urlsCase: "ToFileUrl",
})

type StagePayload = Readonly<{
    stage: Stage
}>

type ServiceCasePayload = Readonly<{
    serviceCase: ServiceCase
}>

type ComposeCasePayload = Readonly<{
    composeCase: ComposeCase
}>

type ParseCasePayload = Readonly<{
    parseCase: ParseCase
}>

type UrlsCasePayload = Readonly<{
    urlsCase: UrlsCase
}>

export const update = (model: Model, message: Message) =>
    Message.match<Update.Return<Model, Message>>(message, {
        SelectedPathStage: ({ stage }: StagePayload) => ({
            model: modifyFields(model, {
                stage: () => stage,
            }),
        }),

        SelectedPathServiceCase: ({ serviceCase }: ServiceCasePayload) => ({
            model: modifyFields(model, {
                serviceCase: () => serviceCase,
            }),
        }),

        SelectedPathComposeCase: ({ composeCase }: ComposeCasePayload) => ({
            model: modifyFields(model, {
                composeCase: () => composeCase,
            }),
        }),

        SelectedPathParseCase: ({ parseCase }: ParseCasePayload) => ({
            model: modifyFields(model, {
                parseCase: () => parseCase,
            }),
        }),

        SelectedPathUrlsCase: ({ urlsCase }: UrlsCasePayload) => ({
            model: modifyFields(model, {
                urlsCase: () => urlsCase,
            }),
        }),
    })

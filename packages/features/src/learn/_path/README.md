# Path

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/Path

The current Effect source package is `4.0.0-rc.116`.

The current `packages/effect/src/Path.ts` teaching surface is compact at the
export level:

- `TypeId`
- `Path` service interface
- `Path.Parsed`
- `Path` service tag
- `layer`

The service itself exposes the real working API:

```text
sep
basename
dirname
extname
format
fromFileUrl
isAbsolute
join
normalize
parse
relative
resolve
toFileUrl
toNamespacedPath
```

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `path.ts` — real Path service programs for joining, normalization, parsing,
  resolving, file-URL conversion, and typed failure.
- `path.view.ts` — interactive visual demo.
- `path-preview.png` — static preview of the default Service stage.

## Intended location

```text
packages/features/src/learn/path/
├── path.ts
└── path.view.ts
```

No parent router/model/message/update files are modified.

## Core idea

`Path` is an Effect service rather than a direct import of a host-specific path
module.

Application logic asks for:

```ts
const path =
    yield* Path.Path
```

and then uses the service:

```ts
path.join(...)
path.normalize(...)
path.parse(...)
```

The concrete implementation is supplied separately.

That allows the same Effect code to depend on path behavior without hard-coding:

```text
node:path
Bun path helpers
browser-specific assumptions
```

## 1. Service

### `Path.Path`

The service interface is:

```ts
interface Path {
    readonly [TypeId]:
        typeof TypeId

    readonly sep:
        string

    readonly basename:
        (
            path: string,
            suffix?: string
        ) => string

    readonly dirname:
        (
            path: string
        ) => string

    readonly extname:
        (
            path: string
        ) => string

    readonly format:
        (
            pathObject:
                Partial<
                    Path.Parsed
                >
        ) => string

    readonly fromFileUrl:
        (
            url: URL
        ) =>
            Effect.Effect<
                string,
                BadArgument
            >

    readonly isAbsolute:
        (
            path: string
        ) => boolean

    readonly join:
        (
            ...paths:
                ReadonlyArray<
                    string
                >
        ) => string

    readonly normalize:
        (
            path: string
        ) => string

    readonly parse:
        (
            path: string
        ) =>
            Path.Parsed

    readonly relative:
        (
            from: string,
            to: string
        ) => string

    readonly resolve:
        (
            ...segments:
                ReadonlyArray<
                    string
                >
        ) => string

    readonly toFileUrl:
        (
            path: string
        ) =>
            Effect.Effect<
                URL,
                BadArgument
            >

    readonly toNamespacedPath:
        (
            path: string
        ) => string
}
```

The ordinary string operations are synchronous.

Only file-URL conversion is Effect-based because invalid input can fail with:

```text
PlatformError.BadArgument
```

## `TypeId`

The runtime marker is:

```text
~effect/Path
```

Most application code does not need to inspect this marker directly.

## Service tag

The exported service tag is:

```ts
Path.Path
```

Its key is:

```text
effect/Path
```

A program accesses it with:

```ts
const program =
    Effect.gen(function* () {
        const path =
            yield* Path.Path

        return path.join(
            "tmp",
            "file.txt"
        )
    })
```

## `layer`

```ts
Path.layer
```

provides the bundled Path implementation.

The current source explicitly implements this layer with **POSIX path
semantics**.

That means:

```text
separator = "/"
```

and the default algorithms behave like POSIX paths.

Example:

```ts
Effect.runSync(
    Effect.provide(
        program,
        Path.layer
    )
)
```

can run a program that requires the Path service.

## Abstract service versus POSIX layer

Keep these concepts separate:

```text
Path.Path
    abstract service contract

Path.layer
    bundled POSIX implementation
```

This matters in a platform-aware application.

The Path service lets application code stay abstract, while a platform package
can provide its own service implementation when the host needs different path
semantics.

## 2. Compose

### `join`

```ts
path.join(
    "tmp",
    "reports",
    "daily.csv"
)
```

with the built-in POSIX layer yields:

```text
tmp/reports/daily.csv
```

The implementation joins non-empty segments and normalizes the result.

Calling `join()` with no segments returns:

```text
.
```

## `normalize`

```ts
path.normalize(
    "./tmp/../reports/./daily.csv"
)
```

becomes:

```text
reports/daily.csv
```

The implementation resolves:

```text
.
..
duplicate separators
```

according to POSIX rules.

Trailing separators are preserved where applicable.

## `isAbsolute`

```ts
path.isAbsolute(
    "/srv/app"
)
// true

path.isAbsolute(
    "srv/app"
)
// false
```

For the built-in layer, a leading `/` marks an absolute path.

## `relative`

```ts
path.relative(
    "/srv/app/src",
    "/srv/app/test/unit"
)
```

produces:

```text
../test/unit
```

The implementation first resolves both inputs, finds their common path prefix,
then emits the required `..` segments plus the unmatched destination suffix.

## `resolve`

```ts
path.resolve(
    "/srv/app",
    "src",
    "../test"
)
```

produces:

```text
/srv/app/test
```

The algorithm processes path segments from right to left until an absolute
segment is found.

### Current working directory

When the supplied segments do not already resolve to an absolute path, the
built-in implementation can consult:

```text
process.cwd()
```

when a Node-like `globalThis.process` is available.

This is one reason `resolve` can depend on runtime environment even though it is
a synchronous service method.

## `sep`

The built-in layer exposes:

```text
/
```

through:

```ts
path.sep
```

Code using the abstract service should read this property rather than hard-code
a separator when the separator itself matters.

## 3. Parse

### `parse`

```ts
const parsed =
    path.parse(
        "/srv/app/config.json"
    )
```

produces a `Path.Parsed` value containing:

```text
root
dir
base
ext
name
```

For this path:

```text
root = "/"
dir  = "/srv/app"
base = "config.json"
ext  = ".json"
name = "config"
```

## `Path.Parsed`

The model is:

```ts
interface Parsed {
    readonly root:
        string
    readonly dir:
        string
    readonly base:
        string
    readonly ext:
        string
    readonly name:
        string
}
```

It is the shape returned by `parse` and accepted partially by `format`.

## `format`

```ts
path.format({
    dir:
        "/srv/app",
    name:
        "settings",
    ext:
        ".json"
})
```

produces:

```text
/srv/app/settings.json
```

### Field precedence

The current formatter uses:

```text
dir
    before root

base
    before name + ext
```

Conceptually:

```text
dir =
    pathObject.dir
    || pathObject.root

base =
    pathObject.base
    || name + ext
```

This is useful to know when several fields are supplied together.

## `basename`

```ts
path.basename(
    "/srv/app/config.json"
)
// "config.json"
```

An optional suffix can be removed:

```ts
path.basename(
    "/srv/app/config.json",
    ".json"
)
// "config"
```

The suffix must actually match the end of the basename.

## `dirname`

```ts
path.dirname(
    "/srv/app/config.json"
)
// "/srv/app"
```

It returns the directory portion.

## `extname`

```ts
path.extname(
    "/srv/app/config.json"
)
// ".json"
```

The implementation follows Node-style POSIX extension edge cases, including
special treatment for dotfiles and `..`.

## `toNamespacedPath`

The built-in POSIX implementation is:

```text
identity
```

so:

```ts
path.toNamespacedPath(
    "/srv/app"
)
```

returns the same string.

This method exists on the abstract interface because other path
implementations—especially Windows-oriented ones—may have meaningful namespaced
path behavior.

## 4. URLs

### `toFileUrl`

```ts
const url =
    yield* path.toFileUrl(
        "/tmp/report 1.txt"
    )
```

produces a file URL equivalent to:

```text
file:///tmp/report%201.txt
```

The built-in implementation:

1. resolves the path,
2. preserves a trailing slash when needed,
3. percent-encodes special path characters,
4. returns the `URL` inside Effect.

Characters explicitly encoded by the current source include:

```text
%
backslash
newline
carriage return
tab
```

The URL machinery handles spaces through URL pathname encoding.

## `fromFileUrl`

```ts
yield* path.fromFileUrl(
    new URL(
        "file:///tmp/report%201.txt"
    )
)
```

returns:

```text
/tmp/report 1.txt
```

The pathname is URI-decoded before being returned.

## Invalid scheme

A non-file URL fails:

```ts
path.fromFileUrl(
    new URL(
        "https://example.com/a"
    )
)
```

with:

```text
PlatformError.BadArgument
```

The failure description indicates that the URL must use the `file:` scheme.

## Invalid host

The POSIX implementation also rejects a file URL with a non-empty hostname.

Conceptually:

```text
file://host/path
```

is rejected with `BadArgument`.

## Encoded slash

The implementation rejects encoded `/` characters inside the pathname.

That means:

```text
%2F
```

or its case-insensitive equivalent is not accepted as part of a file URL
pathname.

This prevents encoded path separators from being smuggled through URL decoding.

## Why URL conversion is an Effect

Most Path methods are pure string transformations.

URL conversion has a typed error channel because the input may violate the
service's file-URL rules.

Therefore:

```text
join / parse / normalize
    synchronous result

fromFileUrl / toFileUrl
    Effect result
```

The latter can be composed naturally with other Effect workflows.

## `Effect.result` for teaching failures

The demo includes:

```ts
yield* Effect.result(
    path.fromFileUrl(
        new URL(
            "https://example.com/file.txt"
        )
    )
)
```

so the failure is converted into a `Result` value for inspection rather than
short-circuiting the whole example.

## Path and FileSystem

The two services solve different problems.

### Path

```text
pure path manipulation
path parsing
joining
relative / absolute logic
file URL conversion
```

### FileSystem

```text
read files
write files
list directories
stat
rename
remove
stream
```

A realistic application often uses both:

```ts
const path =
    yield* Path.Path

const fs =
    yield* FileSystem.FileSystem
```

Path constructs / interprets the path strings.

FileSystem performs I/O at those paths.

## Path in Foldkit

The Path service belongs in Effect-driven runtime or command logic rather than
inside the pure Foldkit view.

A typical split is:

```text
Foldkit Model / Message / update
    describes user intent

Effect command / runtime layer
    accesses Path.Path
    composes platform-aware path strings
    interacts with FileSystem if needed

Foldkit receives the result
    updates visible Model
```

For purely presentational string joining that has no platform implications,
ordinary string logic may be sufficient.

Use the Path service when the operation should respect the application's path
implementation.

## Built-in layer and platform packages

The Effect platform documentation shows two common approaches:

```text
Path.layer
    bundled POSIX implementation

NodeServices.layer / BunServices.layer
    platform service bundles
```

The service abstraction allows the same program to run under either kind of
provider.

This is especially useful for libraries that should not import a concrete host
path module directly.

## Public teaching surface

### Runtime marker

- `TypeId`

### Model

- `Path` interface
- `Path.Parsed`

### Service

- `Path` service tag

### Layer

- `layer`

The real behavioral surface lives on the `Path` service methods rather than as
many separate top-level functions.

## Type discipline

The generated demo has no explicit `any` annotations.

Every custom callback, Foldkit Message payload, and UI callback that could lose
contextual typing is explicitly typed where needed.

Button attributes are derived from `HtmlBuilder`.

The upstream Effect implementation itself uses an internal generic `any` when
probing `globalThis.process` in the POSIX resolver; that is separate from the
generated artifact constraint.

## Validation note

The standalone validation command is:

```text
tsc --noEmit --noResolve --allowImportingTsExtensions
    --target ES2022
    --module ESNext
    --moduleResolution bundler
    --skipLibCheck
    --noImplicitAny
```

In this environment the actual `effect`, `foldkit`, and UI packages are not
resolved, so this check catches local syntax and implicit-any issues rather than
replacing a full typecheck inside the target monorepo.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/learn/*` demos:

1. add the child Model to the parent learn Model,
2. add `PathDemo.Message` to the parent Message union,
3. initialize `PathDemo.init`,
4. delegate child messages to `PathDemo.update`,
5. render `PathDemo.view(...)` from the Path route.

This artifact intentionally performs none of those edits.

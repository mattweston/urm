# FileSystem

Standalone teaching demo for:

https://effect.website/docs/v4/api/effect/FileSystem

The current API page is Effect `4.0.0-rc.115` and reports 15 exports. The
implementation was also checked against the current
`packages/effect/src/FileSystem.ts`.

The generated TypeScript contains no explicit `any` annotations. Destructured
Foldkit message payloads are explicitly typed for `noImplicitAny`, and the view
derives Button callback attribute types from `HtmlBuilder`.

## Files

- `file-system.ts` — deterministic FileSystem service, file-handle, Stream, watch,
  and testing examples.
- `file-system.view.ts` — interactive visual demo.
- `file-system-preview.png` — static preview of the default ReadWrite stage.

## Intended location

```text
packages/features/src/labs/file-system/
├── file-system.ts
└── file-system.view.ts
```

No parent router/model/message/update files are modified.

## Teaching stages

### 1. ReadWrite

Uses `FileSystem.FileSystem` as an Effect service rather than touching the host
runtime directly.

The demo provides a deterministic `makeNoop` implementation and runs:

```ts
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
```

It also shows:

- `readDirectory`
- `glob`
- `stat`
- `makeDirectory`

The real FileSystem interface additionally covers copying, permissions, links,
temporary paths, renaming, removal, truncation, timestamps, and raw byte I/O.

Ordinary FileSystem effects fail with `PlatformError`.

The platform-specific package is responsible for providing the concrete
service. The teaching demo intentionally uses a stub so it never changes the
machine's file system.

### 2. Handles

Covers the open file-handle model:

```ts
FileSystem.File
FileSystem.FileTypeId
FileSystem.isFile
FileSystem.OpenFlag
FileSystem.SeekMode
```

A handle exposes:

```text
stat
seek
sync
read
readAlloc
truncate
write
writeAll
```

A real:

```ts
fs.open(path, options)
```

requires `Scope`, so the handle is automatically closed with structured
resource lifetime.

The demo uses a deterministic in-memory File-shaped value and shows cursor
movement:

```text
readAlloc(5)   -> "hello"
seek(6,start)  -> cursor 6
readAlloc(4)   -> "from"
```

The supported open flags are:

```text
r   r+
w   wx   w+   wx+
a   ax   a+   ax+
```

and seek modes are:

```text
start
current
```

### 3. Streams

The FileSystem boundary models large / incremental I/O using Effect streaming
types.

Reading:

```ts
fs.stream(path, {
    offset,
    bytesToRead,
    chunkSize
})
```

returns:

```text
Stream<Uint8Array, PlatformError>
```

Writing:

```ts
fs.sink(path)
```

returns a Sink that consumes `Uint8Array`.

The implementation derived by `FileSystem.make` uses a default stream chunk
size of 64 KiB.

Watching:

```ts
fs.watch(
    path,
    { recursive: true }
)
```

returns a Stream of:

```ts
FileSystem.WatchEvent
```

with tagged cases:

```text
Create
Update
Remove
```

Each event carries a path.

`FileSystem.WatchBackend` is the lower-level platform watch-registration
service used to implement this capability.

### 4. Test

Shows the distinction between the three construction helpers.

#### `FileSystem.make`

Used by a platform implementation.

It accepts lower-level operations and derives:

```text
exists
readFileString
writeFileString
stream
sink
```

from those primitives.

#### `FileSystem.makeNoop`

Used for focused testing.

A bare no-op implementation has deliberately simple defaults:

```text
exists -> false
remove -> succeeds
many file operations -> PlatformError NotFound
temp file / directory creation -> defect "not implemented"
```

Tests then override only what they need.

#### `FileSystem.layerNoop`

Wraps `makeNoop` in a Layer, allowing the test service to be provided with
ordinary Effect Layer composition.

## Current public surface

### Constructors

- `make`
- `makeNoop`

### Guards

- `isFile`

### Layers

- `layerNoop`

### Models

- `File`
- `OpenFlag`
- `SeekMode`
- `WatchEvent`
- `WatchOptions`

### Namespaces

- `File`
- `WatchEvent`

### Services

- `FileSystem` service key
- `FileSystem` interface
- `WatchBackend`

### Type IDs

- `FileTypeId`

## FileSystem service operation families

The `FileSystem` interface includes operations for:

```text
access / permissions
copying / renaming
directories / globbing
temporary files and directories
raw bytes / UTF-8 strings
open file handles
links / real paths
metadata / stat
Stream reads / Sink writes
watch streams
truncate / timestamps
```

All of this stays behind one portable service contract.

## Type discipline

The generated demo has no explicit `any` annotations.

Every `Message.match` destructured payload is explicitly typed, and Button
attributes are derived from `HtmlBuilder` so the demo remains clean under
`noImplicitAny`.

## Integration expectation

Follow the same child-feature integration pattern as neighboring
`features/labs/*` demos:

1. add the child Model to the parent learn Model,
2. add `FileSystemDemo.Message` to the parent Message union,
3. initialize `FileSystemDemo.init`,
4. delegate child messages to `FileSystemDemo.update`,
5. render `FileSystemDemo.view(...)` from the FileSystem route.

This artifact intentionally performs none of those edits.

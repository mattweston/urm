import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Console, Effect, FileSystem, Schema } from "effect"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { writeSiteBuild, decodeReleaseSnapshot } from "../src/index.ts"

const script_directory = dirname(fileURLToPath(import.meta.url))
const package_directory = resolve(script_directory, "..")
const fixture_directory = resolve(package_directory, "fixtures", "basic")
const output_directory = resolve(
    package_directory,
    "dist",
    "builds",
    "00000000-0000-4000-8000-000000000002",
    "fixture-basic-build-1"
)

class FixtureJsonError extends Schema.TaggedError<FixtureJsonError>()(
    "FixtureJsonError",
    { cause: Schema.Defect() }
) {}

const program = Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const snapshotJson = yield* fs.readFileString(
        resolve(fixture_directory, "release.json")
    )
    const snapshotUnknown = yield* Effect.try({
        try: () => JSON.parse(snapshotJson),
        catch: (cause) => new FixtureJsonError({ cause }),
    })
    const snapshot = yield* decodeReleaseSnapshot(snapshotUnknown)
    const build = yield* writeSiteBuild({
        snapshot,
        output_directory,
    })

    for (const artifact of build.artifacts) {
        yield* Console.log(`Generated ${artifact.route}`)
    }
}).pipe(Effect.provide(NodeServices.layer))

NodeRuntime.runMain(program)

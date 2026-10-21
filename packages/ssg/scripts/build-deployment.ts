import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Config, Console, Effect, FileSystem } from "effect"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import {
    decodeSiteDeploymentDescriptor,
    DeploymentBuildError,
} from "../src/index.ts"

const script_directory = dirname(fileURLToPath(import.meta.url))
const repository_root = resolve(script_directory, "../../..")
const default_deployment_file = "packages/ssg/fixtures/basic/deployment.json"

const parseJson = (
    operation: string,
    source: string
): Effect.Effect<unknown, DeploymentBuildError> =>
    Effect.try({
        try: () => JSON.parse(source),
        catch: (cause) => new DeploymentBuildError({ operation, cause }),
    })

const program = Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const deployment_file = yield* Config.String(
        "URM_SSG_DEPLOYMENT_FILE"
    ).pipe(Config.withDefault(default_deployment_file))
    const deployment_source = yield* fs.readFileString(
        resolve(repository_root, deployment_file)
    )
    const deployment_unknown = yield* parseJson(
        "decode deployment descriptor",
        deployment_source
    )
    const deployment = yield* decodeSiteDeploymentDescriptor(deployment_unknown)
    const manifest_path = resolve(
        repository_root,
        deployment.artifact_directory,
        "manifest.json"
    )
    if (!(yield* fs.exists(manifest_path))) {
        return yield* Effect.fail(
            new DeploymentBuildError({
                operation: `manifest not found: ${deployment.artifact_directory}/manifest.json`,
            })
        )
    }
    yield* Console.log(
        `Validated ${deployment.environment} deployment ${deployment.deployment_id} for build ${deployment.build_id}`
    )
}).pipe(Effect.provide(NodeServices.layer))

NodeRuntime.runMain(program)

import { NodeServices } from "@effect/platform-node"
import { Context, Effect, FileSystem, Layer, Redacted, Schema } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import {
    decodeSiteDeploymentDescriptor,
    deploymentStage,
    PreviewDeploymentResult,
    type PreviewDeploymentResult as PreviewDeploymentResultType,
    type SiteDeploymentDescriptor,
} from "./deployment.ts"
import { PreviewDeploymentError } from "./errors.ts"

const repository_root = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../.."
)
const ssg_package_directory = resolve(repository_root, "packages/ssg")
const result_prefix = "URM_PREVIEW_RESULT="
const unavailable_result = "URM_PREVIEW_RESULT_UNAVAILABLE"

export interface DeploymentCredentials {
    readonly token: Redacted.Redacted<string>
    readonly account_id: string
}

export const preview_deployment_command = (
    descriptor: SiteDeploymentDescriptor,
    descriptor_relative_path: string,
    credentials?: DeploymentCredentials
) =>
    ChildProcess.make(
        "pnpm",
        [
            "exec",
            "alchemy",
            "deploy",
            "alchemy.run.ts",
            "--stage",
            deploymentStage(descriptor),
            "--yes",
        ],
        {
            cwd: ssg_package_directory,
            env: {
                CI: "1",
                URM_SSG_DEPLOYMENT_FILE: descriptor_relative_path,
                ...(credentials === undefined
                    ? {}
                    : {
                          CLOUDFLARE_API_TOKEN: Redacted.value(
                              credentials.token
                          ),
                          CLOUDFLARE_ACCOUNT_ID: credentials.account_id,
                      }),
            },
            extendEnv: true,
        }
    )

const outputExcerpt = (output: string): string =>
    output.trim().slice(-2_000) || "<empty output>"

const previewError = (operation: string, reason: string, cause?: unknown) =>
    new PreviewDeploymentError({
        operation,
        reason,
        ...(cause === undefined ? {} : { cause }),
    })

export const decodePreviewDeploymentOutput = Effect.fn(
    "PreviewDeployment.decodeOutput"
)(function* (output: string) {
    const result_line = output
        .split("\n")
        .find((line) => line.includes(result_prefix))

    if (result_line === undefined) {
        return yield* Effect.fail(
            previewError(
                "read Alchemy output",
                output.includes(unavailable_result)
                    ? "Alchemy deployed the Worker but did not expose a preview URL"
                    : `Alchemy did not return a preview deployment result. Output tail: ${outputExcerpt(output)}`
            )
        )
    }

    const json = result_line.slice(
        result_line.indexOf(result_prefix) + result_prefix.length
    )
    const unknown_result = yield* Effect.try({
        try: (): unknown => JSON.parse(json),
        catch: (cause) =>
            previewError(
                "parse Alchemy output",
                "Alchemy returned invalid preview deployment JSON",
                cause
            ),
    })

    return yield* Schema.decodeUnknownEffect(PreviewDeploymentResult)(
        unknown_result
    ).pipe(
        Effect.mapError((cause) =>
            previewError(
                "validate Alchemy output",
                "Alchemy returned an invalid preview deployment result",
                cause
            )
        )
    )
})

export const deployPreview = Effect.fn("PreviewDeployment.deploy")(
    function* (
        input: SiteDeploymentDescriptor,
        credentials?: DeploymentCredentials
    ) {
        const descriptor = yield* decodeSiteDeploymentDescriptor(input).pipe(
            Effect.mapError((cause) =>
                previewError(
                    "validate preview descriptor",
                    "Preview deployment input is invalid",
                    cause
                )
            )
        )
        const fs = yield* FileSystem.FileSystem
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const artifact_directory = resolve(
            repository_root,
            descriptor.artifact_directory
        )
        const manifest_path = resolve(artifact_directory, "manifest.json")

        if (!(yield* fs.exists(manifest_path))) {
            return yield* Effect.fail(
                previewError(
                    "validate preview artifacts",
                    `Build manifest was not found at ${descriptor.artifact_directory}/manifest.json`
                )
            )
        }

        const descriptor_directory = resolve(
            repository_root,
            "packages/ssg/dist/deployment-inputs"
        )
        const descriptor_relative_path = `packages/ssg/dist/deployment-inputs/${descriptor.deployment_id}.json`
        yield* fs.makeDirectory(descriptor_directory, { recursive: true })
        yield* fs.writeFileString(
            resolve(repository_root, descriptor_relative_path),
            `${JSON.stringify(descriptor, undefined, 4)}\n`
        )

        const command = preview_deployment_command(
            descriptor,
            descriptor_relative_path,
            credentials
        )
        const output = yield* spawner
            .string(command, { includeStderr: true })
            .pipe(
                Effect.mapError((cause) =>
                    previewError(
                        "deploy preview with Alchemy",
                        `Alchemy preview deployment failed: ${String(cause)}`,
                        cause
                    )
                )
            )

        const deployment_log_directory = resolve(
            repository_root,
            "packages/ssg/dist/deployment-logs"
        )
        yield* fs.makeDirectory(deployment_log_directory, { recursive: true })
        yield* fs.writeFileString(
            resolve(
                deployment_log_directory,
                `${descriptor.deployment_id}.log`
            ),
            output
        )

        return yield* decodePreviewDeploymentOutput(output)
    },
    (effect) =>
        effect.pipe(
            Effect.mapError((cause) =>
                cause instanceof PreviewDeploymentError
                    ? cause
                    : previewError(
                          "prepare preview deployment",
                          "Preview deployment preparation failed",
                          cause
                      )
            ),
            Effect.provide(NodeServices.layer)
        )
)

export interface PreviewDeployerType {
    readonly deploy: (
        descriptor: SiteDeploymentDescriptor
    ) => Effect.Effect<PreviewDeploymentResultType, PreviewDeploymentError>
}

export class PreviewDeployer extends Context.Service<
    PreviewDeployer,
    PreviewDeployerType
>()("@urm/ssg/PreviewDeployer") {}

export const PreviewDeployerLive = Layer.succeed(
    PreviewDeployer,
    PreviewDeployer.of({ deploy: deployPreview })
)

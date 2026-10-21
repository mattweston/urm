import * as Alchemy from "alchemy"
import * as Output from "alchemy/Output"
import * as Cloudflare from "alchemy/Cloudflare"
import { Effect } from "effect"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import {
    decodeSiteDeploymentDescriptorSync,
    deploymentResourceId,
    deploymentWorkerName,
} from "./src/index.ts"

const package_directory = dirname(fileURLToPath(import.meta.url))
const repository_root = resolve(package_directory, "../..")
const default_deployment_file = "packages/ssg/fixtures/basic/deployment.json"
const deployment_file =
    process.env.URM_SSG_DEPLOYMENT_FILE ?? default_deployment_file
const deployment_unknown: unknown = JSON.parse(
    readFileSync(resolve(repository_root, deployment_file), "utf8")
)
const deployment = decodeSiteDeploymentDescriptorSync(deployment_unknown)

export default Alchemy.Stack(
    "UrmGeneratedSites",
    {
        providers: Cloudflare.providers(),
        state: Cloudflare.state(),
    },
    Effect.gen(function* () {
        const site = yield* Cloudflare.Website.StaticSite(
            deploymentResourceId(deployment),
            {
                name: deploymentWorkerName(deployment),
                cwd: repository_root,
                command: 'node -e ""',
                outdir: deployment.artifact_directory,
                memo: false,
                workersDev: {
                    enabled: deployment.environment === "preview",
                    previewsEnabled: deployment.environment === "preview",
                },
                ...(deployment.environment === "production"
                    ? { domain: deployment.hostnames[0] }
                    : {}),
                assets: {
                    htmlHandling: "auto-trailing-slash",
                    notFoundHandling: "404-page",
                },
            }
        )

        return Output.all(site.url, site.urls).pipe(
            Output.map(([url, urls]) => {
                const preview_url = url ?? urls[0]

                return preview_url === undefined
                    ? "URM_PREVIEW_RESULT_UNAVAILABLE"
                    : `URM_PREVIEW_RESULT=${JSON.stringify({
                          resource_id: deploymentResourceId(deployment),
                          worker_name: deploymentWorkerName(deployment),
                          url: preview_url,
                      })}`
            })
        )
    })
)

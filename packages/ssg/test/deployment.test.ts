import { Effect, Redacted } from "effect"
import { describe, expect, it } from "vitest"
import { preview_deployment_command } from "../src/preview-deployer.ts"

import {
    decodeSiteDeploymentDescriptor,
    decodePreviewDeploymentOutput,
    deploymentResourceId,
    deploymentStage,
    deploymentWorkerName,
} from "../src/index.ts"

const descriptor = {
    deployment_id: "deployment-1",
    build_id: "00000000-0000-4000-8000-000000000003",
    release_id: "release-1",
    correlation_id: "correlation-1",
    org_id: "org-1",
    domain_id: "00000000-0000-4000-8000-000000000002",
    domain_name: "example-site",
    environment: "preview",
    hostnames: ["example.com"],
    artifact_directory:
        "packages/ssg/dist/builds/00000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000003",
}

describe("SiteDeploymentDescriptor", () => {
    it("isolates production and requires one generated hostname", async () => {
        const production = await Effect.runPromise(
            decodeSiteDeploymentDescriptor({
                ...descriptor,
                environment: "production",
                hostnames: ["test1.urm.dev"],
            })
        )
        expect(deploymentWorkerName(production)).toBe(
            "urm-production-00000000-0000-4000-8000-000000000002"
        )
        expect(deploymentResourceId(production)).toBe(
            `DomainSite-${production.domain_id}-production`
        )
        for (const hostnames of [
            [],
            ["example.com"],
            ["a.urm.dev", "b.urm.dev"],
        ]) {
            expect(
                (
                    await Effect.runPromiseExit(
                        decodeSiteDeploymentDescriptor({
                            ...descriptor,
                            environment: "production",
                            hostnames,
                        })
                    )
                )._tag
            ).toBe("Failure")
        }
    })
    it("passes explicitly configured credentials to the subprocess", async () => {
        const decoded = await Effect.runPromise(
            decodeSiteDeploymentDescriptor(descriptor)
        )
        const command = preview_deployment_command(decoded, "descriptor.json", {
            token: Redacted.make("test-token"),
            account_id: "a".repeat(32),
        })
        expect(command.options.env).toEqual({
            CI: "1",
            URM_SSG_DEPLOYMENT_FILE: "descriptor.json",
            CLOUDFLARE_API_TOKEN: "test-token",
            CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
        })
    })
    it("uses environment credentials only within the Alchemy subprocess", async () => {
        const decoded = await Effect.runPromise(
            decodeSiteDeploymentDescriptor(descriptor)
        )
        const command = preview_deployment_command(
            decoded,
            "packages/ssg/dist/deployment-inputs/deployment-1.json"
        )
        expect(command.options.env).toEqual({
            CI: "1",
            URM_SSG_DEPLOYMENT_FILE:
                "packages/ssg/dist/deployment-inputs/deployment-1.json",
        })
        expect(command.options.extendEnv).toBe(true)
    })
    it("isolates sites within the same domain", async () => {
        const first = await Effect.runPromise(
            decodeSiteDeploymentDescriptor({
                ...descriptor,
                subdomain_id: "site-one",
            })
        )
        const second = await Effect.runPromise(
            decodeSiteDeploymentDescriptor({
                ...descriptor,
                subdomain_id: "site-two",
            })
        )
        expect(deploymentResourceId(first)).toBe("DomainSite-site-one-preview")
        expect(deploymentResourceId(first)).not.toBe(
            deploymentResourceId(second)
        )
        expect(deploymentWorkerName(first)).toBe("urm-preview-site-one")
        expect(deploymentWorkerName(first)).not.toBe(
            deploymentWorkerName(second)
        )
    })
    it("separates development and staging and supports subdomain live hosts", async () => {
        const development = await Effect.runPromise(
            decodeSiteDeploymentDescriptor({
                ...descriptor,
                environment: "production",
                channel: "development",
                hostnames: ["dev.example-site.urm.dev"],
            })
        )
        const staging = await Effect.runPromise(
            decodeSiteDeploymentDescriptor({
                ...descriptor,
                environment: "production",
                channel: "staging",
                hostnames: ["staging.example-site.urm.dev"],
            })
        )
        const live = await Effect.runPromise(
            decodeSiteDeploymentDescriptor({
                ...descriptor,
                subdomain_id: "docs-subdomain",
                environment: "production",
                channel: "live",
                hostnames: ["docs.example.urm.dev"],
            })
        )

        expect(deploymentResourceId(development)).not.toBe(
            deploymentResourceId(staging)
        )
        expect(deploymentWorkerName(development)).toBe(
            "urm-development-example-si-8000000000000002"
        )
        expect(deploymentWorkerName(staging)).toBe(
            "urm-staging-example-si-8000000000000002"
        )
        expect(deploymentWorkerName(live)).toBe("urm-production-docs-subdomain")
    })
    it("derives stable domain-scoped resource names", async () => {
        const decoded = await Effect.runPromise(
            decodeSiteDeploymentDescriptor(descriptor)
        )

        expect(deploymentResourceId(decoded)).toBe(
            "DomainSite-00000000-0000-4000-8000-000000000002-preview"
        )
        expect(deploymentWorkerName(decoded)).toBe(
            "urm-preview-example-si-8000000000000002"
        )
    })

    it("removes dots from generated-hostname Worker names", async () => {
        const decoded = await Effect.runPromise(
            decodeSiteDeploymentDescriptor({
                ...descriptor,
                domain_name: "test1.urm.dev",
                channel: "development",
            })
        )

        expect(deploymentWorkerName(decoded)).toBe(
            "urm-development-test1-urm-8000000000000002"
        )
        expect(deploymentWorkerName(decoded)).toMatch(/^[a-z0-9-]+$/)
        expect(deploymentWorkerName(decoded).length).toBeLessThanOrEqual(54)
        expect(deploymentStage(decoded)).toBe(
            "v4-development-00000000-0000-4000-8000-000000000002"
        )
    })

    it.each([
        { ...descriptor, artifact_directory: "../release" },
        { ...descriptor, artifact_directory: "/tmp/site" },
        { ...descriptor, hostnames: ["not a hostname"] },
        {
            ...descriptor,
            artifact_directory:
                "packages/ssg/dist/builds/00000000-0000-4000-8000-000000000002/different-build",
        },
    ])("rejects unsafe deployment input", async (input) => {
        const exit = await Effect.runPromiseExit(
            decodeSiteDeploymentDescriptor(input)
        )

        expect(exit._tag).toBe("Failure")
    })

    it("reports when Alchemy cannot expose a preview URL", async () => {
        const error = await Effect.runPromise(
            decodePreviewDeploymentOutput(
                "Deploy complete\nURM_PREVIEW_RESULT_UNAVAILABLE"
            ).pipe(Effect.flip)
        )

        expect(error.reason).toBe(
            "Alchemy deployed the Worker but did not expose a preview URL"
        )
    })
})

describe("decodePreviewDeploymentOutput", () => {
    it("reads a validated result from Alchemy log output", async () => {
        const result = await Effect.runPromise(
            decodePreviewDeploymentOutput(
                'Alchemy log\nURM_PREVIEW_RESULT={"resource_id":"DomainSite-domain-1-preview","worker_name":"urm-preview-example-site","url":"https://example-site.workers.dev"}\nDone'
            )
        )

        expect(result).toEqual({
            resource_id: "DomainSite-domain-1-preview",
            worker_name: "urm-preview-example-site",
            url: "https://example-site.workers.dev",
        })
    })

    it.each([
        "Alchemy completed without a result",
        "URM_PREVIEW_RESULT=not-json",
        'URM_PREVIEW_RESULT={"resource_id":"resource","worker_name":"worker","url":"http://insecure.test"}',
    ])("rejects unusable Alchemy output", async (output) => {
        const exit = await Effect.runPromiseExit(
            decodePreviewDeploymentOutput(output)
        )

        expect(exit._tag).toBe("Failure")
    })
})

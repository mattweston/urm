import { Schema } from "effect"
import { CreateDomainHostnameInput, Domain } from "@urm/domain/schemas/domains"

const ArtifactDirectory = Schema.String.check(
    Schema.isPattern(
        /^packages\/ssg\/dist\/builds\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+$/
    )
)

export const SiteDeploymentDescriptor = Schema.Struct({
    deployment_id: Schema.String,
    build_id: Schema.String,
    release_id: Schema.String,
    correlation_id: Schema.String,
    org_id: Domain.fields.org_id,
    domain_id: Domain.fields.id,
    subdomain_id: Schema.optional(
        Schema.String.check(Schema.isPattern(/^[a-zA-Z0-9-]+$/))
    ),
    domain_name: Domain.fields.name,
    environment: Schema.Literals(["preview", "production"]),
    channel: Schema.optional(
        Schema.Literals(["development", "staging", "production", "live"])
    ),
    hostnames: Schema.Array(CreateDomainHostnameInput.fields.hostname),
    artifact_directory: ArtifactDirectory,
}).check(
    Schema.makeFilter((descriptor) =>
        descriptor.environment !== "production" ||
        (descriptor.hostnames.length === 1 &&
            /^(?:[a-z0-9]+(?:-[a-z0-9]+)*\.)+urm\.dev$/.test(
                descriptor.hostnames[0] ?? ""
            ))
            ? undefined
            : "Production requires one generated urm.dev hostname"
    ),
    Schema.makeFilter((descriptor) =>
        descriptor.artifact_directory ===
        `packages/ssg/dist/builds/${descriptor.domain_id}/${descriptor.build_id}`
            ? undefined
            : {
                  path: ["artifact_directory"],
                  issue: "artifact directory must match domain_id and build_id",
              }
    )
)

export type SiteDeploymentDescriptor = typeof SiteDeploymentDescriptor.Type

const worker_name_part = (value: string): string =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")

export const decodeSiteDeploymentDescriptor = Schema.decodeUnknownEffect(
    SiteDeploymentDescriptor
)

export const decodeSiteDeploymentDescriptorSync = Schema.decodeUnknownSync(
    SiteDeploymentDescriptor
)

export const deploymentResourceId = (
    descriptor: SiteDeploymentDescriptor
): string =>
    `DomainSite-${descriptor.subdomain_id ?? descriptor.domain_id}-${descriptor.channel ?? descriptor.environment}`

export const deploymentWorkerName = (
    descriptor: SiteDeploymentDescriptor
): string => {
    const normalized_owner_id = worker_name_part(
        descriptor.subdomain_id ?? descriptor.domain_id
    )
    if (
        descriptor.channel === "production" ||
        descriptor.channel === "live" ||
        (descriptor.environment === "production" &&
            descriptor.channel === undefined)
    )
        return `urm-production-${normalized_owner_id}`

    const compact_owner_id =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
            normalized_owner_id
        )
            ? normalized_owner_id.replaceAll("-", "")
            : normalized_owner_id
    const owner_id = compact_owner_id.slice(-16)
    if (descriptor.subdomain_id !== undefined)
        return `urm-${descriptor.environment}-${owner_id}`

    const domain_name = worker_name_part(descriptor.domain_name)
        .slice(0, 10)
        .replace(/-$/g, "")
    return `urm-${descriptor.channel ?? descriptor.environment}-${domain_name}-${owner_id}`
}

export const deploymentStage = (descriptor: SiteDeploymentDescriptor): string =>
    `v4-${descriptor.channel ?? descriptor.environment}-${descriptor.subdomain_id ?? descriptor.domain_id}`

export const PreviewDeploymentResult = Schema.Struct({
    resource_id: Schema.String,
    worker_name: Schema.String,
    url: Schema.String.check(Schema.isPattern(/^https:\/\//)),
})
export type PreviewDeploymentResult = typeof PreviewDeploymentResult.Type

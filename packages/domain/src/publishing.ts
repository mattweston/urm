import { Schema } from "effect"
import {
    PublicationReleaseSnapshot,
    ArtifactChecksum,
    PublishingIdempotencyKey,
    SubdomainSlug,
} from "./schemas/publications.ts"

export const ReleaseRecord = Schema.Struct({
    id: Schema.String,
    status: Schema.Literals(["building", "ready", "failed"]),
    snapshot: PublicationReleaseSnapshot,
    artifact_checksum: Schema.NullOr(ArtifactChecksum),
    error_message: Schema.NullOr(Schema.String),
    created_at: Schema.Number,
    completed_at: Schema.NullOr(Schema.Number),
})
export type ReleaseRecord = typeof ReleaseRecord.Type
export const DeploymentChannel = Schema.Literals([
    "development",
    "staging",
    "production",
    "live",
])
export type DeploymentChannel = typeof DeploymentChannel.Type
export const DeploymentJobRecord = Schema.Struct({
    id: Schema.String,
    release_id: Schema.String,
    channel: Schema.optional(DeploymentChannel),
    subdomain_id: Schema.optional(Schema.NullOr(Schema.String)),
    is_preview: Schema.optional(Schema.Boolean),
    organization_id: Schema.String,
    requested_by_user_id: Schema.String,
    idempotency_key: PublishingIdempotencyKey,
    status: Schema.Literals([
        "pending",
        "running",
        "succeeded",
        "failed",
        "cancelled",
    ]),
    artifact_checksum: ArtifactChecksum,
    url: Schema.NullOr(Schema.String),
    error_message: Schema.NullOr(Schema.String),
    created_at: Schema.Number,
    updated_at: Schema.Number,
    completed_at: Schema.NullOr(Schema.Number),
})
export type DeploymentJobRecord = typeof DeploymentJobRecord.Type
export const PublishingLibraryRecord = Schema.Struct({
    id: Schema.String,
    releases: Schema.Array(ReleaseRecord),
})
export const PublishingJobsRecord = Schema.Struct({
    id: Schema.String,
    jobs: Schema.Array(DeploymentJobRecord),
})
export type PublishingLibraryRecord = typeof PublishingLibraryRecord.Type
export const PublishingScope = {
    domain_id: Schema.String,
    subdomain_slug: Schema.NullOr(SubdomainSlug),
}
export const BuildPublicationInput = Schema.Struct({
    ...PublishingScope,
    idempotency_key: PublishingIdempotencyKey,
})
export type BuildPublicationInput = typeof BuildPublicationInput.Type
export class PublishingError extends Schema.TaggedErrorClass<PublishingError>()(
    "PublishingError",
    { message: Schema.String }
) {}

export const ReleaseAssetSource = Schema.Struct({
    key: Schema.String,
    output_path: Schema.String.check(
        Schema.isPattern(/^assets\/published-[a-f0-9]{64}\.image$/)
    ),
})
export type ReleaseAssetSource = typeof ReleaseAssetSource.Type

export const DeployDevelopmentInput = Schema.Struct({
    ...PublishingScope,
    release_id: Schema.String,
    idempotency_key: PublishingIdempotencyKey,
})
export type DeployDevelopmentInput = typeof DeployDevelopmentInput.Type
export const CancelDeploymentInput = Schema.Struct({
    ...PublishingScope,
    job_id: Schema.String,
})

export const PromotePublicationInput = Schema.Struct({
    ...DeployDevelopmentInput.fields,
    channel: Schema.Literals(["staging", "production"]),
})
export type PromotePublicationInput = typeof PromotePublicationInput.Type

export const PublicationOwnerRecord = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    name: Schema.String,
    slug: SubdomainSlug,
})
export const PublicationOwnersRecord = Schema.Struct({
    id: Schema.String,
    subdomains: Schema.Array(PublicationOwnerRecord),
})
export const DeploySubdomainInput = Schema.Struct({
    ...DeployDevelopmentInput.fields,
    subdomain_slug: SubdomainSlug,
    mode: Schema.Literals(["preview", "live"]),
})
export type DeploySubdomainInput = typeof DeploySubdomainInput.Type

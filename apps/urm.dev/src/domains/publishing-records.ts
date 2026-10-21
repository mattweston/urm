import { Schema } from "effect"
import {
    ArtifactChecksum,
    PublicationChannel,
    PublicationDeploymentStatus,
    PublicationReleaseSnapshot,
    PublicationReleaseStatus,
    PublishingIdempotencyKey,
    PublishingJobStatus,
    PublishingOperation,
} from "@urm/domain/schemas/publications"

export const PublicationReleaseId = Schema.String
export type PublicationReleaseId = typeof PublicationReleaseId.Type
export const PublicationJobId = Schema.String
export type PublicationJobId = typeof PublicationJobId.Type

export const PublicationRelease = Schema.Struct({
    _id: PublicationReleaseId,
    _creationTime: Schema.Number,
    domain_id: Schema.String,
    subdomain_id: Schema.optional(Schema.String),
    created_by_user_id: Schema.String,
    status: PublicationReleaseStatus,
    snapshot: PublicationReleaseSnapshot,
    artifact_checksum: Schema.optional(ArtifactChecksum),
    error_message: Schema.optional(
        Schema.String.check(Schema.isMaxLength(2_000))
    ),
    created_at: Schema.Number,
    completed_at: Schema.optional(Schema.Number),
})
export type PublicationRelease = typeof PublicationRelease.Type

export const PublicationDeployment = Schema.Struct({
    _id: Schema.String,
    _creationTime: Schema.Number,
    domain_id: Schema.String,
    subdomain_id: Schema.optional(Schema.String),
    release_id: PublicationReleaseId,
    channel: PublicationChannel,
    is_preview: Schema.optional(Schema.Boolean),
    status: PublicationDeploymentStatus,
    artifact_checksum: ArtifactChecksum,
    url: Schema.optional(Schema.String),
    error_message: Schema.optional(
        Schema.String.check(Schema.isMaxLength(2_000))
    ),
    created_at: Schema.Number,
    updated_at: Schema.Number,
    deployed_at: Schema.optional(Schema.Number),
})
export type PublicationDeployment = typeof PublicationDeployment.Type

export const PublicationJob = Schema.Struct({
    _id: PublicationJobId,
    _creationTime: Schema.Number,
    organization_id: Schema.String,
    domain_id: Schema.String,
    subdomain_id: Schema.optional(Schema.String),
    release_id: Schema.optional(PublicationReleaseId),
    deployment_id: Schema.optional(Schema.String),
    requested_by_user_id: Schema.String,
    idempotency_key: PublishingIdempotencyKey,
    operation: PublishingOperation,
    channel: PublicationChannel,
    status: PublishingJobStatus,
    error_message: Schema.optional(
        Schema.String.check(Schema.isMaxLength(2_000))
    ),
    created_at: Schema.Number,
    updated_at: Schema.Number,
    completed_at: Schema.optional(Schema.Number),
})
export type PublicationJob = typeof PublicationJob.Type

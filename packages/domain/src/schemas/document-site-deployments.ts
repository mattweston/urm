import { Schema } from "effect"

export const DocumentSiteDeploymentEnvironment = Schema.Literals([
    "preview",
    "production",
])
export type DocumentSiteDeploymentEnvironment =
    typeof DocumentSiteDeploymentEnvironment.Type

export const DocumentSiteDeploymentStatus = Schema.Literals([
    "deploying",
    "succeeded",
    "failed",
])
export type DocumentSiteDeploymentStatus =
    typeof DocumentSiteDeploymentStatus.Type

export const DocumentSiteDeployment = Schema.Struct({
    id: Schema.String,
    org_id: Schema.String,
    domain_id: Schema.String,
    build_id: Schema.String,
    release_id: Schema.String,
    correlation_id: Schema.String,
    environment: DocumentSiteDeploymentEnvironment,
    status: DocumentSiteDeploymentStatus,
    resource_id: Schema.String,
    worker_name: Schema.String,
    url: Schema.NullOr(Schema.String),
    error_message: Schema.NullOr(Schema.String),
    created_at: Schema.Date,
    updated_at: Schema.Date,
})
export type DocumentSiteDeployment = typeof DocumentSiteDeployment.Type

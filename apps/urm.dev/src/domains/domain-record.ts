import { Schema } from "effect"
import { DomainName, DomainSlug } from "@urm/domain/schemas/domains"
import { ModuleId } from "@urm/domain/schemas/modules"
import {
    PublicationAccess,
    PublicationStatus,
} from "@urm/domain/schemas/publications"

export const DomainId = Schema.String
export type DomainId = typeof DomainId.Type

export const Domain = Schema.Struct({
    _id: DomainId,
    _creationTime: Schema.Number,
    organization_id: Schema.String,
    created_by_user_id: Schema.String,
    name: DomainName,
    slug: DomainSlug,
    created_at: Schema.optional(Schema.Number),
    updated_at: Schema.Number,
    enabled_modules: Schema.optional(Schema.Array(ModuleId)),
    module_settings_version: Schema.optional(Schema.Number),
    publication_status: PublicationStatus,
    publication_access: PublicationAccess,
    development_release_id: Schema.optional(Schema.String),
    development_deployment_id: Schema.optional(Schema.String),
    staging_release_id: Schema.optional(Schema.String),
    staging_deployment_id: Schema.optional(Schema.String),
    production_release_id: Schema.optional(Schema.String),
    production_deployment_id: Schema.optional(Schema.String),
})
export type Domain = typeof Domain.Type

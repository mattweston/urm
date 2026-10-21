import { Entity, Mutation, Query, Remote } from "foldkit-remote"
import { Schema } from "effect"
import {
    PublishingLibraryRecord,
    PublishingJobsRecord,
    PublishingScope,
    BuildPublicationInput,
    DeployDevelopmentInput,
    PromotePublicationInput,
    CancelDeploymentInput,
    PublicationOwnersRecord,
    DeploySubdomainInput,
} from "@urm/domain/publishing"
export const PublishingLibrary = Entity.make(
    "PublishingLibrary",
    PublishingLibraryRecord
)
export const PublishingLibrarySummary = PublishingLibrary.select({
    id: true,
    releases: true,
})
export const PublicationReleases = Query.make("PublicationReleases", {
    Input: PublishingScope,
    Result: PublishingLibrary,
})
export const PublishingJobs = Entity.make(
    "PublishingJobs",
    PublishingJobsRecord
)
export const PublishingJobsSummary = PublishingJobs.select({
    id: true,
    jobs: true,
})
export const PublicationJobs = Query.make("PublicationJobs", {
    Input: PublishingScope,
    Result: PublishingJobs,
})
export const PublicationPromotionJobs = Query.make("PublicationPromotionJobs", {
    Input: PublishingScope,
    Result: PublishingJobs,
})
export const PromotePublication = Mutation.make("PromotePublication", {
    Input: PromotePublicationInput,
    Output: { id: Schema.String },
})
export const BuildPublication = Mutation.make("BuildPublication", {
    Input: BuildPublicationInput,
    Output: { id: Schema.String },
})
export const DeployDevelopment = Mutation.make("DeployDevelopment", {
    Input: DeployDevelopmentInput,
    Output: { id: Schema.String },
})
export const CancelDeployment = Mutation.make("CancelDeployment", {
    Input: CancelDeploymentInput,
    Output: { id: Schema.String },
})
export const PublishingOwners = Entity.make(
    "PublishingOwners",
    PublicationOwnersRecord
)
export const PublishingOwnersSummary = PublishingOwners.select({
    id: true,
    subdomains: true,
})
export const PublicationOwners = Query.make("PublicationOwners", {
    Input: { domain_id: Schema.String },
    Result: PublishingOwners,
})
export const DeploySubdomain = Mutation.make("DeploySubdomain", {
    Input: DeploySubdomainInput,
    Output: { id: Schema.String },
})
export const PublishingRemote = Remote.define({
    entities: [PublishingLibrary, PublishingJobs, PublishingOwners],
    queries: [
        PublicationReleases,
        PublicationJobs,
        PublicationPromotionJobs,
        PublicationOwners,
    ],
    mutations: [
        BuildPublication,
        DeployDevelopment,
        PromotePublication,
        DeploySubdomain,
        CancelDeployment,
    ],
})

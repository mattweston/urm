import { Schema } from "effect"

export class RoutePlanError extends Schema.TaggedError<RoutePlanError>()(
    "RoutePlanError",
    {
        path: Schema.String,
        reason: Schema.String,
    }
) {}

export class DocumentAssemblyError extends Schema.TaggedError<DocumentAssemblyError>()(
    "DocumentAssemblyError",
    {
        path: Schema.String,
        cause: Schema.Defect(),
    }
) {}

export class PageRenderError extends Schema.TaggedError<PageRenderError>()(
    "PageRenderError",
    {
        path: Schema.String,
        content_type: Schema.String,
        reason: Schema.String,
        cause: Schema.optionalKey(Schema.Defect()),
    }
) {}

export class ArtifactValidationError extends Schema.TaggedError<ArtifactValidationError>()(
    "ArtifactValidationError",
    {
        path: Schema.String,
        reason: Schema.String,
    }
) {}

export class DeploymentBuildError extends Schema.TaggedError<DeploymentBuildError>()(
    "DeploymentBuildError",
    {
        operation: Schema.String,
        cause: Schema.optionalKey(Schema.Defect()),
    }
) {}

export class PreviewDeploymentError extends Schema.TaggedError<PreviewDeploymentError>()(
    "PreviewDeploymentError",
    {
        operation: Schema.String,
        reason: Schema.String,
        cause: Schema.optionalKey(Schema.Defect()),
    }
) {}

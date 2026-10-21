import { Schema } from "effect"

export const IssuePriority = Schema.Literals([
    "low",
    "medium",
    "high",
    "urgent",
])
export type IssuePriority = typeof IssuePriority.Type

export const IssueStatus = Schema.Literals([
    "open",
    "in_progress",
    "closed",
    "archived",
    "on_hold",
])
export type IssueStatus = typeof IssueStatus.Type

export const Issue = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    description: Schema.optional(Schema.String),
    content: Schema.optional(Schema.String),
    status: IssueStatus,
    priority: Schema.optional(IssuePriority),
    labels: Schema.optional(Schema.String),
    assignee_id: Schema.optional(Schema.String),
    order_position: Schema.Number,
    updated_at: Schema.Number,
    deleted_at: Schema.optional(Schema.Number),
})
export type Issue = typeof Issue.Type

export const UpdateIssueInput = Schema.Struct({
    id: Schema.String,
    title: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    content: Schema.optional(Schema.String),
    status: Schema.optional(IssueStatus),
    priority: Schema.optional(IssuePriority),
    labels: Schema.optional(Schema.String),
    assignee_id: Schema.optional(Schema.String),
    order_position: Schema.optional(Schema.Number),
    updated_at: Schema.Number,
})
export type UpdateIssueInput = typeof UpdateIssueInput.Type

export const IssueLabel = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    color: Schema.String,
    description: Schema.optional(Schema.String),
    updated_at: Schema.Number,
})

export type IssueLabel = Schema.Schema.Type<typeof IssueLabel>

export const CreateIssueInput = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    description: Schema.optional(Schema.String),
    content: Schema.optional(Schema.String),
    status: IssueStatus,
    priority: Schema.optional(IssuePriority),
    labels: Schema.optional(Schema.String),
    assignee_id: Schema.optional(Schema.String),
    order_position: Schema.Number,
    updated_at: Schema.Number,
})

export type CreateIssueInput = Schema.Schema.Type<typeof CreateIssueInput>

export const CreateIssueLabelInput = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    color: Schema.String,
    description: Schema.optional(Schema.String),
    updated_at: Schema.Number,
})

export type CreateIssueLabelInput = Schema.Schema.Type<
    typeof CreateIssueLabelInput
>

export const UpdateIssueLabelInput = Schema.Struct({
    id: Schema.String,
    name: Schema.optional(Schema.String),
    color: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    updated_at: Schema.Number,
})

export type UpdateIssueLabelInput = Schema.Schema.Type<
    typeof UpdateIssueLabelInput
>

export {
    ConflictError,
    DatabaseError,
    NotFoundError,
    ValidationError,
} from "../errors.ts"

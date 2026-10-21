import { Schema } from "effect"
import { Issue, IssueStatus, IssuePriority } from "./schemas/issues.ts"
import { Tag } from "./schemas/tags.ts"
export const IssueFields = Schema.Struct({
    title: Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(500)),
    description: Schema.NullOr(Schema.String.check(Schema.isMaxLength(20000))),
    content: Schema.NullOr(Schema.String.check(Schema.isMaxLength(100000))),
    status: IssueStatus,
    priority: Schema.NullOr(IssuePriority),
    assignee_id: Schema.NullOr(Schema.String.check(Schema.isMaxLength(255))),
    order_position: Schema.Finite,
    tag_ids: Schema.Array(Schema.String).check(Schema.isMaxLength(50)),
})
export const IssueAction = Schema.Union([
    Schema.Struct({
        _tag: Schema.Literal("create"),
        id: Schema.String,
        ...IssueFields.fields,
    }),
    Schema.Struct({
        _tag: Schema.Literal("update"),
        id: Schema.String,
        ...IssueFields.fields,
    }),
    Schema.Struct({ _tag: Schema.Literal("delete"), id: Schema.String }),
])
export type IssueAction = typeof IssueAction.Type
export const IssueActions = Schema.Array(IssueAction).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(50)
)
export const IssueCatalogRecord = Schema.Struct({
    id: Schema.String,
    issues: Schema.Array(Issue),
    tags: Schema.Array(Tag),
})
export class IssueWriteError extends Schema.TaggedErrorClass<IssueWriteError>()(
    "IssueWriteError",
    { message: Schema.String }
) {}

import { Schema as S } from "effect"
import { Issue } from "@urm/domain/schemas/issues"

// Lab edit values, not a complete record or server request.
export const IssueForm = S.Struct({
    title: S.Trimmed.check(S.isMinLength(1), S.isMaxLength(200)),
    description: Issue.fields.description,
    status: Issue.fields.status,
    priority: Issue.fields.priority,
    order_position: S.NumberFromString.check(
        S.isInt(),
        S.isGreaterThanOrEqualTo(0)
    ),
})
export type IssueForm = typeof IssueForm.Type

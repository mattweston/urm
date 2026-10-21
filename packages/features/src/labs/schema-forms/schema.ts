import { Schema as S, SchemaIssue } from "effect"
import { TaskForm } from "./task-schema.ts"
import { IssueForm } from "./issue-schema.ts"
export { TaskForm, IssueForm }

export const Kind = S.Literals(["task", "issue"])
export type Kind = typeof Kind.Type
export const Draft = S.Struct({
    title: S.String,
    description: S.String,
    status: S.String,
    priority: S.String,
    order: S.String,
    completed: S.Boolean,
})
export type Draft = typeof Draft.Type

export const example = (kind: Kind): Draft => ({
    title:
        kind === "task"
            ? "Review the release checklist"
            : "Sidebar loses keyboard focus",
    description: "Focus should remain on the selected entry after navigation.",
    status: kind === "task" ? "active" : "open",
    priority: "medium",
    order: "1",
    completed: false,
})

const decode_task = S.decodeUnknownResult(TaskForm, { errors: "all" })
const decode_issue = S.decodeUnknownResult(IssueForm, { errors: "all" })
const formatter = SchemaIssue.makeFormatterStandardSchemaV1()

export const inspect = (kind: Kind, draft: Draft) => {
    // Empty controls have explicit, domain-specific meanings.
    const result =
        kind === "task"
            ? decode_task({
                  text: draft.title,
                  status: draft.status,
                  priority: draft.priority === "" ? null : draft.priority,
                  completed: draft.completed,
                  order: draft.order,
              })
            : decode_issue({
                  title: draft.title,
                  status: draft.status,
                  ...(draft.priority === ""
                      ? {}
                      : { priority: draft.priority }),
                  ...(draft.description === ""
                      ? {}
                      : { description: draft.description }),
                  order_position: draft.order,
              })
    return {
        value: result._tag === "Success" ? result.success : null,
        issues:
            result._tag === "Failure"
                ? formatter(result.failure.issue).issues.map((issue) => ({
                      path: (issue.path ?? [])
                          .map((part) =>
                              String(typeof part === "object" ? part.key : part)
                          )
                          .join("."),
                      message: issue.message,
                  }))
                : [],
    }
}

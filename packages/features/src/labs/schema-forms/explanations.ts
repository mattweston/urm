import type { Kind } from "./schema.ts"

interface Explanation {
    readonly line: number
    readonly anchor: string
    readonly title: string
    readonly text: string
}

export const explanations = (kind: Kind): ReadonlyArray<Explanation> => [
    {
        line: 5,
        anchor: "S.Struct",
        title: "An edit-value schema",
        text: "Struct groups the editable fields. This lab schema is not a complete stored record or a production update request.",
    },
    {
        line: 6,
        anchor: "S.Trimmed",
        title: "Explicit text validation",
        text: "Trimmed rejects surrounding whitespace; it does not remove it. The 1–200 character checks are lab-only rules added to the domain's plain string field.",
    },
    ...(kind === "task"
        ? [
              {
                  line: 7,
                  anchor: "status:",
                  title: "Literal status values",
                  text: "Reuses the domain's active, done and deleted literals. Unknown statuses fail decoding even if they bypass the select control.",
              },
              {
                  line: 8,
                  anchor: "priority:",
                  title: "Optional and nullable",
                  text: "Task priority permits low, medium, high, null, or omission. This form maps Not set to explicit null.",
              },
              {
                  line: 9,
                  anchor: "completed:",
                  title: "A Boolean checkbox",
                  text: "Completed is a Boolean. The current domain schema does not enforce a relationship between this field and status.",
              },
              {
                  line: 10,
                  anchor: "S.NumberFromString",
                  title: "Text becomes a number",
                  text: "NumberFromString converts the control's text to a number. Integer and non-negative checks are lab-only restrictions; the domain order field is a plain number.",
              },
              {
                  line: 12,
                  anchor: "typeof TaskForm.Type",
                  title: "Infer the TypeScript type",
                  text: "The decoded type comes from the schema, so it includes a numeric order and the domain literal unions without a second hand-written interface.",
              },
          ]
        : [
              {
                  line: 7,
                  anchor: "description:",
                  title: "An optional string",
                  text: "An issue description can be omitted. This form explicitly omits the key when the control is empty; it does not send null.",
              },
              {
                  line: 8,
                  anchor: "status:",
                  title: "The Issue status vocabulary",
                  text: "The shared domain permits open, in_progress, closed, archived and on_hold. Task statuses cannot be substituted here.",
              },
              {
                  line: 9,
                  anchor: "priority:",
                  title: "Optional, but not nullable",
                  text: "Issue priority also permits urgent. Not set omits the key; null is not a valid Issue priority. In an update request, omission may mean leave unchanged rather than clear.",
              },
              {
                  line: 10,
                  anchor: "S.NumberFromString",
                  title: "Decode numeric input",
                  text: "The raw order_position starts as text and decodes to a number. The following checks add lab-only integer and non-negative restrictions.",
              },
              {
                  line: 15,
                  anchor: "typeof IssueForm.Type",
                  title: "Infer the decoded type",
                  text: "typeof IssueForm.Type describes the decoded value, including optional properties and numeric order_position. It is not the raw form draft type.",
              },
          ]),
]

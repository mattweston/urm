import { describe, expect, it, vi } from "vitest"
import { Schema as S } from "effect"
import { example, inspect } from "./schema.ts"
import { prepare_explain_lines } from "./source.ts"

vi.mock("./task-schema.ts?highlighted", () => ({ default: "" }))
vi.mock("./issue-schema.ts?highlighted", () => ({ default: "" }))
import {
    ChangedField,
    SelectedKind,
    SelectedPanel,
    Submitted,
    Model,
    init,
    update,
} from "./submodel.ts"

describe("URM Schema forms", () => {
    it("removes Shiki separator newlines but preserves source lines", () => {
        const lines = [
            '<span class="line">const value = 1</span>',
            '<span class="line"></span>',
            '<span class="line">const next = 2</span>',
        ]
        expect(
            prepare_explain_lines(
                `<pre><code>${lines.join("\n")}\n</code></pre>`
            )
        ).toBe(`<pre><code>${lines.join("")}</code></pre>`)
    })
    it("switches inspector panels without changing form data", () => {
        const [initial] = init()
        const [selected] = update(
            initial,
            SelectedPanel({ panel: "typescript" })
        )
        expect(selected).toEqual({ ...initial, panel: "typescript" })
        expect(update(selected, SelectedKind({ kind: "issue" }))[0].panel).toBe(
            "typescript"
        )
    })
    it("decodes task edit values and converts numeric text", () => {
        expect(inspect("task", example("task")).value).toEqual({
            text: "Review the release checklist",
            status: "active",
            priority: "medium",
            completed: false,
            order: 1,
        })
    })

    it("distinguishes nullable task priority from omitted issue fields", () => {
        expect(
            inspect("task", { ...example("task"), priority: "" }).value
        ).toHaveProperty("priority", null)
        const issue = inspect("issue", {
            ...example("issue"),
            priority: "",
            description: "",
        })
        expect(issue.issues).toEqual([])
        expect(issue.value).not.toHaveProperty("priority")
        expect(issue.value).not.toHaveProperty("description")
        expect(issue.value).toHaveProperty("order_position", 1)
    })

    it("reports all invalid field paths", () => {
        const task = inspect("task", {
            ...example("task"),
            title: " ",
            status: "open",
            priority: "urgent",
            order: "-1",
        })
        expect(task.value).toBeNull()
        expect(task.issues.map((issue) => issue.path)).toEqual(
            expect.arrayContaining(["text", "status", "priority", "order"])
        )
        expect(
            inspect("issue", { ...example("issue"), order: "no" }).issues.map(
                (issue) => issue.path
            )
        ).toContain("order_position")
    })

    it("preserves the accepted snapshot when the draft becomes invalid", () => {
        const [initial] = init()
        const [accepted] = update(initial, Submitted())
        expect(accepted.accepted).not.toBeNull()
        expect(S.decodeUnknownSync(Model)(accepted)).toEqual(accepted)
        const [edited] = update(
            accepted,
            ChangedField({ field: "order", value: "not a number" })
        )
        const [rejected] = update(edited, Submitted())
        expect(rejected.draft.order).toBe("not a number")
        expect(rejected.accepted).toBe(accepted.accepted)
        expect(
            update(rejected, SelectedKind({ kind: "issue" }))[0]
        ).toMatchObject({
            kind: "issue",
            accepted: null,
            draft: { status: "open" },
        })
    })
})

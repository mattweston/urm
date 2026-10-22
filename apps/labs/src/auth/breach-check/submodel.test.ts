import { expect, test } from "vitest"
import {
    ChangedEmail,
    CompletedCheck,
    SubmittedCheck,
    init,
    update,
} from "./submodel.ts"

const initial = () => ({
    ...init({ _tag: "Labs", labs_path: "/labs/auth/breach-check" }),
    active: true,
})

test("submission validates and suppresses duplicate requests", () => {
    const [invalid, no_commands] = update(initial(), SubmittedCheck())
    expect(invalid.result?.status).toBe("error")
    expect(no_commands).toHaveLength(0)
    const [edited] = update(
        initial(),
        ChangedEmail({ value: "person@example.com" })
    )
    const [pending, commands] = update(edited, SubmittedCheck())
    expect(commands).toHaveLength(1)
    expect(update(pending, SubmittedCheck())).toEqual([pending, []])
})

test("stale responses cannot replace the current lookup", () => {
    const [edited] = update(
        initial(),
        ChangedEmail({ value: "person@example.com" })
    )
    const [pending] = update(edited, SubmittedCheck())
    const result = {
        status: "complete",
        breaches: [],
        message: "No known breaches found.",
    }
    const stale = CompletedCheck({
        request_id: pending.request_id - 1,
        result: { ...result, status: "complete" },
    })
    expect(update(pending, stale)).toEqual([pending, []])
    const [done] = update(
        pending,
        CompletedCheck({
            request_id: pending.request_id,
            result: { ...result, status: "complete" },
        })
    )
    expect(done.busy).toBe(false)
    expect(done.result?.status).toBe("complete")
})

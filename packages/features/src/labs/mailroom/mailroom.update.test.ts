import { describe, expect, it } from "vitest"

import {
    ChangedComposeBody,
    ChangedComposeSubject,
    ChangedComposeTo,
    ClickedSaveDraft,
    ClickedSendDraft,
    ClickedMarkRead,
    ClickedReceiveMessage,
    ConfirmedDiscardChanges,
    RequestedMailroomNavigation,
} from "./mailroom.message.ts"
import { initialModel } from "./mailroom.model.ts"
import { update } from "./mailroom.update.ts"

const completedDraft = () => {
    const [withTo] = update(
        initialModel,
        ChangedComposeTo({ value: "grace@urm.dev" })
    )
    const [withSubject] = update(
        withTo,
        ChangedComposeSubject({ value: "Status" })
    )
    return update(
        withSubject,
        ChangedComposeBody({ value: "Everything is ready." })
    )[0]
}

describe("mailroom update", () => {
    it("saves a durable draft", () => {
        const [model, commands] = update(completedDraft(), ClickedSaveDraft())

        expect(model.drafts).toHaveLength(1)
        expect(model.drafts[0]?.to).toBe("grace@urm.dev")
        expect(model.compose_dirty).toBe(false)
        expect(model.submission).toBe("saved")
        expect(commands).toHaveLength(1)
    })

    it("sends the compose fields to Sent", () => {
        const [model, commands] = update(completedDraft(), ClickedSendDraft())

        expect(model.messages.at(-1)).toMatchObject({
            subject: "Status",
            sender: "To: grace@urm.dev",
            folder: "sent",
        })
        expect(model.drafts).toHaveLength(0)
        expect(commands).toHaveLength(2)
    })

    it("rejects an incomplete draft", () => {
        const [model, commands] = update(initialModel, ClickedSaveDraft())

        expect(model.submission).toBe("failed")
        expect(model.error).toContain("recipient")
        expect(commands).toHaveLength(0)
    })

    it("guards navigation while the draft is dirty", () => {
        const dirty = completedDraft()
        const [blocked, commands] = update(
            dirty,
            RequestedMailroomNavigation({
                href: "/labs/mail/inbox/",
            })
        )

        expect(blocked.pending_href).toBe("/labs/mail/inbox/")
        expect(commands).toHaveLength(0)

        const [confirmed, navigation] = update(
            blocked,
            ConfirmedDiscardChanges()
        )
        expect(confirmed.compose_dirty).toBe(false)
        expect(confirmed.pending_href).toBe("")
        expect(navigation).toHaveLength(1)
    })

    it("receives demo mail and marks it read", () => {
        const [received] = update(initialModel, ClickedReceiveMessage())
        const message = received.messages.at(-1)

        expect(message?.folder).toBe("inbox")
        expect(message?.read).toBe(false)

        const [read] = update(
            received,
            ClickedMarkRead({ id: message?.id ?? "" })
        )
        expect(read.messages.at(-1)?.read).toBe(true)
    })
})

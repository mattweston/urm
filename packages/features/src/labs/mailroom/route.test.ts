import { describe, expect, it } from "vitest"
import { draftIdForPath, mailroomHref, viewRouteForPath } from "./index.ts"

describe("mailroom routes", () => {
    it("routes the inbox", () => {
        expect(viewRouteForPath(mailroomHref())).toEqual({
            _tag: "Mailbox",
            folder: "inbox",
        })
    })

    it("routes messages and drafts", () => {
        expect(viewRouteForPath("/mail/inbox/welcome/")).toEqual({
            _tag: "Message",
            folder: "inbox",
            messageId: "welcome",
        })
        expect(draftIdForPath("/mail/compose/draft-1/")).toBe("draft-1")
        expect(viewRouteForPath("/mail/compose/draft-1/")).toEqual({
            _tag: "Compose",
        })
    })
})

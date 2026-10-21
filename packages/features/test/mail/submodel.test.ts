import { Option } from "effect"
import { describe, expect, it } from "vitest"
import { Url } from "foldkit/url"

import { GotMembersMessage } from "../../src/mail/platform/app.message.ts"
import { init, update } from "../../src/mail/platform/app.update.ts"
import { MembersLoaded } from "../../src/mail/members/members.message.ts"
import { ChangedUrl } from "../../src/mail/platform/route.message.ts"

const urlForPath = (pathname: string) =>
    Url.make({
        protocol: "https:",
        host: "admin.example.test",
        pathname,
        search: Option.none(),
        port: Option.none(),
        hash: Option.none(),
    })

describe("mail data loading", () => {
    it("starts all feature data loads on the Mail index", () => {
        const [model, commands] = init("/mail/", "domain-1")

        expect(commands).toHaveLength(5)
        expect(commands.map(({ name }) => name)).toContain(
            "LoadNewsletterSends"
        )
        expect(model.contacts.contactsLoaded).toBe(false)
        expect(model.members.loading).toBe(true)
        expect(model.membersManage.loading).toBe(true)
        expect(model.subscriptions.loading).toBe(true)
        expect(model.newsletter.loading).toBe(true)
    })

    it("reuses Subscriptions when its route is entered", () => {
        const [model] = init("/mail/", "domain-1")
        const [nextModel, commands] = update(
            model,
            ChangedUrl({ url: urlForPath("/mail/subscriptions/") })
        )

        expect(nextModel.route._tag).toBe("Subscriptions")
        expect(nextModel.subscriptions.loading).toBe(true)
        expect(commands).toHaveLength(0)
    })

    it("starts the same feature loads on a direct Subscriptions visit", () => {
        const [model, commands] = init("/mail/subscriptions/", "domain-1")

        expect(model.route._tag).toBe("Subscriptions")
        expect(model.subscriptions.loading).toBe(true)
        expect(commands).toHaveLength(5)
    })

    it("opens sent delivery history directly", () => {
        const [model, commands] = init("/mail/sent/", "domain-1")

        expect(model.route._tag).toBe("Sent")
        expect(model.sent.loading).toBe(true)
        expect(commands).toHaveLength(5)
    })

    it("opens mail statistics directly", () => {
        const [model, commands] = init("/mail/stats/", "domain-1")

        expect(model.route._tag).toBe("Stats")
        expect(model.stats.loading).toBe(true)
        expect(commands).toHaveLength(5)
    })

    it("shares the loaded member collection with member management", () => {
        const [model] = init("/mail/", "domain-1")
        const member = {
            id: "member-1",
            first: "Ada",
            last: "Lovelace",
            twitter: "",
            avatar: "",
            notes: "",
            updated_at: 1,
        }
        const [nextModel] = update(
            model,
            GotMembersMessage({
                message: MembersLoaded({ members: [member] }),
            })
        )

        expect(nextModel.members.members).toEqual([member])
        expect(nextModel.membersManage.members).toEqual([member])
        expect(nextModel.membersManage.loading).toBe(false)
    })
})

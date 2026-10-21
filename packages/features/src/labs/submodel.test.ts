import { describe, expect, it } from "vitest"

import { changed_path, init } from "./submodel.ts"

describe("labs routes", () => {
    it("defers Mailroom storage until the Mail subtree is entered", () => {
        const [home, home_commands] = init("/labs")

        expect(home.route._tag).toBe("LabsHome")
        expect(home.mailroom_initialized).toBe(false)
        expect(home_commands).toHaveLength(0)

        const [mail, mail_commands] = changed_path(
            home,
            "/labs/mail/inbox"
        )

        expect(mail.route).toEqual({
            _tag: "LabsMail",
            path: "/labs/mail/inbox",
        })
        expect(mail.mailroom.view_path).toBe("/labs/mail/inbox")
        expect(mail.mailroom_initialized).toBe(true)
        expect(mail_commands.map(({ name }) => name)).toEqual([
            "LoadMailroom",
        ])
    })

    it("starts Mailroom immediately for a direct inbox route", () => {
        const [mail, commands] = init("/labs/mail/inbox")

        expect(mail.route._tag).toBe("LabsMail")
        expect(mail.mailroom_initialized).toBe(true)
        expect(commands.map(({ name }) => name)).toEqual(["LoadMailroom"])
    })
})

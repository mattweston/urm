import { describe, expect, test } from "vitest"
import { transactionalHref, urlToAppRoute } from "./route.ts"

describe("transactional email routes", () => {
    test("opens the collection and each system preview", () => {
        expect(urlToAppRoute(transactionalHref())).toEqual({
            _tag: "Transactional",
            template_id: null,
        })
        expect(urlToAppRoute("/mail/transactional/")).toEqual({
            _tag: "Transactional",
            template_id: null,
        })
        for (const template_id of [
            "auth_email_verification",
            "auth_password_reset",
            "auth_password_changed",
        ]) {
            expect(urlToAppRoute(`/mail/transactional/${template_id}`)).toEqual(
                { _tag: "Transactional", template_id }
            )
            expect(
                urlToAppRoute(`/mail/transactional/${template_id}/`)
            ).toEqual({ _tag: "Transactional", template_id })
        }
    })

    test("rejects newsletter and unknown templates at the transactional boundary", () => {
        for (const path of [
            "/mail/transactional/newsletter_basic",
            "/mail/transactional/unknown",
            "/mail/transactional/auth_password_reset/edit",
        ]) {
            expect(urlToAppRoute(path)).toEqual({ _tag: "NotFound", path })
        }
    })
})

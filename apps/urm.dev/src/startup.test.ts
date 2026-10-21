import { describe, expect, test } from "vitest"
import { development_redirect_url } from "./startup.ts"

describe("client startup host redirect", () => {
    test.each([
        "https://localhost/labs/ui",
        "capacitor://localhost/dashboard",
        "http://localhost:1420/labs/ui",
    ])(
        "keeps the native app on its bundled or live-reload origin: %s",
        (href) => {
            expect(development_redirect_url(href, true)).toBeUndefined()
        }
    )

    test("preserves browser development paths, query parameters, and routes", () => {
        expect(
            development_redirect_url(
                "http://localhost:1420/labs/ui?code=test",
                false
            )
        ).toBe("http://app.localhost:1420/labs/ui?code=test")
    })

    test.each([
        "https://app.urm.dev/dashboard",
        "http://app.localhost:1420/",
        "http://127.0.0.1:1420/",
        "capacitor://localhost/dashboard",
    ])("leaves other hosts and native schemes unchanged: %s", (href) => {
        expect(development_redirect_url(href, false)).toBeUndefined()
    })
})

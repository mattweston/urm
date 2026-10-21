import { expect, test } from "vitest"
import { lookup_breaches } from "../src/account/breach-check.ts"

test("breach lookup sends credentials only to HIBP and decodes results", async () => {
    const requests: Array<{ url: string; key: string | null }> = []
    const result = await lookup_breaches(
        " Person@Example.com ",
        "server-key",
        async (input, init) => {
            const headers = new Headers(init?.headers)
            requests.push({
                url: String(input),
                key: headers.get("hibp-api-key"),
            })
            return Response.json([
                {
                    Name: "Example",
                    Title: "Example breach",
                    Domain: "example.com",
                    BreachDate: "2020-01-01",
                    DataClasses: ["Email addresses"],
                    IsVerified: true,
                },
            ])
        }
    )
    expect(requests).toEqual([
        {
            url: "https://haveibeenpwned.com/api/v3/breachedAccount/person%40example.com?truncateResponse=false",
            key: "server-key",
        },
    ])
    expect(result.status).toBe("complete")
    expect(result.breaches).toHaveLength(1)
})

test("breach lookup handles no match, provider limits, and missing key", async () => {
    expect(
        await lookup_breaches("person@example.com", undefined, async () => {
            throw new Error("provider must not be called")
        })
    ).toMatchObject({ status: "error", breaches: [] })
    expect(
        await lookup_breaches(
            "account-exists@hibp-integration-tests.com",
            undefined,
            async () => new Response(null, { status: 404 })
        )
    ).toMatchObject({ status: "complete", breaches: [] })
    expect(
        await lookup_breaches(
            "person@example.com",
            "server-key",
            async () =>
                new Response(null, {
                    status: 429,
                    headers: { "retry-after": "7" },
                })
        )
    ).toMatchObject({
        status: "error",
        message: "Too many checks. Try again in 7 seconds.",
    })
})

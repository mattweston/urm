import { describe, expect, it } from "@effect/vitest"
import {
    handle_domain_handoff_worker_request,
    handle_domain_login_intent_worker_request,
    proxy_domain_api_request,
} from "../src/domain-handoff-worker.ts"
import {
    verifyDomainLoginIntent,
    type DomainLoginIntent,
} from "../src/domain-login-intent.ts"

const config = {
    api_url: "https://api.urm.dev",
    domain_worker_token: "worker-secret",
}

const isDomainLoginIntent = (value: unknown): value is DomainLoginIntent =>
    value instanceof Object &&
    "hostname" in value &&
    typeof value.hostname === "string" &&
    "destination" in value &&
    (value.destination === "admin" || value.destination === "marketing") &&
    "expires_at" in value &&
    typeof value.expires_at === "number" &&
    "signature" in value &&
    typeof value.signature === "string"

describe("@urm/auth - domain handoff worker", () => {
    it("issues a short-lived signed assertion for the exact domain hostname", async () => {
        const response = await handle_domain_login_intent_worker_request(
            new Request(
                "https://urm.some-domain.urm.dev/auth/domain/login-intent?destination=admin"
            ),
            config
        )
        const body: unknown = await response.json()

        expect(response.status).toBe(200)
        expect(body).toMatchObject({
            hostname: "urm.some-domain.urm.dev",
            destination: "admin",
        })

        if (isDomainLoginIntent(body)) {
            expect(
                verifyDomainLoginIntent(
                    body,
                    config.domain_worker_token,
                    body.expires_at - 1
                )
            ).toBe(true)
            expect(
                verifyDomainLoginIntent(
                    { ...body, hostname: "other-domain.urm.dev" },
                    config.domain_worker_token,
                    body.expires_at - 1
                )
            ).toBe(false)
        } else {
            throw new Error("Expected a domain login intent response")
        }
    })

    it("does not issue login assertions for invalid destinations", async () => {
        const response = await handle_domain_login_intent_worker_request(
            new Request(
                "https://custom.domain/auth/domain/login-intent?destination=unknown"
            ),
            config
        )

        expect(response.status).toBe(404)
    })

    it("exchanges the code for a scoped cookie and local redirect", async () => {
        const response = await handle_domain_handoff_worker_request(
            new Request(
                "https://urm.some-domain.urm.dev/auth/handoff?code=handoff-code"
            ),
            config,
            async (input, init) => {
                expect(input).toEqual(
                    new URL("https://api.urm.dev/auth/domain/handoff")
                )
                expect(init?.method).toBe("POST")
                expect(init?.headers).toEqual({
                    "Content-Type": "application/json",
                    "x-urm-domain-worker-token": "worker-secret",
                    "x-urm-original-host": "urm.some-domain.urm.dev",
                })
                expect(init?.body).toBe(
                    JSON.stringify({ code: "handoff-code" })
                )

                return new Response(
                    JSON.stringify({ target_route: "/orders?tab=open" }),
                    {
                        headers: {
                            "Set-Cookie":
                                "urm_domain_session=session; Domain=some-domain.urm.dev; HttpOnly",
                        },
                    }
                )
            }
        )

        expect(response.status).toBe(303)
        expect(response.headers.get("Location")).toBe("/orders?tab=open")
        expect(response.headers.get("Set-Cookie")).toContain(
            "Domain=some-domain.urm.dev"
        )
        expect(response.headers.get("Cache-Control")).toBe("no-store")
    })

    it("does not call the API without a handoff code", async () => {
        const response = await handle_domain_handoff_worker_request(
            new Request("https://some-domain.urm.dev/auth/handoff"),
            config,
            () => Promise.reject(new Error("must not call API"))
        )

        expect(response.status).toBe(404)
    })

    it("accepts the trailing-slash route used by Astro marketing hosts", async () => {
        const response = await handle_domain_handoff_worker_request(
            new Request(
                "https://urm.some-domain.urm.dev/auth/handoff/?code=handoff-code"
            ),
            config,
            () =>
                Promise.resolve(
                    new Response(JSON.stringify({ target_route: "/" }), {
                        headers: {
                            "Set-Cookie":
                                "urm_domain_session=session; Domain=some-domain.urm.dev; HttpOnly",
                        },
                    })
                )
        )

        expect(response.status).toBe(303)
        expect(response.headers.get("Location")).toBe("/")
    })

    it("rejects an invalid handoff without exposing the API response", async () => {
        const response = await handle_domain_handoff_worker_request(
            new Request(
                "https://some-domain.urm.dev/auth/handoff?code=replayed"
            ),
            config,
            () =>
                Promise.resolve(
                    new Response(JSON.stringify({ error: "Not found" }), {
                        status: 404,
                    })
                )
        )

        expect(response.status).toBe(404)
        expect(await response.text()).toBe("")
    })

    it("rejects an external target route even when the API supplied a cookie", async () => {
        const response = await handle_domain_handoff_worker_request(
            new Request("https://custom.domain/auth/handoff?code=handoff-code"),
            config,
            () =>
                Promise.resolve(
                    new Response(
                        JSON.stringify({
                            target_route: "https://attacker.example",
                        }),
                        {
                            headers: {
                                "Set-Cookie":
                                    "urm_domain_session=session; Domain=custom.domain; HttpOnly",
                            },
                        }
                    )
                )
        )

        expect(response.status).toBe(404)
    })

    it("proxies domain API routes only with worker-authenticated original-host headers", async () => {
        const response = await proxy_domain_api_request(
            new Request(
                "https://urm.some-domain.urm.dev/upload?contentType=image%2Fpng",
                {
                    method: "GET",
                    headers: {
                        Cookie: "urm_domain_session=domain-session",
                        Origin: "https://urm.some-domain.urm.dev",
                        "x-urm-domain-worker-token": "forged",
                        "x-urm-original-host": "attacker.example",
                    },
                }
            ),
            config,
            async (input, init) => {
                expect(input).toEqual(
                    new URL(
                        "https://api.urm.dev/upload?contentType=image%2Fpng"
                    )
                )
                expect(init?.headers).toBeInstanceOf(Headers)

                const headers = new Headers(init?.headers)
                expect(headers.get("Cookie")).toBe(
                    "urm_domain_session=domain-session"
                )
                expect(headers.get("Origin")).toBeNull()
                expect(headers.get("x-urm-domain-worker-token")).toBe(
                    "worker-secret"
                )
                expect(headers.get("x-urm-original-host")).toBe(
                    "urm.some-domain.urm.dev"
                )
                expect(headers.get("x-urm-original-origin")).toBe(
                    "https://urm.some-domain.urm.dev"
                )

                return new Response("upload-response", {
                    headers: { "Set-Cookie": "auth_session=central-session" },
                })
            }
        )

        expect(response.status).toBe(200)
        expect(await response.text()).toBe("upload-response")
        expect(response.headers.get("Set-Cookie")).toBeNull()
        expect(response.headers.get("Cache-Control")).toBe("no-store")
    })
})

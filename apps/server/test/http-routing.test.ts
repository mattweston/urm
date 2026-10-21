import { createServer } from "node:http"
import { describe, expect, it, vi } from "vitest"
import {
    isAuthRoute,
    isContactFormRoute,
    isGoogleAuthRoute,
    isPlatformNewsletterRoute,
} from "../src/http/auth.ts"
import {
    applyHttpRequestContextHeaders,
    CLIENT_IP_HASH_HEADER,
    makeHttpRequestContext,
    REQUEST_ID_HEADER,
    USER_AGENT_HASH_HEADER,
} from "../src/http/context.ts"
import {
    getHttpServerTimeouts,
    getConfiguredAllowedOrigins,
    handleCors,
    isOriginAllowed,
    parseAllowedOrigins,
    requestContentLengthExceedsLimit,
    requestFromIncomingMessage,
    sendResponse,
} from "../src/http/request.ts"
import {
    shouldRejectAuthMutationRequest,
    shouldRejectRpcRequest,
} from "../src/rpc/csrf.ts"

describe("server HTTP routing helpers", () => {
    it("allows the Contacts development origins without allowing them in production", () => {
        vi.stubEnv("NODE_ENV", "development")
        vi.stubEnv("TAILSCALE_URL", "http://urmdev.test")
        vi.stubEnv("ALLOWED_ORIGINS", "https://allowed.test")
        try {
            const origins = getConfiguredAllowedOrigins()
            for (const origin of [
                "http://localhost:1420",
                "http://app.localhost:1420",
                "http://127.0.0.1:1420",
                "http://urm.test:1420",
                "http://urmdev.test:1420",
                "http://app.urmdev.test:1420",
            ]) {
                expect(isOriginAllowed(origin, origins)).toBe(true)
            }
            expect(isOriginAllowed("https://untrusted.test", origins)).toBe(
                false
            )
            vi.stubEnv("NODE_ENV", "production")
            expect(getConfiguredAllowedOrigins()).toEqual([
                "https://allowed.test",
            ])
        } finally {
            vi.unstubAllEnvs()
        }
    })

    it("rejects untrusted CORS preflights without granting credentials", async () => {
        const server = createServer((request, response) => {
            if (handleCors(request, response, ["https://allowed.test"])) {
                response.end("ok")
            }
        })

        await new Promise<void>((resolve, reject) => {
            server.once("error", reject)
            server.listen(0, "127.0.0.1", resolve)
        })

        const address = server.address()
        if (address === null || typeof address === "string") {
            throw new Error("Expected the test server to use a TCP port")
        }

        try {
            const response = await fetch(`http://127.0.0.1:${address.port}`, {
                method: "OPTIONS",
                headers: { Origin: "https://blocked.test" },
            })

            expect(response.status).toBe(403)
            expect(
                response.headers.get("access-control-allow-origin")
            ).toBeNull()
            expect(
                response.headers.get("access-control-allow-credentials")
            ).toBeNull()
        } finally {
            await new Promise<void>((resolve, reject) => {
                server.close((error) =>
                    error === undefined ? resolve() : reject(error)
                )
            })
        }
    })

    it("returns credentialed CORS headers for trusted preflights", async () => {
        const server = createServer((request, response) => {
            if (handleCors(request, response, ["https://allowed.test"])) {
                response.end("ok")
            }
        })

        await new Promise<void>((resolve, reject) => {
            server.once("error", reject)
            server.listen(0, "127.0.0.1", resolve)
        })

        const address = server.address()
        if (address === null || typeof address === "string") {
            throw new Error("Expected the test server to use a TCP port")
        }

        try {
            const response = await fetch(`http://127.0.0.1:${address.port}`, {
                method: "OPTIONS",
                headers: { Origin: "https://allowed.test" },
            })

            expect(response.status).toBe(204)
            expect(response.headers.get("access-control-allow-origin")).toBe(
                "https://allowed.test"
            )
            expect(
                response.headers.get("access-control-allow-credentials")
            ).toBe("true")
        } finally {
            await new Promise<void>((resolve, reject) => {
                server.close((error) =>
                    error === undefined ? resolve() : reject(error)
                )
            })
        }
    })

    it("forwards every Set-Cookie header from an auth response", async () => {
        const server = createServer((_, response) => {
            const headers = new Headers()
            headers.append("set-cookie", "auth=session-token; Path=/; HttpOnly")
            headers.append("set-cookie", "google_oauth=; Path=/; Max-Age=0")

            void sendResponse(response, new Response(null, { headers }), {
                request_id: "req-auth-cookies",
            })
        })

        await new Promise<void>((resolve, reject) => {
            server.once("error", reject)
            server.listen(0, "127.0.0.1", resolve)
        })

        const address = server.address()
        if (address === null || typeof address === "string") {
            throw new Error("Expected the test server to use a TCP port")
        }

        try {
            const response = await fetch(`http://127.0.0.1:${address.port}`)

            expect(response.headers.getSetCookie()).toEqual([
                "auth=session-token; Path=/; HttpOnly",
                "google_oauth=; Path=/; Max-Age=0",
            ])
            expect(response.headers.get("x-content-type-options")).toBe(
                "nosniff"
            )
            expect(response.headers.get("referrer-policy")).toBe("no-referrer")
        } finally {
            await new Promise<void>((resolve, reject) => {
                server.close((error) =>
                    error === undefined ? resolve() : reject(error)
                )
            })
        }
    })

    it("streams bytes before the source finishes", async () => {
        let finish = () => {}
        const server = createServer((_, response) => {
            const body = new ReadableStream<Uint8Array>({
                start(controller) {
                    controller.enqueue(new Uint8Array([0, 255, 128]))
                    finish = () => {
                        finish = () => {}
                        controller.close()
                    }
                },
            })
            void sendResponse(response, new Response(body), {
                request_id: "req-stream",
            }).catch(() => response.destroy())
        })
        await new Promise<void>((resolve, reject) => {
            server.once("error", reject)
            server.listen(0, "127.0.0.1", resolve)
        })
        const address = server.address()
        if (address === null || typeof address === "string") {
            throw new Error("Expected a TCP port")
        }
        try {
            const response = await fetch(`http://127.0.0.1:${address.port}`)
            const reader = response.body?.getReader()
            expect((await reader?.read())?.value).toEqual(
                new Uint8Array([0, 255, 128])
            )
            finish()
            expect((await reader?.read())?.done).toBe(true)
        } finally {
            finish()
            server.closeAllConnections()
            await new Promise<void>((resolve, reject) => {
                server.close((error) =>
                    error === undefined ? resolve() : reject(error)
                )
            })
        }
    })

    it("detects Google auth routes separately from fallback auth routes", () => {
        expect(isGoogleAuthRoute("/auth/login-url")).toBe(true)
        expect(isGoogleAuthRoute("/auth/google/authorize")).toBe(true)
        expect(isGoogleAuthRoute("/auth/google/callback")).toBe(true)
        expect(isGoogleAuthRoute("/auth/login")).toBe(false)

        expect(isAuthRoute("/auth")).toBe(true)
        expect(isAuthRoute("/auth/login")).toBe(true)
        expect(isAuthRoute("/api/rpc")).toBe(false)
    })

    it("recognizes public newsletter routes with or without a trailing slash", () => {
        expect(isPlatformNewsletterRoute("/mail/newsletter/subscribe")).toBe(
            true
        )
        expect(isPlatformNewsletterRoute("/mail/newsletter/subscribe/")).toBe(
            true
        )
        expect(isPlatformNewsletterRoute("/mail/newsletter/confirm")).toBe(true)
        expect(isPlatformNewsletterRoute("/mail/newsletter/unsubscribe/")).toBe(
            true
        )
        expect(isPlatformNewsletterRoute("/mail/newsletter")).toBe(false)
    })

    it("recognizes a domain contact-form submission route only", () => {
        expect(isContactFormRoute("/mail/contact/submit")).toBe(true)
        expect(isContactFormRoute("/mail/contact/submit/")).toBe(true)
        expect(isContactFormRoute("/mail/contact/")).toBe(false)
    })

    it("parses configured CORS origins with trimming", () => {
        expect(
            parseAllowedOrigins(
                "http://localhost:4321, https://example.test ,,http://127.0.0.1:4321"
            )
        ).toEqual([
            "http://localhost:4321",
            "https://example.test",
            "http://127.0.0.1:4321",
        ])
    })

    it("requires an explicit CORS allowlist in production", () => {
        expect(parseAllowedOrigins(undefined, true)).toEqual([])
        expect(
            parseAllowedOrigins("https://allowed.test, invalid", true)
        ).toEqual(["https://allowed.test"])
    })

    it("rejects declared request bodies over the configured limit", () => {
        expect(requestContentLengthExceedsLimit(undefined, 1_024)).toBe(false)
        expect(requestContentLengthExceedsLimit("1024", 1_024)).toBe(false)
        expect(requestContentLengthExceedsLimit("1025", 1_024)).toBe(true)
        expect(requestContentLengthExceedsLimit("not-a-number", 1_024)).toBe(
            true
        )
    })

    it("rejects a chunked request body that exceeds the stream limit", async () => {
        const server = createServer((request, response) => {
            void requestFromIncomingMessage(
                request,
                new URL("http://server.test/request"),
                { request_id: "req-body-limit" },
                4
            ).then((webRequest) => {
                response.writeHead(webRequest === undefined ? 413 : 200)
                response.end()
            })
        })

        await new Promise<void>((resolve, reject) => {
            server.once("error", reject)
            server.listen(0, "127.0.0.1", resolve)
        })

        const address = server.address()
        if (address === null || typeof address === "string") {
            throw new Error("Expected the test server to use a TCP port")
        }

        try {
            const response = await fetch(`http://127.0.0.1:${address.port}`, {
                method: "POST",
                body: "12345",
            })

            expect(response.status).toBe(413)
        } finally {
            await new Promise<void>((resolve, reject) => {
                server.close((error) =>
                    error === undefined ? resolve() : reject(error)
                )
            })
        }
    })

    it("uses bounded defaults for HTTP server timeouts", () => {
        expect(getHttpServerTimeouts()).toEqual({
            request_timeout_ms: 30_000,
            headers_timeout_ms: 15_000,
            keep_alive_timeout_ms: 5_000,
        })
    })

    it("allows the configured Tailnet web development origin by default", () => {
        expect(parseAllowedOrigins(undefined)).toContain(
            "http://100.113.94.35:5173"
        )
    })

    it("allows missing origins and rejects unknown origins", () => {
        const allowedOrigins = ["https://allowed.test"]

        expect(isOriginAllowed(undefined, allowedOrigins)).toBe(true)
        expect(isOriginAllowed("https://allowed.test", allowedOrigins)).toBe(
            true
        )
        expect(isOriginAllowed("https://blocked.test", allowedOrigins)).toBe(
            false
        )
    })

    it("rejects POST RPC requests without the CSRF header", () => {
        expect(
            shouldRejectRpcRequest(
                new Request("http://urmdev.tail4eaae8.ts.net/api/rpc", {
                    method: "GET",
                })
            )
        ).toBe(false)
        expect(
            shouldRejectRpcRequest(
                new Request("http://urmdev.tail4eaae8.ts.net/api/rpc", {
                    method: "POST",
                })
            )
        ).toBe(true)
        expect(
            shouldRejectRpcRequest(
                new Request("http://urmdev.tail4eaae8.ts.net/api/rpc", {
                    method: "POST",
                    headers: { "x-requested-with": "XMLHttpRequest" },
                })
            )
        ).toBe(false)
    })

    it("requires the CSRF header for browser auth mutations", () => {
        expect(
            shouldRejectAuthMutationRequest(
                new Request("https://api.urm.dev/auth/logout", {
                    method: "POST",
                })
            )
        ).toBe(true)
        expect(
            shouldRejectAuthMutationRequest(
                new Request("https://api.urm.dev/auth/domain/select", {
                    method: "POST",
                })
            )
        ).toBe(true)
        for (const path of [
            "/auth/domains/create",
            "/auth/domains/update",
            "/auth/domains/delete",
        ]) {
            expect(
                shouldRejectAuthMutationRequest(
                    new Request(`https://api.urm.dev${path}`, {
                        method: "POST",
                    })
                )
            ).toBe(true)
        }
        expect(
            shouldRejectAuthMutationRequest(
                new Request("https://api.urm.dev/auth/logout", {
                    method: "POST",
                    headers: { "x-requested-with": "XMLHttpRequest" },
                })
            )
        ).toBe(false)
        expect(
            shouldRejectAuthMutationRequest(
                new Request("https://api.urm.dev/auth/domain/handoff", {
                    method: "POST",
                })
            )
        ).toBe(false)
    })

    it("propagates valid request ids and hashes client metadata", () => {
        const context = makeHttpRequestContext(
            new Headers({
                "x-request-id": "req-test-001",
                "x-forwarded-for": "203.0.113.10, 10.0.0.1",
                "x-real-ip": "198.51.100.20",
                "user-agent": "test-agent",
            }),
            "192.0.2.30",
            true
        )

        expect(context.request_id).toBe("req-test-001")
        expect(context.client_ip_hash).toHaveLength(64)
        expect(context.client_ip_hash).not.toBe("203.0.113.10")
        expect(context.user_agent_hash).toHaveLength(64)
        expect(context.user_agent_hash).not.toBe("test-agent")
    })

    it("ignores forwarded client IP headers unless the proxy is trusted", () => {
        const context = makeHttpRequestContext(
            new Headers({
                "x-forwarded-for": "203.0.113.10",
                "x-real-ip": "198.51.100.20",
            }),
            "192.0.2.30"
        )

        expect(context.client_ip_hash).toHaveLength(64)
        expect(context.client_ip_hash).not.toBe("203.0.113.10")
        expect(context.client_ip_hash).not.toBe("198.51.100.20")
    })

    it("replaces invalid request ids", () => {
        const context = makeHttpRequestContext(
            new Headers({
                "x-request-id": "invalid request id with spaces",
            }),
            undefined
        )

        expect(context.request_id).not.toBe("invalid request id with spaces")
        expect(context.request_id.length).toBeGreaterThan(0)
    })

    it("applies request context headers for downstream handlers", () => {
        const headers = applyHttpRequestContextHeaders(new Headers(), {
            request_id: "req-test-002",
            client_ip_hash: "ip-hash",
            user_agent_hash: "ua-hash",
        })

        expect(headers.get(REQUEST_ID_HEADER)).toBe("req-test-002")
        expect(headers.get(CLIENT_IP_HASH_HEADER)).toBe("ip-hash")
        expect(headers.get(USER_AGENT_HASH_HEADER)).toBe("ua-hash")
    })
})

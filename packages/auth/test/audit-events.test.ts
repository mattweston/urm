import { describe, expect, it } from "@effect/vitest"
import { sanitizeAuditMetadata } from "../src/audit-events.ts"
import { sanitizeObservabilityMetadata } from "../src/observability-logs.ts"

describe("@urm/auth - audit events", () => {
    it("redacts secret metadata values", () => {
        expect(
            sanitizeAuditMetadata({
                route: "login",
                password: "plain-text",
                access_token: "oauth-token",
                cookie: "raw-cookie",
                nested: {
                    client_secret: "secret-value",
                    safe: "kept",
                },
            })
        ).toEqual({
            route: "login",
            password: "[redacted]",
            access_token: "[redacted]",
            cookie: "[redacted]",
            nested: {
                client_secret: "[redacted]",
                safe: "kept",
            },
        })
    })

    it("keeps safe classified metadata", () => {
        expect(
            sanitizeAuditMetadata({
                email_hash: "hash-value",
                client_ip_hash: "ip-hash",
                reason_class: "invalid_credentials",
            })
        ).toEqual({
            email_hash: "hash-value",
            client_ip_hash: "ip-hash",
            reason_class: "invalid_credentials",
        })
    })

    it("redacts secret metadata in observability logs", () => {
        expect(
            sanitizeObservabilityMetadata({
                authorization: "Bearer secret",
                nested: { refresh_token: "token" },
                request_id: "req_1",
            })
        ).toEqual({
            authorization: "[redacted]",
            nested: { refresh_token: "[redacted]" },
            request_id: "req_1",
        })
    })
})

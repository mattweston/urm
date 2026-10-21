import { describe, expect, it } from "@effect/vitest"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../src/auth-legacy/rpc-middleware.ts"
import { MailRpcs } from "../src/mail/routes.ts"

const mail_rpcs = [
    "mail.newsletter.send",
    "mail.subscriptions.list",
    "mail.subscriptions.set",
]

const hasMiddleware = (
    middlewares: Iterable<unknown> | undefined,
    middleware: unknown
) =>
    middlewares !== undefined &&
    [...middlewares].some((item) => item === middleware)

describe("domain-scoped newsletter RPC contracts", () => {
    it("requires authenticated domain-manager authority for every procedure", () => {
        for (const name of mail_rpcs) {
            const rpc = MailRpcs.requests.get(name)

            expect(
                hasMiddleware(rpc?.middlewares, ActiveDomainRpcMiddleware)
            ).toBe(true)
            expect(
                hasMiddleware(rpc?.middlewares, AuthenticatedRpcMiddleware)
            ).toBe(true)
            expect(
                hasMiddleware(rpc?.middlewares, DomainManagerRpcMiddleware)
            ).toBe(true)
        }
    })
})

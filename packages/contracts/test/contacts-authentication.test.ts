import { describe, expect, it } from "@effect/vitest"
import * as LegacyAuth from "../src/auth-legacy/index.ts"
import { ContactsRpcs } from "../src/contacts-old/routes.ts"
import { RpcApi } from "../src/rpc/index.ts"
import { AuthenticatedRpcMiddleware } from "../src/auth/index.ts"

describe("canonical RPC contracts", () => {
    it("requires account authentication for every Remote operation", () => {
        expect(
            [...RpcApi.requests.values()].every((rpc) =>
                rpc.middlewares.has(AuthenticatedRpcMiddleware)
            )
        ).toBe(true)
    })
})

describe("archived contact RPC contracts", () => {
    it("retains legacy authentication for every procedure", () => {
        expect(
            [...ContactsRpcs.requests.values()].every((rpc) =>
                rpc.middlewares.has(LegacyAuth.AuthenticatedRpcMiddleware)
            )
        ).toBe(true)
        expect(LegacyAuth.AuthenticatedRpcMiddleware.key).not.toBe(
            AuthenticatedRpcMiddleware.key
        )
    })
})

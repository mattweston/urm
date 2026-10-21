import { describe, it, expect } from "@effect/vitest"
import {
    hasRpcCsrfHeader,
    RPC_CSRF_HEADER_NAME,
    RPC_CSRF_HEADER_VALUE,
} from "../../src/rpc/index.ts"

describe("RPC Utils", () => {
    it("should export CSRF constants", () => {
        expect(RPC_CSRF_HEADER_NAME).toBe("x-requested-with")
        expect(RPC_CSRF_HEADER_VALUE).toBe("XMLHttpRequest")
    })

    it("accepts only the expected CSRF request header", () => {
        expect(
            hasRpcCsrfHeader(
                new Request("https://example.com/api/rpc", {
                    headers: { [RPC_CSRF_HEADER_NAME]: RPC_CSRF_HEADER_VALUE },
                })
            )
        ).toBe(true)
        expect(
            hasRpcCsrfHeader(new Request("https://example.com/api/rpc"))
        ).toBe(false)
        expect(
            hasRpcCsrfHeader(
                new Request("https://example.com/api/rpc", {
                    headers: { [RPC_CSRF_HEADER_NAME]: "fetch" },
                })
            )
        ).toBe(false)
    })
})

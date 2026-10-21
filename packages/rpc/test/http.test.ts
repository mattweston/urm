import { describe, expect, it } from "vitest"
import { rpc_response } from "../src/http.ts"

const request = new Request("https://urm.test/api/rpc", { method: "POST" })

describe("RPC response lifetime", () => {
    it("delivers chunks before completion and releases resources when cancelled", async () => {
        let released = 0
        let cancelled = false
        const source = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new TextEncoder().encode("first"))
            },
            cancel() {
                cancelled = true
            },
        })
        const response = await rpc_response(
            request,
            async () => new Response(source),
            async () => {
                released++
            }
        )
        const reader = response.body?.getReader()
        expect(reader).toBeDefined()
        expect(new TextDecoder().decode((await reader?.read())?.value)).toBe(
            "first"
        )
        expect(released).toBe(0)
        await reader?.cancel()
        expect(cancelled).toBe(true)
        expect(released).toBe(1)
    })

    it("releases resources after normal completion and stream errors", async () => {
        let released = 0
        const response = await rpc_response(
            request,
            async () => new Response("complete"),
            async () => {
                released++
            }
        )
        expect(await response.text()).toBe("complete")
        expect(released).toBe(1)
        const broken = await rpc_response(
            request,
            async () =>
                new Response(
                    new ReadableStream({
                        start(controller) {
                            controller.error(new Error("broken stream"))
                        },
                    })
                ),
            async () => {
                released++
            }
        )
        await expect(broken.text()).rejects.toThrow("broken stream")
        expect(released).toBe(2)
    })
})

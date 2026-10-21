import { describe, expect, it } from "@effect/vitest"
import { devServerUrls } from "../../src/dev-server/index.ts"

type ResolvedUrls = { local: Array<string>; network: Array<string> }

const listeningServer = (resolvedUrls: ResolvedUrls) => {
    const server = {
        resolvedUrls: null as ResolvedUrls | null,
        listen: (_port?: number, _isRestart?: boolean): Promise<unknown> => {
            server.resolvedUrls = resolvedUrls
            return Promise.resolve(server)
        },
    }

    return server
}

describe("Dev Server Utils", () => {
    it("appends the dev origin at the port the server resolved", async () => {
        const urls = {
            local: ["http://localhost:4321/"],
            network: ["http://192.168.0.128:4321/"],
        }
        const server = listeningServer(urls)

        devServerUrls("http://urmdev.test")?.configureServer(server)
        await server.listen()

        expect(urls.network).toStrictEqual([
            "http://192.168.0.128:4321/",
            "http://urmdev.test:4321/",
        ])
    })

    it("keeps the base path and adds a scheme to a bare hostname", async () => {
        const urls = { local: ["http://localhost:4324/docs/"], network: [] }
        const server = listeningServer(urls)

        devServerUrls("urmdev.test/")?.configureServer(server)
        await server.listen()

        expect(urls.network).toStrictEqual(["http://urmdev.test:4324/docs/"])
    })

    it("does not repeat itself across dev server restarts", async () => {
        const urls = { local: ["http://localhost:5173/"], network: [] }
        const server = listeningServer(urls)

        devServerUrls("http://urmdev.test")?.configureServer(server)
        await server.listen()
        await server.listen(5173, true)

        expect(urls.network).toStrictEqual(["http://urmdev.test:5173/"])
    })

    it("adds nothing when dev is local", () => {
        expect(devServerUrls("http://localhost")).toBeUndefined()
        expect(devServerUrls("")).toBeUndefined()
    })
})

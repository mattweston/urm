import { Cause, Effect, Option } from "effect"
import { describe, expect, it } from "vitest"

import { buildSite, RoutePlanError } from "../src/index.ts"
import type { ReleaseSnapshotType } from "../src/index.ts"

const template =
    '<!doctype html><html><head><title>Fixture</title></head><body><div id="root"></div></body></html>'

const snapshot = (paths: ReadonlyArray<string>): ReleaseSnapshotType => ({
    release_id: "test-release",
    site_origin: "https://example.com",
    pages: paths.map((path) => ({
        path,
        title: path,
        heading: path,
        body: path,
        content_type: "text",
    })),
})

const render = (page: ReleaseSnapshotType["pages"][number]) =>
    Effect.succeed({
        html: `<main><h1>${page.heading}</h1></main>`,
        title: page.title,
    })

describe("buildSite route planning", () => {
    it("maps canonical routes to deterministic output paths", async () => {
        const result = await Effect.runPromise(
            buildSite({
                snapshot: snapshot(["/about/", "/404.html", "/"]),
                template,
                render,
            })
        )

        expect(result.artifacts.map(({ output_path }) => output_path)).toEqual([
            "index.html",
            "404.html",
            "about/index.html",
        ])
        expect(result.manifest.routes).toEqual(
            result.artifacts.map(({ route, output_path, media_type }) => ({
                route,
                output_path,
                media_type,
            }))
        )
    })

    it.each(["/api/users/", "/../private/", "/about", "/assets/"])(
        "rejects unsafe route %s",
        async (path) => {
            const exit = await Effect.runPromiseExit(
                buildSite({ snapshot: snapshot([path]), template, render })
            )

            expect(exit._tag).toBe("Failure")
            let failure: unknown
            if (exit._tag === "Failure") {
                failure = Option.getOrThrow(Cause.findErrorOption(exit.cause))
            }
            expect(failure).toBeInstanceOf(RoutePlanError)
        }
    )

    it("rejects duplicate routes", async () => {
        const exit = await Effect.runPromiseExit(
            buildSite({ snapshot: snapshot(["/", "/"]), template, render })
        )

        expect(exit._tag).toBe("Failure")
    })

    it("rejects a release without routes", async () => {
        const exit = await Effect.runPromiseExit(
            buildSite({ snapshot: snapshot([]), template, render })
        )

        expect(exit._tag).toBe("Failure")
    })
})

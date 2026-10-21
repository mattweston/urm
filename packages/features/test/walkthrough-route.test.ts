import { describe, expect, it } from "vitest"

import {
    foldkitRouteForPath,
    isFoldkitPath,
    walkthrough_href,
    walkthrough_segments,
} from "../src/learn/walkthrough/route.ts"

const ROUTE_FOR_SEGMENT: ReadonlyArray<readonly [string, string]> = [
    ["state/counter", "ModelMessageRoute"],
    ["state/derived-values", "DerivedViewRoute"],
    ["state/combined-inputs", "DerivedInputRoute"],
    ["side-effects/on-change", "CommandRoute"],
    ["side-effects/decoding", "CommandSchemaRoute"],
    ["side-effects/on-demand", "CommandTriggerRoute"],
    ["async/combining", "AsyncDataRoute"],
    ["async/optimistic-update", "OptimisticUpdateRoute"],
    ["async/streaming", "SubscriptionRoute"],
    ["lists/items", "TodoListRoute"],
    ["lists/filtering", "TodoFilterRoute"],
    ["components/embedding", "SubmodelRoute"],
]

describe("walkthrough routes", () => {
    it("claims exactly its own lesson paths", () => {
        expect(isFoldkitPath("/learn/state/counter")).toBe(true)
        expect(isFoldkitPath("/learn/side-effects/on-change/")).toBe(true)
        // The index, a bare subject and other lessons are not its own.
        expect(isFoldkitPath("/learn")).toBe(false)
        expect(isFoldkitPath("/learn/")).toBe(false)
        expect(isFoldkitPath("/learn/state")).toBe(false)
        expect(isFoldkitPath("/learn/number")).toBe(false)
    })

    it("files every lesson under a subject, never under a library name", () => {
        expect(walkthrough_segments).toHaveLength(12)
        const subjects = new Set(
            walkthrough_segments.map((segment) => segment.split("/")[0])
        )
        expect([...subjects].sort()).toEqual([
            "async",
            "components",
            "lists",
            "side-effects",
            "state",
        ])
        for (const segment of walkthrough_segments) {
            expect(segment).toMatch(/^[a-z-]+\/[a-z-]+$/)
            expect(segment).not.toMatch(/foldkit|effect-/)
        }
    })

    it("maps every path to its route, with or without a trailing slash", () => {
        for (const [segment, tag] of ROUTE_FOR_SEGMENT) {
            expect(foldkitRouteForPath(walkthrough_href(segment))._tag).toBe(
                tag
            )
            expect(foldkitRouteForPath(`/learn/${segment}`)._tag).toBe(tag)
        }
    })

    it("falls back to NotFound for an unknown path", () => {
        expect(foldkitRouteForPath("/learn/state/nope")._tag).toBe(
            "NotFoundRoute"
        )
    })
})

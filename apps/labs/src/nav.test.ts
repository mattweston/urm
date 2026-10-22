/** Subjects are derived from where lessons live, so these guard that a subject
 *  path resolves to the subject's own page rather than falling through to the
 *  Learn index or to a lesson.
 */
import { describe, expect, it } from "vitest"
import { subject_for_path, subjects } from "./lessons.ts"
import { breadcrumb, route_tag, route_title } from "./nav.ts"

describe("learn subjects", () => {
    it("resolves a subject path to that subject", () => {
        for (const subject of subjects) {
            expect(subject_for_path(subject.href)?.slug).toBe(subject.slug)
            expect(subject_for_path(`/learn/${subject.slug}`)?.slug).toBe(
                subject.slug
            )
        }
    })

    it("is not a subject when the path names a lesson or the index", () => {
        expect(subject_for_path("/learn")).toBeUndefined()
        expect(subject_for_path("/learn/")).toBeUndefined()
        expect(subject_for_path("/learn/scope/acquire-release")).toBeUndefined()
    })

    it("titles and tags a subject as itself", () => {
        const scope = subjects.find((one) => one.slug === "scope")
        expect(scope).toBeDefined()
        expect(route_tag("/learn/scope/")).toBe("LearnScope")
        expect(route_title("/learn/scope/", undefined)).toBe(
            "Scope · Learn · URM"
        )
        expect(breadcrumb("/learn/scope/", undefined)).toBe("Learn / Scope")
    })

    it("puts a lesson under its subject in the breadcrumb", () => {
        expect(breadcrumb("/learn/scope/acquire-release/", undefined)).toBe(
            "Learn / Scope / Acquire Release"
        )
        // A lesson that is its own subject has no parent to name.
        expect(breadcrumb("/learn/number/", undefined)).toBe("Learn / Number")
    })

    it("gives every subject at least one lesson", () => {
        expect(subjects.length).toBeGreaterThan(0)
        for (const subject of subjects) {
            expect(subject.lessons.length).toBeGreaterThan(0)
        }
    })
})

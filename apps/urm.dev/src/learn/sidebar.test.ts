/** The sidebar is generated from the lesson catalogue, and the catalogue's
 *  hrefs mirror where the lessons live on disk. These guard that the two stay
 *  in step: a lesson at `learn/<subject>/<lesson>` must appear under a
 *  `<subject>` group, never loose at the top level.
 */
import { describe, expect, it } from "vitest"
import { lessons, segments_of } from "./lessons.ts"
import { nav_items } from "./sidebar.ts"

const items = nav_items<string>()

const group_holding = (href: string) =>
    items.find((item) =>
        (item.children ?? []).some((child) => child.href === href)
    )

describe("learn sidebar", () => {
    it("puts every nested lesson under a group named for its folder", () => {
        const nested = lessons.filter(
            (lesson) => segments_of(lesson.href).length > 1
        )
        expect(nested.length).toBeGreaterThan(0)

        const misplaced = nested.filter((lesson) => {
            const group = group_holding(lesson.href)
            const subject = segments_of(lesson.href)[0]
            return (
                group === undefined ||
                group.label.toLowerCase().replace(/ /g, "-") !== subject
            )
        })
        expect(misplaced.map((lesson) => lesson.href)).toEqual([])
    })

    it("leaves a lesson that is its own subject at the top level", () => {
        const flat = lessons.filter(
            (lesson) => segments_of(lesson.href).length === 1
        )
        const missing = flat.filter(
            (lesson) => !items.some((item) => item.href === lesson.href)
        )
        expect(missing.map((lesson) => lesson.href)).toEqual([])
    })

    it("groups every subject exactly once", () => {
        const labels = items.map((item) => item.label)
        expect(new Set(labels).size).toBe(labels.length)
    })

    it("names no group after a library", () => {
        const offenders = items.filter((item) =>
            /foldkit|effect-|visual/i.test(item.label)
        )
        expect(offenders.map((item) => item.label)).toEqual([])
    })

    it("fills every subject group", () => {
        for (const subject of [
            "Constructors",
            "Concurrency",
            "Error Handling",
            "Schedule",
            "Ref",
            "Scope",
            "State",
            "Side Effects",
            "Async",
            "Lists",
            "Components",
        ]) {
            const group = items.find((item) => item.label === subject)
            expect(group?.label).toBe(subject)
            expect((group?.children ?? []).length).toBeGreaterThan(0)
        }
    })
})

/** Guards the Tailwind port of the Visual Effect lesson.
 *
 *  The lesson used to carry a stylesheet of `.visual-effect .thing` rules. When
 *  those moved to inline utilities, two elements silently lost every class they
 *  had — the trigger button collapsed and the highlighted code lost its
 *  colours — because nothing rendered the view in a test. This renders it.
 */
import { Effect } from "effect"
import { Server } from "foldkit/experimental"
import { describe, expect, it } from "vitest"
import {
    effectRouteForPath,
    example_href,
    init,
    view,
} from "../src/learn/runner/index.ts"
import * as Styles from "../src/learn/runner/styles.ts"

const render = async (): Promise<string> => {
    const { model } = init(
        effectRouteForPath(example_href("constructors/succeed"))
    )
    const rendered = await Effect.runPromise(
        Server.renderToString(
            {
                init: () => ({ model }),
                view: (current: typeof model, h) => ({
                    title: "Visual Effect",
                    body: h.div(
                        [],
                        [
                            h.submodel({
                                slotId: "visual-effect",
                                model: current,
                                view,
                                toParentMessage: (message) => message,
                            }),
                        ]
                    ),
                }),
            },
            { buildId: "visual-effect-view-test" }
        )
    )
    return rendered.html
}

describe("visual effect styles", () => {
    it("gives the sound toggle exactly one track colour per state", () => {
        // Two `after:bg-*` on one element are resolved by stylesheet order, not
        // class order, so a state that also inherits a base colour is a coin
        // flip. Each state must contribute exactly one.
        for (const preference of ["on", "off", "system"]) {
            const classes = Styles.sound(preference).split(/\s+/)
            const backgrounds = classes.filter((one) =>
                one.startsWith("after:bg-")
            )
            expect(backgrounds).toHaveLength(1)
        }
        expect(Styles.sound("on")).not.toBe(Styles.sound("off"))
        expect(Styles.sound("system")).not.toBe(Styles.sound("off"))
    })

    it("animates the star and the sparkle while running", () => {
        expect(Styles.card_icon_slot("star", "running")).toContain(
            "effect-example-icon-spin"
        )
        expect(Styles.card_icon_slot("star", "idle")).not.toContain(
            "effect-example-icon-spin"
        )
        expect(Styles.sparkle("running")).toContain(
            "effect-example-sparkle-pulse"
        )
        expect(Styles.brand_mark("running")).toContain(
            "effect-example-brand-spin"
        )
    })

    it("leaves the icon entrance outside the reduced-motion guard", () => {
        // The original guarded only the brand spin, sparkle pulse and node
        // flashes; the entrance and star spin always ran.
        expect(Styles.card_icon_slot("play", "idle")).toContain(
            "animate-[effect-example-icon-enter"
        )
        expect(Styles.card_icon_slot("play", "idle")).not.toContain(
            "motion-safe:animate-[effect-example-icon-enter"
        )
    })

    it("gives every run state its own node fill, including idle", () => {
        const fills = [
            "idle",
            "running",
            "succeeded",
            "failed",
            "interrupted",
        ].map((phase) => Styles.card_icon(phase))
        for (const fill of fills) {
            expect(fill).toContain("[--ve-node-fill:")
        }
        expect(new Set(fills).size).toBe(fills.length)
    })
})

describe("visual effect view", () => {
    it("gives the trigger button its own box", async () => {
        const html = await render()
        expect(html).toMatch(/<button[^>]*class="[^"]*size-10[^"]*"/)
        expect(html).toMatch(/<button[^>]*class="[^"]*rounded-md[^"]*"/)
    })

    it("colours highlighted code through the app-wide Shiki tokens", async () => {
        const html = await render()
        // `shiki-tokens` is what puts the variables in scope; without it every
        // token resolves to nothing.
        expect(html).toContain("shiki-tokens")
        expect(html).toContain("--documentation-shiki-")
        expect(html).not.toContain("--visual-effect-shiki-")
    })

    it("leaves no stylesheet-era class names behind", async () => {
        const html = await render()
        for (const stale of [
            "example-card-icon ",
            "example-card-sparkle",
            "effect-phase-",
            "visual-main",
            "visual-content",
            "site-brand-mark",
            "intro-card",
            "code-block",
            "effect-node ",
            "ref-panel",
            "schedule-timeline ",
        ]) {
            expect(html).not.toContain(stale)
        }
    })
})

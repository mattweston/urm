import { Effect } from "effect"
import { describe, expect, it } from "vitest"

import {
    decodeLandingPageContent,
    decodePublishedLandingPageContent,
} from "../src/schemas/landing-pages.ts"
import {
    marketing_starter_landing_page,
    urm_marketing_landing_page,
} from "../src/landing-page-presets.ts"

describe("landing page content", () => {
    it("decodes both system presets", async () => {
        const starter = await Effect.runPromise(
            decodeLandingPageContent(
                JSON.stringify(marketing_starter_landing_page)
            )
        )
        const urm = await Effect.runPromise(
            decodeLandingPageContent(JSON.stringify(urm_marketing_landing_page))
        )

        expect(starter.preset_id).toBe("marketing_starter")
        expect(starter.motion).toBe("rise")
        expect(urm.motion).toBe("stagger")
        expect(urm.blocks.some((block) => block._tag === "LogoGrid")).toBe(true)
    })

    it("rejects duplicate stable block IDs", async () => {
        const duplicated = {
            ...marketing_starter_landing_page,
            blocks: [
                marketing_starter_landing_page.blocks[0],
                marketing_starter_landing_page.blocks[0],
            ],
        }
        const exit = await Effect.runPromiseExit(
            decodeLandingPageContent(JSON.stringify(duplicated))
        )

        expect(exit._tag).toBe("Failure")
    })

    it("requires resolved images at the published renderer boundary", async () => {
        const page = {
            schema_version: 1,
            blocks: [
                {
                    _tag: "Hero",
                    id: "hero",
                    heading: "Hello",
                    body: "World",
                    actions: [],
                    image: {
                        _tag: "DomainImage",
                        image_id: "image-1",
                        alt: "Example",
                    },
                },
            ],
        }
        const exit = await Effect.runPromiseExit(
            decodePublishedLandingPageContent(JSON.stringify(page))
        )

        expect(exit._tag).toBe("Failure")
    })
})

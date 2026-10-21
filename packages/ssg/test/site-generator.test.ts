import { Effect, Schema } from "effect"
import { type Document, type HtmlBuilder } from "foldkit/html"
import { renderToString } from "foldkit/experimental/server"
import { describe, expect, it } from "vitest"

import {
    buildSite,
    PublishedPage,
    type PublishedPageType,
    type ReleaseSnapshotType,
} from "../src/index.ts"

const template =
    '<!doctype html><html><head><title>Fixture</title></head><body><div id="root"></div></body></html>'

const Message = Schema.Struct({ _tag: Schema.Literal("Noop") })
type Message = typeof Message.Type

const application = {
    Flags: PublishedPage,
    init: (page: PublishedPageType) => ({
        model: page,
        commands: [],
    }),
    view: (page: PublishedPageType, h: HtmlBuilder<Message>): Document => ({
        title: page.title,
        body: h.main([], [h.h1([], [page.heading]), h.p([], [page.body])]),
    }),
}

const snapshot: ReleaseSnapshotType = {
    release_id: "deterministic-release",
    site_origin: "https://example.com",
    pages: [
        {
            path: "/",
            title: "SEO Home",
            heading: "Home",
            body: "Static body",
            content_type: "text",
            seo_description: 'A useful <home> "description".',
            noindex: true,
        },
        {
            path: "/about/",
            title: "About",
            heading: "About",
            body: "About body",
            content_type: "text",
        },
    ],
}

const render = (page: PublishedPageType) =>
    renderToString(application, {
        flags: page,
        isHydratable: false,
    })

describe("buildSite", () => {
    it("renders deterministic static Foldkit output", async () => {
        const first = await Effect.runPromise(
            buildSite({ snapshot, template, render })
        )
        const second = await Effect.runPromise(
            buildSite({ snapshot, template, render })
        )

        expect(second).toEqual(first)
        for (const artifact of first.artifacts) {
            expect(artifact.content).not.toContain("<script")
            expect(artifact.content).not.toContain("data-foldkit")
        }
        expect(first.artifacts[0]?.content).toContain("<title>SEO Home</title>")
        expect(first.artifacts[0]?.content).toContain(
            '<link rel="canonical" href="https://example.com/" />'
        )
        expect(first.artifacts[0]?.content).toContain(
            'content="A useful &lt;home&gt; &quot;description&quot;."'
        )
        expect(first.artifacts[0]?.content).toContain(
            '<meta name="robots" content="noindex, nofollow" />'
        )
        expect(first.artifacts[1]?.content).toContain(
            '<meta name="description" content="About. Visit example.com for more information." />'
        )
    })
})

import { Effect, Schema } from "effect"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { SiteReleaseSnapshot } from "@urm/domain/schemas/document-site-builds"
import { urm_marketing_block_document } from "@urm/domain/block-document-presets"

import { writeSiteBuild } from "../src/index.ts"

describe("composed page builds", () => {
    it("copies URM-only bundled assets into the static build", async () => {
        const directory = await mkdtemp(join(tmpdir(), "urm-landing-build-"))
        try {
            const snapshot = Schema.decodeUnknownSync(SiteReleaseSnapshot)({
                release_id: "landing-test",
                site_origin: "https://urm.urm.dev",
                pages: [
                    {
                        path: "/",
                        title: "URM",
                        heading: "URM",
                        body: JSON.stringify(urm_marketing_block_document),
                        content_type: "landing_json",
                    },
                ],
            })
            await Effect.runPromise(
                writeSiteBuild({ snapshot, output_directory: directory })
            )

            const html = await readFile(join(directory, "index.html"), "utf8")
            const bento = await readFile(
                join(directory, "assets/urm-integrations/bento.svg"),
                "utf8"
            )
            expect(html).toContain("/assets/urm-integrations/bento.svg")
            expect(html).toContain("/assets/urm-integrations/instagram.svg")
            expect(html).toContain("/assets/urm-integrations/stripe.svg")
            expect(html).toContain("/assets/urm-integrations/polar.svg")
            expect(bento).toContain("<svg")
        } finally {
            await rm(directory, { recursive: true, force: true })
        }
    })

    it("rejects bundled URM assets for a general domain build", async () => {
        const directory = await mkdtemp(join(tmpdir(), "urm-landing-build-"))
        try {
            const snapshot = Schema.decodeUnknownSync(SiteReleaseSnapshot)({
                release_id: "landing-test",
                site_origin: "https://example.urm.dev",
                pages: [
                    {
                        path: "/",
                        title: "Example",
                        heading: "Example",
                        body: JSON.stringify(urm_marketing_block_document),
                        content_type: "landing_json",
                    },
                ],
            })
            const exit = await Effect.runPromiseExit(
                writeSiteBuild({ snapshot, output_directory: directory })
            )

            expect(exit._tag).toBe("Failure")
        } finally {
            await rm(directory, { recursive: true, force: true })
        }
    })
})

import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Effect } from "effect"
import { Sql } from "@urm/db/sql"
import { describe, expect, it } from "vitest"

import {
    read_publication_asset,
    resolve_postgres_publication,
} from "./publication-site.server.ts"

const lookup_with_rows = (
    rows: ReadonlyArray<ReadonlyArray<Record<string, unknown>>>,
    target: Parameters<typeof resolve_postgres_publication>[0]
) => {
    let index = 0
    return Effect.runPromise(
        resolve_postgres_publication(target).pipe(
            Effect.provideService(
                Sql,
                Sql.of({
                    query: () => Effect.succeed(rows[index++] ?? []),
                    transaction: (effect) => effect,
                })
            )
        )
    )
}

describe("PostgreSQL local publication lookup", () => {
    const domain = {
        id: "domain-1",
        development_deployment_id: "development-1",
        staging_deployment_id: null,
        production_deployment_id: null,
    }

    it("distinguishes a legacy domain from a PostgreSQL domain without an active release", async () => {
        expect(
            await lookup_with_rows([[]], {
                domain_slug: "legacy",
                channel: "development",
            })
        ).toBeUndefined()
        expect(
            await lookup_with_rows([[domain]], {
                domain_slug: "new",
                channel: "staging",
            })
        ).toBeNull()
    })

    it("resolves successful root and subdomain deployments to their saved builds", async () => {
        expect(
            await lookup_with_rows([[domain], [{ release_id: "release-1" }]], {
                domain_slug: "new",
                channel: "development",
            })
        ).toEqual({
            output_directory: "packages/ssg/dist/builds/pg-release-1",
        })
        expect(
            await lookup_with_rows(
                [
                    [domain],
                    [{ id: "subdomain-1", live_deployment_id: "live-1" }],
                    [{ release_id: "release-2" }],
                ],
                {
                    domain_slug: "new",
                    subdomain_slug: "blog",
                    channel: "live",
                }
            )
        ).toEqual({
            output_directory: "packages/ssg/dist/builds/pg-release-2",
        })
    })
})

describe("local publication assets", () => {
    it("serves only routes and assets declared by a completed build", async () => {
        const repository = await mkdtemp(join(tmpdir(), "urm-publication-"))
        const output_directory = "packages/ssg/dist/builds/domain-1/build-1"
        const artifact_root = join(repository, output_directory)
        await mkdir(join(artifact_root, "about"), { recursive: true })
        await mkdir(join(artifact_root, "assets"), { recursive: true })
        await writeFile(join(artifact_root, "about/index.html"), "About")
        await writeFile(join(artifact_root, "assets/site.css"), "body{}")
        await writeFile(
            join(artifact_root, "manifest.json"),
            JSON.stringify({
                manifest_version: 1,
                release_id: "release-1",
                site_origin: "https://test1.urm.dev",
                is_complete: true,
                routes: [
                    {
                        route: "/about/",
                        output_path: "about/index.html",
                        media_type: "text/html; charset=utf-8",
                    },
                ],
                assets: [
                    {
                        output_path: "assets/site.css",
                        media_type: "text/css; charset=utf-8",
                        sha256: "checksum",
                    },
                ],
            })
        )

        const page = await read_publication_asset(
            repository,
            output_directory,
            "/about"
        )
        const css = await read_publication_asset(
            repository,
            output_directory,
            "/assets/site.css"
        )
        expect(page?.body.toString("utf8")).toBe("About")
        expect(page?.media_type).toBe("text/html; charset=utf-8")
        expect(css?.body.toString("utf8")).toBe("body{}")
        expect(
            await read_publication_asset(
                repository,
                output_directory,
                "/secret"
            )
        ).toBeUndefined()
        expect(
            await read_publication_asset(repository, "../../etc", "/passwd")
        ).toBeUndefined()
    })
})

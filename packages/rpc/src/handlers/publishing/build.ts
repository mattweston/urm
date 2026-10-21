import { createHash } from "node:crypto"
import { Config, Effect, Schema } from "effect"
import { ArtifactChecksum } from "@urm/domain/schemas/publications"
import type { BuildPublicationInput } from "@urm/domain/publishing"
import { SiteBuildWriter } from "@urm/ssg/write-site-build"
import { release_snapshot_for_ssg } from "@urm/ssg/publication"
import { PagesRepository, type PagesPrincipal } from "../pages/repository.ts"
import { PublishingRepository } from "./repository.ts"
import { read_release_assets } from "./assets.ts"

export const build_publication = Effect.fn("Publishing.build")(function* (
    principal: PagesPrincipal,
    input: BuildPublicationInput
) {
    const pages = yield* PagesRepository
    yield* pages.authorize_pages(
        principal,
        input.domain_id,
        input.subdomain_slug,
        true
    )
    const repository = yield* PublishingRepository
    const captured = yield* repository.capture(
        principal,
        input.subdomain_slug,
        input.idempotency_key
    )
    if (captured.created) {
        const writer = yield* SiteBuildWriter
        yield* Effect.gen(function* () {
            const assets = yield* read_release_assets(captured.asset_sources)
            yield* writer.write({
                assets,
                public_config: {
                    mapbox_access_token: yield* Config.String(
                        "VITE_MAPBOX_ACCESS_TOKEN"
                    ).pipe(Config.withDefault("")),
                },
                snapshot: release_snapshot_for_ssg(captured.release.snapshot),
                output_directory: `packages/ssg/dist/builds/pg-${captured.release.id}`,
            })
            const checksum = yield* Schema.decodeUnknownEffect(
                ArtifactChecksum
            )(
                createHash("sha256")
                    .update(JSON.stringify(captured.release.snapshot))
                    .digest("hex")
            )
            yield* repository.finish(
                principal,
                input.subdomain_slug,
                captured.release.id,
                checksum
            )
        }).pipe(
            Effect.timeout("5 minutes"),
            Effect.tapError(() =>
                repository.finish(
                    principal,
                    input.subdomain_slug,
                    captured.release.id,
                    null
                )
            )
        )
    }
    return captured.release.id
})

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { Effect, Schema } from "effect"
import { sql } from "drizzle-orm"
import { query_rows } from "@urm/database/sql"
import { SiteBuildManifest } from "@urm/domain"

const DomainPointer = Schema.Struct({
    id: Schema.String,
    development_deployment_id: Schema.NullOr(Schema.String),
    staging_deployment_id: Schema.NullOr(Schema.String),
    production_deployment_id: Schema.NullOr(Schema.String),
})

const SubdomainPointer = Schema.Struct({
    id: Schema.String,
    live_deployment_id: Schema.NullOr(Schema.String),
})

const ActiveDeployment = Schema.Struct({ release_id: Schema.String })

export const resolve_postgres_publication = (target: {
    readonly domain_slug: string
    readonly channel: "development" | "staging" | "production" | "live"
    readonly subdomain_slug?: string
}) =>
    query_rows(
        DomainPointer,
        sql`SELECT id,development_deployment_id,staging_deployment_id,production_deployment_id FROM domains WHERE slug=${target.domain_slug}`
    ).pipe(
        Effect.flatMap((domains) =>
            Effect.gen(function* () {
                const domain = domains[0]
                if (domain === undefined) return undefined

                let deployment_id: string | null
                let subdomain_id: string | null = null
                if (target.subdomain_slug !== undefined) {
                    if (target.channel !== "live") return null
                    const subdomains = yield* query_rows(
                        SubdomainPointer,
                        sql`SELECT id,live_deployment_id FROM subdomains WHERE domain_id=${domain.id} AND slug=${target.subdomain_slug} AND status!='disabled' AND (expires_at IS NULL OR expires_at > ${Date.now()})`
                    )
                    const subdomain = subdomains[0]
                    if (subdomain === undefined) return null
                    subdomain_id = subdomain.id
                    deployment_id = subdomain.live_deployment_id
                } else {
                    deployment_id =
                        target.channel === "development"
                            ? domain.development_deployment_id
                            : target.channel === "staging"
                              ? domain.staging_deployment_id
                              : target.channel === "production"
                                ? domain.production_deployment_id
                                : null
                }
                if (deployment_id === null) return null
                const deployments = yield* query_rows(
                    ActiveDeployment,
                    sql`SELECT j.release_id FROM publication_deployment_jobs j JOIN publication_releases r ON r.id=j.release_id AND r.domain_id=j.domain_id AND r.subdomain_id IS NOT DISTINCT FROM j.subdomain_id AND r.status='ready' AND r.artifact_checksum=j.artifact_checksum WHERE j.id=${deployment_id} AND j.domain_id=${domain.id} AND j.subdomain_id IS NOT DISTINCT FROM ${subdomain_id} AND j.channel=${target.channel} AND j.is_preview=false AND j.status='succeeded'`
                )
                const deployment = deployments[0]
                return deployment === undefined
                    ? null
                    : {
                          output_directory: `packages/ssg/dist/builds/pg-${deployment.release_id}`,
                      }
            })
        )
    )

export type PublicationAsset = Readonly<{
    body: Buffer
    media_type: string
}>

const manifest_asset = (
    manifest: typeof SiteBuildManifest.Type,
    pathname: string
) => {
    const route = manifest.routes.find((candidate) =>
        pathname === "/"
            ? candidate.route === "/"
            : candidate.route === pathname || candidate.route === `${pathname}/`
    )
    if (route !== undefined) return route

    const output_path = pathname.startsWith("/") ? pathname.slice(1) : pathname
    return manifest.assets?.find(
        (candidate) => candidate.output_path === output_path
    )
}

export const read_publication_asset = async (
    repository_root: string,
    output_directory: string,
    pathname: string
): Promise<PublicationAsset | undefined> => {
    const builds_root = resolve(repository_root, "packages/ssg/dist/builds")
    const artifact_root = resolve(repository_root, output_directory)
    if (
        artifact_root === builds_root ||
        !artifact_root.startsWith(`${builds_root}/`)
    ) {
        return undefined
    }

    const manifest_value: unknown = JSON.parse(
        await readFile(resolve(artifact_root, "manifest.json"), "utf8")
    )
    const manifest = Schema.decodeUnknownSync(SiteBuildManifest)(manifest_value)
    const asset = manifest_asset(manifest, pathname)
    if (asset === undefined) return undefined

    const asset_path = resolve(artifact_root, asset.output_path)
    if (!asset_path.startsWith(`${artifact_root}/`)) return undefined

    return {
        body: await readFile(asset_path),
        media_type: asset.media_type,
    }
}

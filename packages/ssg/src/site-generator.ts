import { Effect } from "effect"
import type { RenderedApplication } from "foldkit/experimental/server"
import type { SiteBuildManifest } from "@urm/domain/schemas/document-site-builds"

import type {
    ArtifactValidationError,
    DocumentAssemblyError,
    RoutePlanError,
} from "./errors.ts"
import { assembleDocument } from "./internal/document-assembler.ts"
import { planRoutes } from "./internal/route-planner.ts"
import { validateStaticArtifact } from "./internal/artifact-validator.ts"
import type { PublishedPage, ReleaseSnapshot } from "./snapshot.ts"

export type GeneratedArtifact = Readonly<{
    route: string
    output_path: string
    media_type: "text/html; charset=utf-8"
    content: string
}>

export type BuildManifest = SiteBuildManifest

export type SiteBuild = Readonly<{
    artifacts: ReadonlyArray<GeneratedArtifact>
    manifest: BuildManifest
}>

export type StaticPageRenderer<RenderError> = (
    page: PublishedPage
) => Effect.Effect<RenderedApplication, RenderError>

const escape_attribute = (value: string): string =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")

const page_description = (page: PublishedPage, site_origin: string): string => {
    const configured = page.seo_description?.trim()
    if (configured !== undefined && configured !== "") return configured

    return `${page.heading}. Visit ${new URL(site_origin).hostname} for more information.`
}

const page_template = (
    template: string,
    site_origin: string,
    page: PublishedPage
): string => {
    const canonical_url = new URL(page.path, site_origin).href
    const metadata = [
        `<link rel="canonical" href="${escape_attribute(canonical_url)}" />`,
        `<meta name="description" content="${escape_attribute(page_description(page, site_origin))}" />`,
        ...(page.noindex === true
            ? [`<meta name="robots" content="noindex, nofollow" />`]
            : []),
    ].join("\n        ")
    const behaviors = (page.behaviors ?? [])
        .map(
            (path) =>
                `<script type="module" src="/${escape_attribute(path)}"></script>`
        )
        .join("\n    ")

    return template
        .replace("</head>", `        ${metadata}\n    </head>`)
        .replace(
            "</body>",
            behaviors === "" ? "</body>" : `    ${behaviors}\n    </body>`
        )
}

export const buildSite = <RenderError>(options: {
    snapshot: ReleaseSnapshot
    template: string
    render: StaticPageRenderer<RenderError>
}): Effect.Effect<
    SiteBuild,
    | RenderError
    | RoutePlanError
    | DocumentAssemblyError
    | ArtifactValidationError
> =>
    Effect.gen(function* () {
        const routes = yield* planRoutes(options.snapshot.pages)
        const artifacts = yield* Effect.forEach(
            routes,
            (route) =>
                Effect.gen(function* () {
                    const application = yield* options.render(route.page)
                    const content = yield* assembleDocument(
                        route.page.path,
                        page_template(
                            options.template,
                            options.snapshot.site_origin,
                            route.page
                        ),
                        application
                    )
                    yield* validateStaticArtifact(
                        route.page.path,
                        content,
                        route.page.behaviors ?? []
                    )

                    return {
                        route: route.page.path,
                        output_path: route.output_path,
                        media_type: "text/html; charset=utf-8",
                        content,
                    } satisfies GeneratedArtifact
                }),
            { concurrency: 1 }
        )

        // TODO(sitegen-manifest): Record artifact digests, byte lengths,
        // generator/template versions, and emitted-asset collisions.
        const manifest: BuildManifest = {
            manifest_version: 1,
            release_id: options.snapshot.release_id,
            site_origin: options.snapshot.site_origin,
            is_complete: true,
            routes: artifacts.map(({ route, output_path, media_type }) => ({
                route,
                output_path,
                media_type,
            })),
        }

        return { artifacts, manifest }
    })

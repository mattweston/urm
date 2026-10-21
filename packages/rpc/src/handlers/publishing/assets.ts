import { createHash } from "node:crypto"
import { sql } from "drizzle-orm"
import { Context, Effect, Layer, Schema } from "effect"
import { require_account_domain } from "@urm/auth"
import { query_rows } from "@urm/database/sql"
import {
    PublishingError,
    type ReleaseAssetSource,
} from "@urm/domain/publishing"
import { decodeDocumentContent } from "@urm/domain/schemas/documents"
import type { RichTextDocument } from "@urm/domain/schemas/rich-text"
import {
    decodeLandingPageContent,
    PublishedLandingPageDocument,
    type LandingImage,
    PublishedLandingImage,
} from "@urm/domain/schemas/landing-pages"
import type { PageContentType } from "@urm/domain/schemas/publications"
import { readUploadObject } from "@urm/utils/upload"
import type { PagesPrincipal } from "../pages/repository.ts"

const unavailable = () =>
    new PublishingError({
        message:
            "A release image is unavailable or belongs to another workspace",
    })
// Publishing must never bake a private or signed URL into a public artifact. The
// retired Convex storage host stays in the pattern because rows written before
// the PostgreSQL migration can still hold those URLs.
const private_reference =
    /\/api\/uploads\/|[?&](?:X-Amz-|X-Goog-|Signature=)|convex\.cloud\/api\/storage\//i

/** Called inside the capture transaction; resolves metadata only, never network I/O. */
export const capture_asset_resolver = (principal: PagesPrincipal) => {
    const sources = new Map<string, ReleaseAssetSource>()
    const resolve_url = Effect.fn("PublicationAssets.resolveUrl")(function* (
        value: string
    ) {
        if (!value.startsWith("/api/uploads/")) {
            if (private_reference.test(value))
                return yield* Effect.fail(unavailable())
            return value
        }
        const match =
            /^\/api\/uploads\/([^/]+)\/(media\/|documents\/|blog\/|pages\/|events\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.exec(
                value
            )
        if (
            match === null ||
            match[1] !== encodeURIComponent(principal.domain_id)
        )
            return yield* Effect.fail(unavailable())
        const prefix = match[2] ?? ""
        yield* require_account_domain(
            principal,
            principal.domain_id,
            false,
            prefix === "events/"
                ? "Events"
                : prefix === "pages/"
                  ? null
                  : prefix === "media/"
                    ? "Media"
                    : prefix === "documents/"
                      ? "Documents"
                      : prefix === "blog/"
                        ? "Blog"
                        : "Mail"
        )
        const key = `domains/${encodeURIComponent(principal.domain_id)}/${prefix}images/${match[3]}`
        const output_path = `assets/published-${createHash("sha256").update(key).digest("hex")}.image`
        sources.set(key, { key, output_path })
        if (sources.size > 100)
            return yield* Effect.fail(
                new PublishingError({
                    message: "A release supports at most 100 private images",
                })
            )
        return `/${output_path}`
    })
    const resolve_document = (document: RichTextDocument) =>
        Effect.gen(function* () {
            return {
                ...document,
                children: yield* Effect.forEach(document.children, (node) =>
                    Effect.gen(function* () {
                        if (node.type === "image")
                            return {
                                ...node,
                                src: yield* resolve_url(node.src),
                            }
                        return node
                    })
                ),
            }
        })
    const resolve_image = Effect.fn("PublicationAssets.resolveLandingImage")(
        function* (image: LandingImage) {
            if (image._tag === "BundledAsset") return image
            const rows = yield* query_rows(
                Schema.Struct({
                    url: Schema.String,
                    width: Schema.NullOr(Schema.Number),
                    height: Schema.NullOr(Schema.Number),
                }),
                sql`SELECT url,width,height FROM images WHERE id=${image.image_id} AND domain_id=${principal.domain_id}`
            )
            const row = rows[0]
            if (row === undefined) return yield* Effect.fail(unavailable())
            yield* require_account_domain(
                principal,
                principal.domain_id,
                false,
                "Media"
            )
            return yield* Schema.decodeUnknownEffect(PublishedLandingImage)({
                _tag: "ResolvedImage",
                src: yield* resolve_url(row.url),
                alt: image.alt,
                ...(row.width === null ? {} : { width: row.width }),
                ...(row.height === null ? {} : { height: row.height }),
            })
        }
    )
    const resolve_content = Effect.fn("PublicationAssets.resolveContent")(
        function* (content: string, content_type: PageContentType) {
            if (content_type === "rich_text_json") {
                const decoded = yield* decodeDocumentContent({
                    content,
                    content_type,
                })
                if (decoded.content_type !== "rich_text_json")
                    return yield* Effect.fail(unavailable())
                const document = yield* resolve_document(
                    decoded.content.document
                )
                return JSON.stringify({ ...decoded.content, document })
            }
            if (content_type === "landing_json") {
                const document = yield* decodeLandingPageContent(content)
                const blocks = yield* Effect.forEach(document.blocks, (block) =>
                    Effect.gen(function* () {
                        if (block._tag === "Hero")
                            return {
                                ...block,
                                ...(block.image === undefined
                                    ? {}
                                    : {
                                          image: yield* resolve_image(
                                              block.image
                                          ),
                                      }),
                            }
                        if (block._tag === "LogoGrid")
                            return {
                                ...block,
                                logos: yield* Effect.forEach(
                                    block.logos,
                                    (logo) =>
                                        Effect.map(
                                            resolve_image(logo.image),
                                            (image) => ({ ...logo, image })
                                        )
                                ),
                            }
                        if (block._tag === "RichText")
                            return {
                                ...block,
                                document: yield* resolve_document(
                                    block.document
                                ),
                            }
                        return block
                    })
                )
                return JSON.stringify(
                    yield* Schema.decodeUnknownEffect(
                        PublishedLandingPageDocument
                    )({ ...document, blocks })
                )
            }
            return content
        }
    )
    return {
        resolve_url,
        resolve_content,
        sources: () => [...sources.values()],
    }
}

export const reject_private_references = (value: unknown) =>
    private_reference.test(JSON.stringify(value))
        ? Effect.fail(
              new PublishingError({
                  message:
                      "A private image reference could not be published. Use the image editor to select an uploaded image.",
              })
          )
        : Effect.void

export class ReleaseAssetStorage extends Context.Service<
    ReleaseAssetStorage,
    {
        readonly read: (
            key: string
        ) => Effect.Effect<
            { bytes: Uint8Array; content_type: string },
            PublishingError
        >
    }
>()("@urm/rpc/ReleaseAssetStorage") {}
export const ReleaseAssetStorageLive = Layer.succeed(ReleaseAssetStorage, {
    read: (key) =>
        Effect.tryPromise({
            try: (signal) => readUploadObject(key, signal),
            catch: unavailable,
        }),
})

export const read_release_assets = Effect.fn("PublicationAssets.read")(
    function* (sources: ReadonlyArray<ReleaseAssetSource>) {
        const storage = yield* ReleaseAssetStorage
        return yield* Effect.forEach(sources, (source) =>
            Effect.gen(function* () {
                const object = yield* storage.read(source.key)
                return {
                    output_path: source.output_path,
                    bytes: object.bytes,
                    media_type: object.content_type,
                }
            })
        )
    }
)

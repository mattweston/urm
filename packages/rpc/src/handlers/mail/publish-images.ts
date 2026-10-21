import { createHash } from "node:crypto"
import { Context, Effect, Layer } from "effect"
import {
    decodeEmailNewsletterBlockContent,
    encodeEmailNewsletterBlockContent,
} from "@urm/email"
import { require_account_domain, type AccountPrincipal } from "@urm/auth"
import { putPublicUploadObject, readUploadObject } from "@urm/utils/upload"

/**
 * Newsletter images are published at send time.
 *
 * Workspace uploads are private and read back through the authenticated
 * `/api/uploads` route. A recipient holds no session, so a sent newsletter
 * cannot reference one. Before an email is rendered, every private image the
 * body references is copied to a publicly readable object and the body is
 * rewritten to point at it. Only images a send actually references are
 * published, the originals stay private, and the stored draft is untouched —
 * the editor keeps showing the private reference.
 */
const PRIVATE_IMAGE_LIMIT = 25

const private_key = (value: string, domain_id: string): string | null => {
    const match =
        /^\/api\/uploads\/([^/]+)\/(media\/|documents\/|blog\/|pages\/|events\/|mail\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.exec(
            value
        )
    // A reference to another workspace's object is not publishable here.
    if (match === null || match[1] !== encodeURIComponent(domain_id))
        return null
    return `domains/${encodeURIComponent(domain_id)}/${match[2] ?? ""}images/${match[3]}`
}

export class NewsletterImagePublishError extends Error {
    readonly _tag = "NewsletterImagePublishError"
}

/**
 * The storage seam for publishing. Behind a service so a test can observe what
 * a send would publish without reaching object storage.
 */
export class NewsletterImagePublisher extends Context.Service<
    NewsletterImagePublisher,
    {
        readonly read: (
            key: string
        ) => Effect.Effect<
            { bytes: Uint8Array; content_type: string },
            NewsletterImagePublishError
        >
        readonly publish: (
            key: string,
            bytes: Uint8Array,
            content_type: string
        ) => Effect.Effect<string, NewsletterImagePublishError>
    }
>()("@urm/rpc/NewsletterImagePublisher") {}

export const NewsletterImagePublisherLive = Layer.succeed(
    NewsletterImagePublisher,
    NewsletterImagePublisher.of({
        read: (key) =>
            Effect.tryPromise({
                try: (signal) => readUploadObject(key, signal),
                catch: () =>
                    new NewsletterImagePublishError(
                        "A newsletter image could not be read"
                    ),
            }),
        publish: (key, bytes, content_type) =>
            Effect.tryPromise({
                try: (signal) =>
                    putPublicUploadObject(key, bytes, content_type, signal),
                catch: () =>
                    new NewsletterImagePublishError(
                        "A newsletter image could not be published"
                    ),
            }),
    })
)

export const publish_newsletter_images = Effect.fn(
    "MailNewsletter.publishImages"
)(function* (
    principal: AccountPrincipal & { readonly domain_id: string },
    body_text: string
) {
    const document = decodeEmailNewsletterBlockContent(body_text)
    const published = new Map<string, string>()
    const publish = (source: string) =>
        Effect.gen(function* () {
            const cached = published.get(source)
            if (cached !== undefined) return cached
            const key = private_key(source, principal.domain_id)
            // Anything already public, or not a workspace upload, is left as it
            // is; the email renderer applies its own safety filter.
            if (key === null) return source
            if (published.size >= PRIVATE_IMAGE_LIMIT)
                return yield* Effect.fail(
                    new NewsletterImagePublishError(
                        `A newsletter supports at most ${PRIVATE_IMAGE_LIMIT} uploaded images`
                    )
                )
            yield* require_account_domain(
                principal,
                principal.domain_id,
                false,
                "Mail"
            )
            const storage = yield* NewsletterImagePublisher
            const object = yield* storage.read(key)
            // Content-addressed, so re-sending a newsletter republishes to the
            // same object instead of accumulating copies.
            const digest = createHash("sha256")
                .update(object.bytes)
                .digest("hex")
            const url = yield* storage.publish(
                `public/email-images/${digest}`,
                object.bytes,
                object.content_type || "image/jpeg"
            )
            published.set(source, url)
            return url
        })

    const blocks = yield* Effect.forEach(document.blocks, (block) =>
        Effect.gen(function* () {
            if (block.type === "rich_text")
                return {
                    ...block,
                    document: {
                        ...block.document,
                        children: yield* Effect.forEach(
                            block.document.children,
                            (node) =>
                                Effect.gen(function* () {
                                    if (node.type !== "image") return node
                                    return {
                                        ...node,
                                        src: yield* publish(node.src),
                                    }
                                })
                        ),
                    },
                }
            if (block.type === "article_card")
                return {
                    ...block,
                    image: {
                        ...block.image,
                        src: yield* publish(block.image.src),
                    },
                }
            if (block.type === "gallery")
                return {
                    ...block,
                    images: yield* Effect.forEach(block.images, (image) =>
                        Effect.gen(function* () {
                            return { ...image, src: yield* publish(image.src) }
                        })
                    ),
                }
            return block
        })
    )
    yield* Effect.logInfo("newsletter images published").pipe(
        Effect.annotateLogs({
            published: published.size,
            urls: [...published.values()].join(" "),
        })
    )
    return encodeEmailNewsletterBlockContent({ ...document, blocks })
})

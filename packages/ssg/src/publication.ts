import { Schema } from "effect"
import type { PublicationReleaseSnapshot } from "@urm/domain/schemas/publications"

const markdown_text = (value: string): string =>
    Array.from(value)
        .map((character) =>
            "\\[]()*_`".includes(character) ? `\\${character}` : character
        )
        .join("")

const blog_index_body = (
    posts: PublicationReleaseSnapshot["blog_posts"]
): string =>
    posts
        .map((post) => {
            const heading = `## [${markdown_text(post.title)}](${post.path})`
            return post.excerpt === undefined
                ? heading
                : `${heading}\n\n${markdown_text(post.excerpt)}`
        })
        .join("\n\n")

export const release_snapshot_for_ssg = (
    snapshot: PublicationReleaseSnapshot
) => ({
    release_id: snapshot.release_id,
    site_origin: snapshot.publication_origin,
    pages: [
        ...snapshot.pages.map((page) => ({
            ...page,
            title: page.seo_title ?? page.title,
            heading: page.title,
        })),
        ...(snapshot.blog_posts.length === 0
            ? []
            : [
                  {
                      path: "/blog/",
                      title: "Blog",
                      heading: "Blog",
                      body: blog_index_body(snapshot.blog_posts),
                      content_type: Schema.decodeUnknownSync(
                          Schema.Literal("markdown")
                      )("markdown"),
                  },
              ]),
        ...snapshot.blog_posts.map((post) => ({
            path: post.path,
            title: post.seo_title ?? post.title,
            heading: post.title,
            body: post.body,
            content_type: post.content_type,
            ...(post.seo_description === undefined
                ? {}
                : { seo_description: post.seo_description }),
        })),
    ],
    events: snapshot.events ?? [],
    ...(snapshot.layout === undefined ? {} : { layout: snapshot.layout }),
})

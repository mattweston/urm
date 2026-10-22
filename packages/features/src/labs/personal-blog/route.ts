import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

// The blog's own idea of where it is. A component view only ever receives the
// component Model, never the application route, so the position is mirrored
// into a field here and kept in step by main.ts.
export const BlogAbout = taggedStruct("BlogAbout")
export const BlogPosts = taggedStruct("BlogPosts")
export const BlogPost = taggedStruct("BlogPost", { slug: S.String })

export const BlogRoute = S.Union([BlogAbout, BlogPosts, BlogPost])
export type BlogRoute = typeof BlogRoute.Type

export const isPostOrPosts = (route: BlogRoute): boolean =>
    route._tag === "BlogPosts" || route._tag === "BlogPost"

const PATH = "/documents/personal-blog"

export const personalBlogHref = (): string => `${PATH}/`
export const personalBlogPostsHref = (): string => `${PATH}/posts/`
export const personalBlogPostHref = (slug: string): string =>
    `${PATH}/posts/${slug}/`

export const isPersonalBlogPath = (pathname: string): boolean =>
    pathname === PATH ||
    pathname === `${PATH}/` ||
    pathname === `${PATH}/posts` ||
    pathname === `${PATH}/posts/` ||
    pathname.startsWith(`${PATH}/posts/`)

export const blogRouteForPath = (pathname: string): BlogRoute => {
    if (pathname === `${PATH}/posts` || pathname === `${PATH}/posts/`) {
        return BlogPosts()
    }

    const prefix = `${PATH}/posts/`
    if (pathname.startsWith(prefix)) {
        const slug = pathname.slice(prefix.length).replace(/\/$/, "")
        if (slug.length > 0) {
            return BlogPost({ slug })
        }
    }

    return BlogAbout()
}

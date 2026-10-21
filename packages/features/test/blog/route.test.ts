import { describe, expect, test } from "vitest"

import {
    draftsHref,
    isAppScope,
    newPostHref,
    postHref,
    publishedHref,
    routeBaseFor,
    tenantRouteBase,
    urlToAppRoute,
} from "../../src/blog/platform/route.ts"

// The editor supports the main publication, legacy tenant preview routes, and
// explicit independently published subdomain owners.
describe("urlToAppRoute", () => {
    test.each([
        ["/blog", "Published"],
        ["/blog/", "Published"],
        ["/blog/drafts", "Drafts"],
        ["/blog/drafts/", "Drafts"],
        ["/blog/published", "Published"],
        ["/blog/new", "NewPost"],
        ["/blog/new/", "NewPost"],
        ["/blog/urm", "Published"],
        ["/blog/urm/", "Published"],
        ["/blog/urm/drafts", "Drafts"],
        ["/blog/urm/published", "Published"],
        ["/blog/urm/new", "NewPost"],
        ["/blog/subdomains/docs/drafts", "Drafts"],
        ["/blog/subdomains/docs/published", "Published"],
        ["/blog/subdomains/docs/new", "NewPost"],
    ])("%s resolves to %s", (pathname, tag) => {
        expect(urlToAppRoute(pathname)._tag).toBe(tag)
    })

    test.each([
        ["/blog/my-post", "my-post"],
        ["/blog/urm/my-post", "my-post"],
        ["/blog/subdomains/docs/my-post", "my-post"],
    ])("%s resolves to the post %s", (pathname, slug) => {
        const route = urlToAppRoute(pathname)

        expect(route._tag).toBe("Post")
        expect(route._tag === "Post" && route.slug).toBe(slug)
    })

    test.each([["/"], [""], ["/other"], ["/notblog/new"]])(
        "%s falls back to Drafts",
        (pathname) => {
            expect(urlToAppRoute(pathname)._tag).toBe("Drafts")
        }
    )
})

describe("routeBaseFor", () => {
    test.each([
        ["/blog", "/blog"],
        ["/blog/drafts", "/blog"],
        ["/blog/my-post", "/blog"],
        ["/blog/urm", "/blog/urm"],
        ["/blog/urm/new", "/blog/urm"],
        ["/blog/subdomains/docs/new", "/blog/subdomains/docs"],
    ])("%s has base %s", (pathname, base) => {
        expect(routeBaseFor(pathname)).toBe(base)
    })
})

describe("printers round-trip through the parser", () => {
    test.each([["/blog"], ["/blog/urm"], ["/blog/subdomains/docs"]])(
        "base %s",
        (base) => {
            expect(urlToAppRoute(draftsHref(base))._tag).toBe("Drafts")
            expect(urlToAppRoute(publishedHref(base))._tag).toBe("Published")
            expect(urlToAppRoute(newPostHref(base))._tag).toBe("NewPost")

            const post = urlToAppRoute(postHref(base, "my-post"))

            expect(post._tag).toBe("Post")
            expect(post._tag === "Post" && post.slug).toBe("my-post")
        }
    )

    test("the tenant base is what the printers are given", () => {
        expect(tenantRouteBase()).toBe("/blog/urm")
        expect(newPostHref(tenantRouteBase())).toBe("/blog/urm/new/")
    })
})

describe("isAppScope", () => {
    test.each([
        ["/blog", true],
        ["/blog/", true],
        ["/blog/urm/new", true],
        ["/", false],
        ["/blogger", false],
        ["/team", false],
    ])("%s is in scope: %s", (pathname, expected) => {
        expect(isAppScope(pathname)).toBe(expected)
    })
})

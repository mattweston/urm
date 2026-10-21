import { Array, Option, Schema as S, pipe } from "effect"
import { Route } from "foldkit"
import { taggedStruct } from "foldkit/schema"

export const DraftsRoute = taggedStruct("Drafts")
export const PublishedRoute = taggedStruct("Published")
export const NewPostRoute = taggedStruct("NewPost")
export const PostRoute = taggedStruct("Post", { slug: S.String })

export const AppRoute = S.Union([
    DraftsRoute,
    PublishedRoute,
    NewPostRoute,
    PostRoute,
])

export type AppRoute = typeof AppRoute.Type

const BASE = "/blog"

// The blog is served both at /blog and, per tenant, at /blog/<tenant>. The
// tenant segment shifts every route one place to the right, so the base is
// read off the path and threaded through the printers.
const TENANT_SEGMENT = "urm"
const SUBDOMAINS_SEGMENT = "subdomains"

const draftsRouter = pipe(Route.literal("drafts"), Route.mapTo(DraftsRoute))
const publishedRouter = pipe(
    Route.literal("published"),
    Route.mapTo(PublishedRoute)
)
const newPostRouter = pipe(Route.literal("new"), Route.mapTo(NewPostRoute))

const segmentsOf = (pathname: string): ReadonlyArray<string> =>
    Array.filter(pathname.split("/"), (segment) => segment.length > 0)

const hasTenantSegment = (segments: ReadonlyArray<string>): boolean =>
    Option.exists(
        Array.get(segments, 1),
        (segment) => segment === TENANT_SEGMENT
    )

const hasSubdomainSegment = (segments: ReadonlyArray<string>): boolean =>
    Option.exists(
        Array.get(segments, 1),
        (segment) => segment === SUBDOMAINS_SEGMENT
    )

export const routeBaseFor = (pathname: string): string =>
    hasSubdomainSegment(segmentsOf(pathname))
        ? Option.match(Array.get(segmentsOf(pathname), 2), {
              onNone: () => BASE,
              onSome: (slug) => `${BASE}/${SUBDOMAINS_SEGMENT}/${slug}`,
          })
        : hasTenantSegment(segmentsOf(pathname))
          ? `${BASE}/${TENANT_SEGMENT}`
          : BASE

export const urlToAppRoute = (pathname: string): AppRoute => {
    const segments = segmentsOf(pathname)
    const isBlogPath = Option.exists(
        Array.get(segments, 0),
        (segment) => segment === "blog"
    )

    if (!isBlogPath) {
        return DraftsRoute()
    }

    return Option.match(
        Array.get(
            segments,
            hasSubdomainSegment(segments)
                ? 3
                : hasTenantSegment(segments)
                  ? 2
                  : 1
        ),
        {
            onNone: (): AppRoute => PublishedRoute(),
            onSome: (slug) =>
                slug === "drafts"
                    ? DraftsRoute()
                    : slug === "published"
                      ? PublishedRoute()
                      : slug === "new"
                        ? NewPostRoute()
                        : PostRoute({ slug }),
        }
    )
}

export const draftsHref = (routeBase: string) =>
    `${routeBase}${draftsRouter()}/`
export const publishedHref = (routeBase: string) =>
    `${routeBase}${publishedRouter()}/`
export const newPostHref = (routeBase: string) =>
    `${routeBase}${newPostRouter()}/`
export const postHref = (routeBase: string, slug: string) =>
    `${routeBase}/${slug}/`

export const blogHref = () => publishedHref(BASE)

export const tenantRouteBase = () => `${BASE}/${TENANT_SEGMENT}`

export const isAppScope = (pathname: string) =>
    pathname === BASE ||
    pathname.startsWith(`${BASE}/`) ||
    pathname.startsWith("/content/blog/")

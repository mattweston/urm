import { Option } from "effect"

const PATH = "/media/view-transitions"

export const viewTransitionsHref = () => `${PATH}/`

export const viewTransitionsFoodHref = (foodSlug: string) =>
    `${PATH}/${foodSlug}/`

const withoutTrailingSlash = (pathname: string) =>
    pathname.endsWith("/") ? pathname.slice(0, -1) : pathname

export const isViewTransitionsPath = (pathname: string): boolean =>
    withoutTrailingSlash(pathname) === PATH || pathname.startsWith(`${PATH}/`)

// The gallery and one food detail share a route tag; the slug is what tells
// them apart, so the app parses it out once and hands it to the submodel.
export const foodSlugForPath = (pathname: string): Option.Option<string> => {
    const path = withoutTrailingSlash(pathname)

    if (path === PATH) {
        return Option.none()
    }

    const slug = path.slice(`${PATH}/`.length)

    return slug.length === 0 || slug.includes("/")
        ? Option.none()
        : Option.some(slug)
}

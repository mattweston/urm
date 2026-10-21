import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const FormsRoute = taggedStruct("Forms")
export const FormRoute = taggedStruct("Form", { slug: S.String })
export const FormSubmissionsRoute = taggedStruct("FormSubmissions", {
    slug: S.String,
})
export const FormSettingsRoute = taggedStruct("FormSettings", {
    slug: S.String,
})

export const Route = S.Union([
    FormsRoute,
    FormRoute,
    FormSubmissionsRoute,
    FormSettingsRoute,
])
export type Route = typeof Route.Type

export const formsHref = (): string => "/forms/"
export const formHref = (slug: string): string =>
    `/forms/${encodeURIComponent(slug)}/`
export const formSubmissionsHref = (slug: string): string =>
    `/forms/${encodeURIComponent(slug)}/submissions/`
export const formSettingsHref = (slug: string): string =>
    `/forms/${encodeURIComponent(slug)}/settings/`

export const isAppScope = (pathname: string): boolean =>
    pathname === "/forms" || pathname.startsWith("/forms/")

const path_segments = (pathname: string): ReadonlyArray<string> =>
    pathname.split("/").filter((segment) => segment !== "")

export const routeForPath = (pathname: string): Route => {
    const segments = path_segments(pathname)
    const slug = segments[1]

    if (slug === undefined) return FormsRoute()
    if (segments[2] === "submissions") return FormSubmissionsRoute({ slug })
    if (segments[2] === "settings") return FormSettingsRoute({ slug })
    return FormRoute({ slug })
}

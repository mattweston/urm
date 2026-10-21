import { Schema as S } from "effect"

const DOCUMENTATION_PATH = "/documents/docs"

export const DocumentationPage = S.String
export type DocumentationPage = typeof DocumentationPage.Type

export const documentationHref = () => `${DOCUMENTATION_PATH}/`
export const documentationPageHref = (page: DocumentationPage) =>
    page === "" ? documentationHref() : `${DOCUMENTATION_PATH}/${page}/`

export const isDocumentationPath = (pathname: string): boolean =>
    pathname === DOCUMENTATION_PATH ||
    pathname === `${DOCUMENTATION_PATH}/` ||
    pathname.startsWith(`${DOCUMENTATION_PATH}/`)

export const pageForPath = (pathname: string): DocumentationPage =>
    pathname.slice(DOCUMENTATION_PATH.length).replace(/^\/+|\/+$/g, "")

const BREADCRUMB_PATH = "/breadcrumb"

export const breadcrumbHref = () => `${BREADCRUMB_PATH}/`

export const isBreadcrumbPath = (pathname: string): boolean =>
    pathname === BREADCRUMB_PATH || pathname === `${BREADCRUMB_PATH}/`

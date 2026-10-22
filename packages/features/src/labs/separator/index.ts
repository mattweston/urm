export { view } from "./view.ts"

const BASE = "/ui/separator"

export const isSeparatorPath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const separatorHref = () => `${BASE}/`

export { view } from "./timeline.view.ts"

const BASE = "/labs/ui/timeline"

export const isTimelinePath = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const timelineHref = () => `${BASE}/`

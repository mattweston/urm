import type { DemoRoute } from "./ported-demos.model.ts"

const routePaths: Record<DemoRoute, string> = {
    Cartlane: "/cartlane/",
    Draftboard: "/draftboard/",
    Relay: "/relay/",
    Streambox: "/streambox/",
    Threadline: "/threadline/",
}

export const demoHref = (route: DemoRoute) => routePaths[route]

export const isPortedDemoPath = (pathname: string) =>
    Object.values(routePaths).some((path) =>
        pathname.startsWith(path.slice(0, -1))
    )

export const demoRouteForPath = (pathname: string): DemoRoute => {
    if (pathname.startsWith("/draftboard")) {
        return "Draftboard"
    }
    if (pathname.startsWith("/relay")) {
        return "Relay"
    }
    if (pathname.startsWith("/streambox")) {
        return "Streambox"
    }
    if (pathname.startsWith("/threadline")) {
        return "Threadline"
    }
    return "Cartlane"
}

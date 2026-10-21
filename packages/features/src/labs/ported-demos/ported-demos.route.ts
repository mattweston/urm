import type { DemoRoute } from "./ported-demos.model.ts"

const routePaths: Record<DemoRoute, string> = {
    Cartlane: "/labs/cartlane/",
    Draftboard: "/labs/draftboard/",
    Relay: "/labs/relay/",
    Streambox: "/labs/streambox/",
    Threadline: "/labs/threadline/",
}

export const demoHref = (route: DemoRoute) => routePaths[route]

export const isPortedDemoPath = (pathname: string) =>
    Object.values(routePaths).some((path) =>
        pathname.startsWith(path.slice(0, -1))
    )

export const demoRouteForPath = (pathname: string): DemoRoute => {
    if (pathname.startsWith("/labs/draftboard")) {
        return "Draftboard"
    }
    if (pathname.startsWith("/labs/relay")) {
        return "Relay"
    }
    if (pathname.startsWith("/labs/streambox")) {
        return "Streambox"
    }
    if (pathname.startsWith("/labs/threadline")) {
        return "Threadline"
    }
    return "Cartlane"
}

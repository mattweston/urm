/**
 * # Dev server URLs
 */

/** Vite's `ViteDevServer["resolvedUrls"]`, structurally. */
type ResolvedServerUrls = {
    local: Array<string>
    network: Array<string>
}

/** The part of `ViteDevServer` this plugin touches. */
type DevServer = {
    resolvedUrls: ResolvedServerUrls | null
    listen: (port?: number, isRestart?: boolean) => Promise<unknown>
}

/** Structural `Plugin` — Vite's own type is not imported so `@urm/utils` stays free of it. */
type DevServerUrlsPlugin = {
    name: string
    apply: "serve"
    configureServer: (server: DevServer) => void
}

const hostnameOf = (origin: string): string =>
    origin.replace(/^[a-z]+:\/\//, "").replace(/[:/].*$/, "")

// Reuses the port and base path a dev server already resolved, so the extra
// entry matches whatever Vite or Astro was told to listen on.
const devOriginUrl = (
    urls: ResolvedServerUrls,
    dev_origin: string
): string | undefined => {
    const sample = urls.local[0] ?? urls.network[0]

    if (sample === undefined) {
        return undefined
    }

    const parsed = new URL(sample)
    const port = parsed.port === "" ? "" : `:${parsed.port}`

    return `${dev_origin}${port}${parsed.pathname}`
}

const appendDevOriginUrl = (
    urls: ResolvedServerUrls | null,
    dev_origin: string
): void => {
    if (urls === null) {
        return
    }

    const url = devOriginUrl(urls, dev_origin)

    if (
        url !== undefined &&
        !urls.local.includes(url) &&
        !urls.network.includes(url)
    ) {
        urls.network.push(url)
    }
}

// Vite prints what it detects — `localhost` plus raw interface addresses. On a
// shared box browsed over Tailscale none of those is the name that works:
// `allowedHosts` admits TAILSCALE_URL's host, generated domain hosts hang below
// it, and the auth/RPC URLs are built from it. Astro prints the same
// `resolvedUrls` Vite fills in, so this covers both.
//
// Returns `undefined` for a localhost origin, which the list already has; Vite
// ignores falsy entries in `plugins`.
export const devServerUrls = (
    dev_origin: string
): DevServerUrlsPlugin | undefined => {
    const trimmed = dev_origin.replace(/\/+$/, "")
    // TAILSCALE_URL is tolerated as a bare hostname anywhere else it is read;
    // a printed URL has to carry a scheme to be clickable.
    const origin = /^[a-z]+:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`

    if (trimmed === "" || hostnameOf(origin) === "localhost") {
        return undefined
    }

    return {
        name: "urm-dev-server-urls",
        apply: "serve",
        configureServer: (server) => {
            // Vite fills in `resolvedUrls` during `listen`, and both Vite's own
            // printer and Astro's read it afterwards.
            const listen = server.listen.bind(server)

            server.listen = async (port, isRestart) => {
                const result = await listen(port, isRestart)
                appendDevOriginUrl(server.resolvedUrls, origin)
                return result
            }
        },
    }
}

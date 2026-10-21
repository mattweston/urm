/**
 * # Generated Hosts
 *
 * Every domain gets one generated host, `<domain-name>.<suffix>`, which serves
 * the administration app at its root. Two suffixes are
 * fixed — `.localhost` for a clone where the browser and the servers share a
 * machine, `.urm.dev` in production. A dev box browsed over Tailscale adds its
 * own host as a third, so `test.<box>.ts.net` behaves exactly like
 * `test.localhost` does locally (see TAILSCALE_URL in `.env.example`; the hosts
 * still need DNS on the browsing machine).
 */
const FIXED_SUFFIXES: ReadonlyArray<string> = [".localhost", ".urm.dev"]

// Read lazily. The server loads dotenv in its module body, which ESM runs only
// after every import has been evaluated — anything read at module scope here
// would predate .env.local and always see the fallback.
const devHostname = (): string | undefined => {
    const configured = process.env.TAILSCALE_URL

    if (configured === undefined) {
        return undefined
    }

    const hostname = configured
        .trim()
        .toLowerCase()
        .replace(/^[a-z]+:\/\//, "")
        .replace(/[:/].*$/, "")

    return hostname === "" || hostname === "localhost" ? undefined : hostname
}

export const generatedHostSuffixes = (): ReadonlyArray<string> => {
    const dev = devHostname()

    return dev === undefined ? FIXED_SUFFIXES : [...FIXED_SUFFIXES, `.${dev}`]
}

export const generatedHostSuffix = (hostname: string): string | undefined =>
    generatedHostSuffixes().find((suffix) => hostname.endsWith(suffix))

// Deliberately a closed set: it decides where a central session may be handed
// off to, so an arbitrary host must never qualify.
export const generatedHostSuffixForCentralHostname = (
    central_hostname: string
): string | undefined => {
    if (central_hostname === "localhost") {
        return ".localhost"
    }

    if (central_hostname === "app.urm.dev") {
        return ".urm.dev"
    }

    const dev = devHostname()

    return dev !== undefined && central_hostname === `app.${dev}`
        ? `.${dev}`
        : undefined
}

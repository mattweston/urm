/**
 * Which of the three surfaces a hostname names.
 *
 * - `central` — sign in and the domain chooser. `app.` sits above the tenant
 *   suffix rather than below it, so it is a sibling of the generated hosts.
 * - `generated` — a domain's own `<name>.<suffix>` platform hostname. Its
 *   application decides whether that hostname is a public publication.
 * - `custom` — a domain's own domain name, which serves the website generated
 *   for it. The suffix root falls here too: in production `urm.dev` is exactly
 *   this case, the `urm` domain's custom domain.
 */
export type HostKind = "central" | "generated" | "custom"

export type LocalPublicationHost =
    | Readonly<{
          kind: "channel"
          domain_slug: string
          channel: "development" | "staging" | "production"
      }>
    | Readonly<{
          kind: "subdomain"
          domain_slug: string
          subdomain_slug: string
          channel: "live"
      }>

/** Accepts an origin, a host with a port, or a bare hostname. */
export const hostnameOf = (value: string): string =>
    value
        .toLowerCase()
        .trim()
        .replace(/^[a-z]+:\/\//, "")
        .replace(/^\[/, "")
        .replace(/\]/, "")
        .replace(/[:/].*$/, "")

const FIXED_SUFFIXES: ReadonlyArray<string> = [".localhost", ".urm.dev"]
const FIXED_CENTRAL: ReadonlyArray<string> = [
    "localhost",
    "app.localhost",
    "app.urm.dev",
]

/*
 * `suffix_root` is TAILSCALE_URL's host, the name generated hosts hang below
 * when development is browsed by name instead of as localhost. It is passed in
 * rather than read here so the same rule runs in the browser, where
 * `process.env` does not exist, and on the server, where `import.meta.env` does
 * not. Empty or `localhost` means there is no third suffix.
 */
const suffixes = (suffix_root: string): ReadonlyArray<string> =>
    suffix_root === "" || suffix_root === "localhost"
        ? FIXED_SUFFIXES
        : [...FIXED_SUFFIXES, `.${suffix_root}`]

const local_publication_suffixes = (
    suffix_root: string
): ReadonlyArray<string> => {
    const root = hostnameOf(suffix_root)

    return root === "urm.test" ? [".localhost", ".urm.test"] : [".localhost"]
}

/** Resolve the two labels above a local development suffix as a publication. */
export const localPublicationHost = (
    hostname: string,
    suffix_root = ""
): LocalPublicationHost | undefined => {
    const host = hostnameOf(hostname)
    const suffix = local_publication_suffixes(suffix_root).find((candidate) =>
        host.endsWith(candidate)
    )

    if (suffix === undefined) return undefined

    const labels = host.slice(0, -suffix.length).split(".")
    if (labels.length === 1) {
        const [domain_slug] = labels
        if (
            domain_slug === undefined ||
            domain_slug === "app" ||
            domain_slug === "mail" ||
            domain_slug === "newsletter" ||
            domain_slug === "www"
        ) {
            return undefined
        }
        return { kind: "channel", domain_slug, channel: "production" }
    }
    if (labels.length !== 2) return undefined

    const [publication_label, domain_slug] = labels
    if (publication_label === undefined || domain_slug === undefined)
        return undefined

    if (publication_label === "dev") {
        return { kind: "channel", domain_slug, channel: "development" }
    }
    if (publication_label === "staging") {
        return { kind: "channel", domain_slug, channel: "staging" }
    }
    if (publication_label === "prod") {
        return { kind: "channel", domain_slug, channel: "production" }
    }
    if (
        publication_label === "app" ||
        publication_label === "mail" ||
        publication_label === "newsletter" ||
        publication_label === "www"
    ) {
        return undefined
    }

    return {
        kind: "subdomain",
        domain_slug,
        subdomain_slug: publication_label,
        channel: "live",
    }
}

export const classifyHost = (hostname: string, suffix_root = ""): HostKind => {
    const host = hostnameOf(hostname)
    const root = hostnameOf(suffix_root)

    if (
        FIXED_CENTRAL.includes(host) ||
        (root !== "" && root !== "localhost" && host === `app.${root}`)
    ) {
        return "central"
    }

    return suffixes(root).some((suffix) => host.endsWith(suffix))
        ? "generated"
        : "custom"
}

/** The platform: sign in and the domain chooser, never a domain's own host. */
export const isCentralHostname = (
    hostname: string,
    suffix_root = ""
): boolean => classifyHost(hostname, suffix_root) === "central"

/** A domain's generated platform hostname. */
export const isGeneratedHostname = (
    hostname: string,
    suffix_root = ""
): boolean => classifyHost(hostname, suffix_root) === "generated"

/** A domain's own domain name, which serves the website generated for it. */
export const isCustomHostname = (hostname: string, suffix_root = ""): boolean =>
    classifyHost(hostname, suffix_root) === "custom"

/** The single tenant label from a generated platform hostname. */
export const generatedDomainSlug = (
    hostname: string,
    suffix_root = ""
): string | undefined => {
    const host = hostnameOf(hostname)
    const root = hostnameOf(suffix_root)

    if (classifyHost(host, root) !== "generated") {
        return undefined
    }

    const suffix = suffixes(root).find((candidate) => host.endsWith(candidate))

    if (suffix === undefined) {
        return undefined
    }

    const slug = host.slice(0, -suffix.length)

    return slug === "" || slug.includes(".") ? undefined : slug
}

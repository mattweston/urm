import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type { Url } from "foldkit/url"

import {
    classifyHost,
    hostnameOf,
    localPublicationHost,
} from "@urm/utils/hosts"

export const HostContext = Schema.Struct({
    kind: Schema.Literals(["central", "generated", "custom"]),
    hostname: Schema.String,
    auth_capable: Schema.Boolean,
    requested_domain_slug: Schema.Option(Schema.String),
})
export type HostContext = typeof HostContext.Type

const development_suffix_root = (hostname: string): string =>
    hostname === "urm.test" || hostname.endsWith(".urm.test") ? "urm.test" : ""

const platform_suffix_root = (hostname: string): string =>
    hostname === "localhost" || hostname.endsWith(".localhost")
        ? "localhost"
        : hostname === "urm.test" || hostname.endsWith(".urm.test")
          ? "urm.test"
          : hostname === "urm.dev" || hostname.endsWith(".urm.dev")
            ? "urm.dev"
            : ""

export const central_href_for_host = (hostname: string): string => {
    const suffix_root = platform_suffix_root(hostnameOf(hostname))

    return suffix_root === "urm.dev"
        ? "https://app.urm.dev/"
        : "http://app.localhost:1420/"
}

export const domain_href_for_host = (
    hostname: string,
    slug: string
): string => {
    const suffix_root = platform_suffix_root(hostnameOf(hostname))

    return suffix_root === "urm.dev"
        ? `https://app.urm.dev/dashboard?domain=${encodeURIComponent(slug)}`
        : `http://app.localhost:1420/dashboard?domain=${encodeURIComponent(slug)}`
}

const requested_domain_slug = (url: Url): string | undefined => {
    const value = new URLSearchParams(
        Option.getOrElse(url.search, () => "")
    ).get("domain")

    return value !== null && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
        ? value
        : undefined
}

export const host_context_for_url = (url: Url): HostContext => {
    const hostname = hostnameOf(url.host)
    const suffix_root = development_suffix_root(hostname)
    const kind =
        hostname === "127.0.0.1"
            ? "central"
            : localPublicationHost(hostname, suffix_root) !== undefined
              ? "custom"
              : hostname.endsWith(".urm.dev") && hostname !== "app.urm.dev"
                ? "custom"
                : classifyHost(hostname, suffix_root)

    return HostContext.make({
        kind,
        hostname,
        auth_capable:
            url.protocol === "https:" ||
            hostname === "127.0.0.1" ||
            hostname === "localhost" ||
            hostname.endsWith(".localhost"),
        requested_domain_slug: Option.fromNullishOr(
            kind === "central" ? requested_domain_slug(url) : undefined
        ),
    })
}

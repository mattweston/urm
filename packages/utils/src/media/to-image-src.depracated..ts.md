/**
 * # To Image Src Media Util
 */
import "../env.ts"

const LOCAL_SERVER_ORIGIN = "http://localhost:1234"

export type MediaEnvironment = Readonly<{
    readonly PUBLIC_RPC_URL?: string
    readonly PUBLIC_UPLOAD_URL?: string
    readonly PUBLIC_DOMAIN_RPC_PROXY?: string
    readonly VITE_DOMAIN_RPC_PROXY?: string
    readonly VITE_RPC_URL?: string
}>

const usesDomainApiProxy = (environment: MediaEnvironment): boolean =>
    environment.VITE_DOMAIN_RPC_PROXY === "true" ||
    environment.PUBLIC_DOMAIN_RPC_PROXY === "true"

const serverOrigin = (endpoint: string | undefined): string | undefined => {
    if (endpoint === undefined) {
        return undefined
    }

    try {
        const url = new URL(endpoint)
        return url.protocol === "http:" || url.protocol === "https:"
            ? url.origin
            : undefined
    } catch {
        return undefined
    }
}

// Order matters: VITE_RPC_URL wins over PUBLIC_UPLOAD_URL wins over
// PUBLIC_RPC_URL. Under the domain proxy it returns undefined so callers fall
// back to a same-origin path — a tenant site must not address the API directly.
export const resolveConfiguredServerOrigin = (
    environment: MediaEnvironment
): string | undefined => {
    if (usesDomainApiProxy(environment)) {
        return undefined
    }

    const viteRpcOrigin = serverOrigin(environment.VITE_RPC_URL)
    if (viteRpcOrigin !== undefined) {
        return viteRpcOrigin
    }

    const uploadOrigin = serverOrigin(environment.PUBLIC_UPLOAD_URL)
    if (uploadOrigin !== undefined) {
        return uploadOrigin
    }

    return serverOrigin(environment.PUBLIC_RPC_URL)
}

export const resolveImageProxyBase = (environment: MediaEnvironment): string =>
    usesDomainApiProxy(environment)
        ? ""
        : (resolveConfiguredServerOrigin(environment) ?? LOCAL_SERVER_ORIGIN)

// Frozen at module load. Changing the env after import has no effect.
const API_BASE = resolveImageProxyBase(import.meta.env)

// Substring sniffing, not parsing. A URL that happens to contain "/gallery/" is
// proxied whether or not it is ours, and a stored upload on a host not listed
// here is served raw and 403s.
export function requiresImageUrlProxy(url: string): boolean {
    return (
        url.includes("X-Amz-") ||
        url.includes("tigris.dev") ||
        url.includes("tigrisdata.cloud") ||
        url.includes("/gallery/")
    )
}

// Every stored upload URL must go through this before reaching an <img src>.
// The bucket is private, so the raw URL 403s; /image-url re-signs it per request.
export function toImageSrc(url: string | undefined | null): string {
    if (url == null || url === "") return ""
    if (requiresImageUrlProxy(url))
        return `${API_BASE}/image-url?url=${encodeURIComponent(url)}`
    return url
}

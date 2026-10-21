/**
 * # Get Upload Url Media Util
 */
import "../env.ts"
import {
    resolveConfiguredServerOrigin,
    type MediaEnvironment,
} from "./to-image-src.ts"

export const resolveUploadUrl = (environment: MediaEnvironment): string => {
    const serverOrigin = resolveConfiguredServerOrigin(environment)

    return serverOrigin === undefined ? "/upload" : `${serverOrigin}/upload`
}

const UPLOAD_URL = resolveUploadUrl(import.meta.env)

// Client-only — reads globalThis.location. The server-side counterpart that
// actually presigns is `getUploadUrl` in ../upload.ts.
export async function getUploadUrl(
    contentType: string = "image/jpeg"
): Promise<{
    url: string
    key: string
    publicUrl: string
}> {
    const requestUrl = new URL(UPLOAD_URL, globalThis.location.origin)
    requestUrl.searchParams.set("contentType", contentType)

    const response = await fetch(requestUrl, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    })
    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to get upload URL: ${errorText}`)
    }
    return await response.json()
}

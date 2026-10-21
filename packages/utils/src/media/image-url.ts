export const toImageSrc = (url: string | undefined | null): string => url ?? ""

export const requiresImageUrlProxy = (value: string): boolean => {
    try {
        const url = new URL(value)
        return (
            url.hostname.endsWith(".tigris.dev") ||
            url.hostname.endsWith(".tigrisdata.cloud") ||
            url.searchParams.has("X-Amz-Signature") ||
            url.searchParams.has("X-Amz-Credential")
        )
    } catch {
        return false
    }
}

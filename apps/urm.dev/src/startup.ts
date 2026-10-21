export const development_redirect_url = (
    href: string,
    is_native: boolean
): string | undefined => {
    const url = new URL(href)
    if (
        is_native ||
        url.hostname !== "localhost" ||
        (url.protocol !== "http:" && url.protocol !== "https:")
    ) {
        return undefined
    }
    url.hostname = "app.localhost"
    return url.href
}

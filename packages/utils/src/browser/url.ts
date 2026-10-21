/**
 * # Url Browser util
 */
type BrowserWindow = Readonly<{
    location: Readonly<{
        origin: string
    }>
}>

const isBrowserWindow = (value: unknown): value is BrowserWindow =>
    typeof value === "object" &&
    value !== null &&
    "location" in value &&
    typeof value.location === "object" &&
    value.location !== null &&
    "origin" in value.location &&
    typeof value.location.origin === "string"

const currentWindow = (): BrowserWindow | undefined => {
    const maybeWindow: unknown = Reflect.get(globalThis, "window")

    if (isBrowserWindow(maybeWindow)) {
        return maybeWindow
    }

    return undefined
}

// Falls back to a localhost origin on the server rather than throwing, so SSR
// can build absolute URLs. That fallback is wrong in production SSR — anything
// user-visible needs the configured public origin, not this.
export const getHostOrigin = (): string => {
    const maybeWindow = currentWindow()

    if (maybeWindow) {
        return maybeWindow.location.origin
    }

    const port = process.env.PORT || "4321"
    return `http://localhost:${port}`
}

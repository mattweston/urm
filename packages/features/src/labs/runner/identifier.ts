// `crypto.randomUUID()` is restricted to secure contexts. The development site
// is intentionally reachable over plain HTTP on the local network, so fall back
// to a timestamp-plus-random identifier when the browser withholds that API.
export const create_identifier = (): string => {
    const random_uuid = globalThis.crypto?.randomUUID

    if (random_uuid !== undefined) {
        return random_uuid.call(globalThis.crypto)
    }

    return `effect-example-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

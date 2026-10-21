/**
 * # Pwned Passwords
 *
 * k-anonymity lookup against the HIBP range API — only a five-character hash
 * prefix leaves the process.
 */
import { createHash } from "node:crypto"
import { Effect, Schema } from "effect"

export type PwnedPasswordCheck = Readonly<{
    pwned: boolean
    count: number
}>

export type PwnedPasswordFetch = (
    url: string,
    init?: RequestInit
) => Promise<Response>

export type PwnedPasswordConfig = Readonly<{
    timeout_ms: number
    cache_ttl_ms: number
}>

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range"
const HIBP_USER_AGENT = "URM Auth Password Safety"

export class PwnedPasswordError extends Schema.TaggedError<PwnedPasswordError>()(
    "PwnedPasswordError",
    {
        operation: Schema.String,
        cause: Schema.optionalKey(Schema.Defect()),
    }
) {}

// Add-Padding asks HIBP to pad every response to a uniform size. Without it,
// response length leaks roughly how many suffixes a prefix holds, which is a
// side channel for anyone watching the traffic.
const HIBP_RANGE_HEADERS = {
    "Add-Padding": "true",
    "User-Agent": HIBP_USER_AGENT,
}

type CacheEntry = Readonly<{
    body: string
    expires_at: number
}>

// Unbounded and process-wide: no size limit, and the TTL is only consulted when
// a prefix is looked up again, so entries for prefixes never re-requested stay
// until exit. It also survives between tests — call clearPwnedPasswordCache in
// teardown or a stubbed response leaks into the next one.
const responseCache = new Map<string, CacheEntry>()

const fetchPwnedPasswordRange: PwnedPasswordFetch = (url, init) =>
    fetch(url, init)

const cachedRangeBody = (
    prefix: string,
    config: PwnedPasswordConfig,
    fetchRange: PwnedPasswordFetch
) =>
    Effect.gen(function* () {
        const cached = responseCache.get(prefix)

        if (cached !== undefined && Date.now() < cached.expires_at) {
            return cached.body
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), config.timeout_ms)

        const response = yield* Effect.tryPromise({
            try: () =>
                fetchRange(`${HIBP_RANGE_URL}/${prefix}`, {
                    headers: HIBP_RANGE_HEADERS,
                    signal: controller.signal,
                }),
            catch: (cause) =>
                new PwnedPasswordError({ operation: "request", cause }),
        }).pipe(Effect.ensuring(Effect.sync(() => clearTimeout(timeout))))

        if (!response.ok) {
            return yield* Effect.fail(
                new PwnedPasswordError({
                    operation: `response_status_${response.status}`,
                })
            )
        }

        const body = yield* Effect.tryPromise({
            try: () => response.text(),
            catch: (cause) =>
                new PwnedPasswordError({ operation: "response_body", cause }),
        })

        responseCache.set(prefix, {
            body,
            expires_at: Date.now() + config.cache_ttl_ms,
        })

        return body
    })

// SHA-1 despite being broken for signatures: it is not protecting anything
// here, it is the identifier HIBP's corpus is keyed by. Uppercase because HIBP
// returns uppercase suffixes and the comparison is an exact string match.
export const sha1UpperHex = (value: string): string =>
    createHash("sha1").update(value).digest("hex").toUpperCase()

export const pwnedPasswordRange = (
    password: string
): Readonly<{ prefix: string; suffix: string }> => {
    const hash = sha1UpperHex(password)

    return {
        prefix: hash.slice(0, 5),
        suffix: hash.slice(5),
    }
}

const parsePwnedPasswordCount = (rangeBody: string, suffix: string): number => {
    const lines = rangeBody.split("\n")

    for (const line of lines) {
        const [lineSuffix, countText] = line.trim().split(":")

        if (lineSuffix === suffix && countText !== undefined) {
            const count = Number.parseInt(countText, 10)
            return Number.isNaN(count) ? 0 : count
        }
    }

    return 0
}

export const checkPwnedPassword = (
    password: string,
    config: PwnedPasswordConfig,
    fetchRange: PwnedPasswordFetch = fetchPwnedPasswordRange
): Effect.Effect<PwnedPasswordCheck, PwnedPasswordError> =>
    Effect.gen(function* () {
        const range = pwnedPasswordRange(password)
        const body = yield* cachedRangeBody(range.prefix, config, fetchRange)
        const count = parsePwnedPasswordCount(body, range.suffix)

        return {
            pwned: count > 0,
            count,
        }
    })

export const clearPwnedPasswordCache = () => {
    responseCache.clear()
}

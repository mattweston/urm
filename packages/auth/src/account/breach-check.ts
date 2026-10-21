import { sql } from "drizzle-orm"
import { Effect, Schema } from "effect"
import { Breach, BreachCheckResult } from "@urm/contracts/auth"
import { Sql, query_rows } from "@urm/database/sql"
import { AccountPrincipal, AuthError } from "./service.ts"

const Input = Schema.Struct({
    email: Schema.String.check(Schema.isMaxLength(254)),
})
const Attempt = Schema.Struct({ attempts: Schema.Number })
const failure = (message: string): BreachCheckResult => ({
    status: "error",
    breaches: [],
    message,
})

/** A fixed one-minute window shared by every server process. */
const admit = Effect.fn("Auth.admitBreachCheck")(function* (
    account_id: string
) {
    const db = yield* Sql
    const now = Date.now()
    const window_start = Math.floor(now / 60_000) * 60_000
    return yield* db.transaction(
        Effect.gen(function* () {
            const user = yield* query_rows(
                Attempt,
                sql`INSERT INTO account_login_attempts (key,window_start,attempts) VALUES (${`breach:user:${account_id}`},${window_start},1)
                ON CONFLICT (key) DO UPDATE SET window_start=EXCLUDED.window_start,
                    attempts=CASE WHEN account_login_attempts.window_start=EXCLUDED.window_start THEN account_login_attempts.attempts+1 ELSE 1 END
                RETURNING attempts`
            )
            if ((user[0]?.attempts ?? 6) > 5) return false
            const provider = yield* query_rows(
                Attempt,
                sql`INSERT INTO account_login_attempts (key,window_start,attempts) VALUES ('breach:provider',${window_start},1)
                ON CONFLICT (key) DO UPDATE SET window_start=EXCLUDED.window_start,
                    attempts=CASE WHEN account_login_attempts.window_start=EXCLUDED.window_start THEN account_login_attempts.attempts+1 ELSE 1 END
                RETURNING attempts`
            )
            return (provider[0]?.attempts ?? 11) <= 10
        })
    )
})

export const lookup_breaches = async (
    email: string,
    api_key: string | undefined,
    fetch_request: typeof fetch = fetch
): Promise<BreachCheckResult> => {
    const address = email.trim().toLowerCase()
    if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
        return failure("Enter a valid email address.")
    const key =
        api_key?.trim() ||
        (address.endsWith("@hibp-integration-tests.com")
            ? "00000000000000000000000000000000"
            : undefined)
    if (key === undefined)
        return failure(
            "Real email checks are not configured yet. Try a test address or ask an administrator to enable Have I Been Pwned."
        )
    try {
        const response = await fetch_request(
            `https://haveibeenpwned.com/api/v3/breachedAccount/${encodeURIComponent(address)}?truncateResponse=false`,
            {
                headers: {
                    "hibp-api-key": key,
                    "user-agent": "URM-Email-Breach-Checker",
                },
                signal: AbortSignal.timeout(15_000),
            }
        )
        if (response.status === 404)
            return {
                status: "complete",
                breaches: [],
                message: "No known breaches found.",
            }
        if (response.status === 429) {
            const seconds = Number(response.headers.get("retry-after"))
            return failure(
                Number.isFinite(seconds) && seconds > 0
                    ? `Too many checks. Try again in ${Math.ceil(seconds)} seconds.`
                    : "Too many checks. Wait a moment before trying again."
            )
        }
        if (response.status === 401 || response.status === 403)
            return failure(
                "Have I Been Pwned access is unavailable. An administrator needs to check the API subscription and configuration."
            )
        if (!response.ok)
            return failure("Have I Been Pwned is unavailable. Try again later.")
        const breaches = Schema.decodeUnknownSync(Schema.Array(Breach))(
            await response.json()
        )
        return {
            status: "complete",
            breaches,
            message:
                breaches.length === 0
                    ? "No known breaches found."
                    : `Found in ${breaches.length} known ${breaches.length === 1 ? "breach" : "breaches"}.`,
        }
    } catch {
        return failure(
            "The breach check could not be completed. Try again later."
        )
    }
}

export const check_email_breaches = Effect.fn("Auth.checkEmailBreaches")(
    function* (principal: AccountPrincipal, value: unknown) {
        const input = yield* Schema.decodeUnknownEffect(Input)(value).pipe(
            Effect.mapError(() => new AuthError({ reason: "invalid_input" }))
        )
        if (!(yield* admit(principal.account_id)))
            return failure("Too many checks. Try again in one minute.")
        return yield* Effect.promise(() =>
            lookup_breaches(input.email, process.env.HIBP_API_KEY)
        )
    }
)

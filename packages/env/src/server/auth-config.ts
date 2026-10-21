/**
 * # Auth Env Config
 *
 * AuthConfig – AUTH_SECRET, Google OAuth, demo credentials gate, password safety.
 * Env: AUTH_SECRET (required), GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 * GOOGLE_DEMO_CLIENT_ID, GOOGLE_DEMO_CLIENT_SECRET,
 * AUTH_DEMO_CREDENTIALS_ENABLED, AUTH_PWNED_PASSWORDS_ENABLED,
 * AUTH_PWNED_PASSWORDS_FAIL_CLOSED.
 */
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

export class AuthConfigurationError extends Schema.TaggedError<AuthConfigurationError>()(
    "AuthConfigurationError",
    { message: Schema.String }
) {}

export class AuthConfig extends Context.Service<
    AuthConfig,
    {
        readonly authSecret: Redacted.Redacted<string>
        readonly demoCredentialsEnabled: boolean
        readonly googleClientId: string
        readonly googleClientSecret: Redacted.Redacted<string>
        readonly pwnedPasswordsEnabled: boolean
        readonly pwnedPasswordsFailClosed: boolean
        readonly pwnedPasswordsTimeoutMs: number
        readonly pwnedPasswordsCacheTtlMs: number
        readonly sessionInactivityTimeoutMs: number
        readonly sessionAbsoluteMaxLifetimeMs: number
        readonly recentAuthTimeoutMs: number
        /** Shared secret accepted only from the domain worker/proxy. */
        readonly domainWorkerToken: Redacted.Redacted<string>
    }
>()("AuthConfig") {
    static readonly layer = Layer.effect(
        AuthConfig,
        Effect.gen(function* () {
            const c = yield* Config.all({
                authSecret: Config.Redacted("AUTH_SECRET"),
                demoCredentialsEnabled: Config.Boolean(
                    "AUTH_DEMO_CREDENTIALS_ENABLED"
                ).pipe(Config.withDefault(false)),
                googleClientId: Config.String("GOOGLE_CLIENT_ID").pipe(
                    Config.withDefault("")
                ),
                googleClientSecret: Config.option(
                    Config.Redacted("GOOGLE_CLIENT_SECRET")
                ),
                googleDemoClientId: Config.option(
                    Config.String("GOOGLE_DEMO_CLIENT_ID")
                ),
                googleDemoClientSecret: Config.option(
                    Config.Redacted("GOOGLE_DEMO_CLIENT_SECRET")
                ),
                isDemo: Config.Boolean("IS_DEMO").pipe(
                    Config.withDefault(false)
                ),
                pwnedPasswordsEnabled: Config.Boolean(
                    "AUTH_PWNED_PASSWORDS_ENABLED"
                ).pipe(Config.withDefault(false)),
                pwnedPasswordsFailClosed: Config.Boolean(
                    "AUTH_PWNED_PASSWORDS_FAIL_CLOSED"
                ).pipe(Config.withDefault(false)),
                pwnedPasswordsTimeoutMs: Config.Number(
                    "AUTH_PWNED_PASSWORDS_TIMEOUT_MS"
                ).pipe(Config.withDefault(5000)),
                pwnedPasswordsCacheTtlMs: Config.Number(
                    "AUTH_PWNED_PASSWORDS_CACHE_TTL_MS"
                ).pipe(Config.withDefault(300000)),
                sessionInactivityTimeoutMs: Config.Number(
                    "AUTH_SESSION_INACTIVITY_TIMEOUT_MS"
                ).pipe(Config.withDefault(86_400_000)),
                sessionAbsoluteMaxLifetimeMs: Config.Number(
                    "AUTH_SESSION_ABSOLUTE_MAX_LIFETIME_MS"
                ).pipe(Config.withDefault(2_592_000_000)),
                recentAuthTimeoutMs: Config.Number(
                    "AUTH_RECENT_AUTH_TIMEOUT_MS"
                ).pipe(Config.withDefault(300_000)),
                domainWorkerToken: Config.option(
                    Config.Redacted("AUTH_DOMAIN_WORKER_TOKEN")
                ),
            }).pipe(
                Config.map((c) => ({
                    authSecret: c.authSecret,
                    demoCredentialsEnabled: c.demoCredentialsEnabled,
                    googleClientId: c.googleClientId,
                    googleClientSecret: Option.getOrElse(
                        c.googleClientSecret,
                        () => Redacted.make("")
                    ),
                    googleDemoClientId: c.googleDemoClientId,
                    googleDemoClientSecret: c.googleDemoClientSecret,
                    isDemo: c.isDemo,
                    pwnedPasswordsEnabled: c.pwnedPasswordsEnabled,
                    pwnedPasswordsFailClosed: c.pwnedPasswordsFailClosed,
                    pwnedPasswordsTimeoutMs: c.pwnedPasswordsTimeoutMs,
                    pwnedPasswordsCacheTtlMs: c.pwnedPasswordsCacheTtlMs,
                    sessionInactivityTimeoutMs: c.sessionInactivityTimeoutMs,
                    sessionAbsoluteMaxLifetimeMs:
                        c.sessionAbsoluteMaxLifetimeMs,
                    recentAuthTimeoutMs: c.recentAuthTimeoutMs,
                    domainWorkerToken: Option.getOrElse(
                        c.domainWorkerToken,
                        () => Redacted.make("")
                    ),
                }))
            )
            if (c.isDemo) {
                if (
                    Option.isNone(c.googleDemoClientId) ||
                    Option.isNone(c.googleDemoClientSecret)
                ) {
                    return yield* Effect.fail(
                        new AuthConfigurationError({
                            message:
                                "Demo deployments require GOOGLE_DEMO_CLIENT_ID and GOOGLE_DEMO_CLIENT_SECRET",
                        })
                    )
                }

                return AuthConfig.of({
                    ...c,
                    googleClientId: c.googleDemoClientId.value,
                    googleClientSecret: c.googleDemoClientSecret.value,
                })
            }

            return AuthConfig.of(c)
        })
    )
}

export const AuthConfigLive = AuthConfig.layer

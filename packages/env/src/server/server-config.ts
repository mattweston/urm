/**
 * # Env Server Config
 *
 * ServerConfig – HTTP server and app URLs.
 * Env: PORT, HOSTNAME, API_URL, APP_URL, ADMIN_APP_URL, MARKETING_APP_URL,
 * COOKIE_DOMAIN (optional).
 */
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"

const normalizedUrl = (value: string, fallback: string): string => {
    const url = value.trim().replace(/\/+$/, "")

    return url === "" ? fallback : url
}

const urlConfig = (name: string, fallback: string) =>
    Config.string(name).pipe(
        Config.withDefault(fallback),
        Config.map((value) => normalizedUrl(value, fallback))
    )

// The dev fallbacks below are destinations the browser is sent to (OAuth
// returns, app links), so they have to name the machine running the servers.
// TAILSCALE_URL names that box when it is not the one with the tab open; unset,
// everything stays on localhost. Scheme + host, no port — see .env.example.
const devOriginConfig = Config.string("TAILSCALE_URL").pipe(
    Config.withDefault("http://localhost"),
    Config.map((value) => normalizedUrl(value, "http://localhost"))
)

// TAILSCALE_URL is the suffix root, which generated domain hosts hang below.
// The platform sits at `app.` above them, and that is where sign-in, the domain
// chooser and administration are served. A plain localhost clone has no such
// split, so it keeps the origin as it is.
const devCentralOriginConfig = devOriginConfig.pipe(
    Config.map((origin) =>
        origin === "http://localhost"
            ? origin
            : origin.replace(/^([a-z]+:\/\/)?/, "$1app.")
    )
)

export class ServerConfig extends Context.Service<
    ServerConfig,
    {
        readonly port: number
        readonly hostname: string
        readonly apiUrl: string
        readonly appUrl: string
        readonly adminAppUrl: string
        readonly marketingAppUrl: string
        readonly cookieDomain: string
    }
>()("ServerConfig") {
    static readonly layer = Layer.effect(
        ServerConfig,
        Effect.gen(function* () {
            const devOrigin = yield* devOriginConfig
            const devCentralOrigin = yield* devCentralOriginConfig
            const config = yield* Config.all({
                port: Config.number("PORT"),
                hostname: Config.string("HOSTNAME").pipe(
                    Config.withDefault("0.0.0.0")
                ),
                apiUrl: Config.string("API_URL"),
                // Sign-in and the domain chooser are on the platform host;
                // the marketing site stays at the suffix root.
                appUrl: urlConfig("APP_URL", `${devCentralOrigin}:4321`),
                adminAppUrl: urlConfig(
                    "ADMIN_APP_URL",
                    `${devCentralOrigin}:4321`
                ),
                marketingAppUrl: urlConfig(
                    "MARKETING_APP_URL",
                    `${devOrigin}:4321`
                ),
                cookieDomain: Config.option(Config.string("COOKIE_DOMAIN")),
            }).pipe(
                Config.map((c) => ({
                    ...c,
                    cookieDomain: Option.getOrElse(c.cookieDomain, () => ""),
                }))
            )
            return ServerConfig.of(config)
        })
    )
}

export const ServerConfigLive = ServerConfig.layer

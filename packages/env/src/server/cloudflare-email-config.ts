/**
 * # Cloudflare Email Config
 *
 * Cloudflare Email Service config. Supports REST (default) and SMTP transport.
 * Env: CLOUDFLARE_EMAIL_ENABLED, CLOUDFLARE_ACCOUNT_ID,
 * CLOUDFLARE_EMAIL_API_TOKEN, CLOUDFLARE_EMAIL_FROM,
 * CLOUDFLARE_EMAIL_TRANSPORT (rest|smtp),
 * CLOUDFLARE_EMAIL_SMTP_HOST, CLOUDFLARE_EMAIL_SMTP_PORT.
 */
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"

export type CloudflareEmailTransport = "rest" | "smtp"

export class CloudflareEmailConfig extends Context.Service<
    CloudflareEmailConfig,
    {
        readonly enabled: boolean
        readonly accountId: string
        readonly apiToken: Redacted.Redacted<string>
        readonly from: string
        readonly transport: CloudflareEmailTransport
        readonly smtpHost: string
        readonly smtpPort: number
    }
>()("CloudflareEmailConfig") {
    static readonly layer = Layer.effect(
        CloudflareEmailConfig,
        Effect.gen(function* () {
            const config = yield* Config.all({
                enabled: Config.Boolean("CLOUDFLARE_EMAIL_ENABLED").pipe(
                    Config.withDefault(false)
                ),
                accountId: Config.String("CLOUDFLARE_ACCOUNT_ID").pipe(
                    Config.withDefault("")
                ),
                apiToken: Config.option(
                    Config.Redacted("CLOUDFLARE_EMAIL_API_TOKEN")
                ),
                from: Config.String("CLOUDFLARE_EMAIL_FROM").pipe(
                    Config.withDefault("")
                ),
                transport: Config.String("CLOUDFLARE_EMAIL_TRANSPORT").pipe(
                    Config.withDefault("rest")
                ),
                smtpHost: Config.String("CLOUDFLARE_EMAIL_SMTP_HOST").pipe(
                    Config.withDefault("smtp.mx.cloudflare.net")
                ),
                smtpPort: Config.Number("CLOUDFLARE_EMAIL_SMTP_PORT").pipe(
                    Config.withDefault(465)
                ),
            }).pipe(
                Config.map((c) => ({
                    enabled: c.enabled,
                    accountId: c.accountId,
                    apiToken: Option.getOrElse(c.apiToken, () =>
                        Redacted.make("")
                    ),
                    from: c.from,
                    transport: (c.transport === "smtp"
                        ? "smtp"
                        : "rest") as CloudflareEmailTransport,
                    smtpHost: c.smtpHost,
                    smtpPort: c.smtpPort,
                }))
            )

            return CloudflareEmailConfig.of(config)
        })
    )
}

export const CloudflareEmailConfigLive = CloudflareEmailConfig.layer

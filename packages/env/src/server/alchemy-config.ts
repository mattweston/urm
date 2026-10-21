/**
 * # Infra Env Config
 *
 * AlchemyConfig – Cloudflare deployment credentials.
 * Env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, ALCHEMY_PASSWORD, ALCHEMY_STAGE (optional).
 */
/// <reference types="node" />
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"

export class AlchemyConfig extends Context.Service<
    AlchemyConfig,
    {
        readonly cloudflareApiToken: Redacted.Redacted<string>
        readonly cloudflareAccountId: string
        readonly alchemyPassword: Redacted.Redacted<string>
        readonly alchemyStage: string
    }
>()("AlchemyConfig") {
    static readonly layer = Layer.effect(
        AlchemyConfig,
        Effect.gen(function* () {
            const config = yield* Config.all({
                cloudflareApiToken: Config.Redacted("CLOUDFLARE_API_TOKEN"),
                cloudflareAccountId: Config.String(
                    "CLOUDFLARE_ACCOUNT_ID"
                ).pipe(Config.withDefault("")),
                alchemyPassword: Config.Redacted("ALCHEMY_PASSWORD"),
                alchemyStage: Config.option(Config.String("ALCHEMY_STAGE")),
            }).pipe(
                Config.map((c) => ({
                    ...c,
                    alchemyStage: Option.getOrElse(
                        c.alchemyStage,
                        () => process.env.USER ?? "dev"
                    ),
                }))
            )
            return AlchemyConfig.of(config)
        })
    )
}

export const AlchemyConfigLive = AlchemyConfig.layer

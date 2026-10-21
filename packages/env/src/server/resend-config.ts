/**
 * # Resend Env Config
 *
 * ResendConfig – Resend webhook verification.
 * Env: RESEND_WEBHOOK_SECRET (optional).
 */
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"

export class ResendConfig extends Context.Service<
    ResendConfig,
    {
        readonly resendWebhookSecret: string
    }
>()("ResendConfig") {
    static readonly layer = Layer.effect(
        ResendConfig,
        Effect.gen(function* () {
            const config = yield* Config.all({
                resendWebhookSecret: Config.option(
                    Config.String("RESEND_WEBHOOK_SECRET")
                ),
            }).pipe(
                Config.map((c) => ({
                    resendWebhookSecret: Option.getOrElse(
                        c.resendWebhookSecret,
                        () => ""
                    ),
                }))
            )
            return ResendConfig.of(config)
        })
    )
}

export const ResendConfigLive = ResendConfig.layer

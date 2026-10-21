/**
 * # Stripe Env Config
 *
 * StripeConfig – Stripe API and webhook secrets.
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (optional; empty in dev).
 */
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"

export class StripeConfig extends Context.Service<
    StripeConfig,
    {
        readonly stripeSecretKey: Redacted.Redacted<string>
        readonly stripeWebhookSecret: Redacted.Redacted<string>
    }
>()("StripeConfig") {
    static readonly layer = Layer.effect(
        StripeConfig,
        Effect.gen(function* () {
            const config = yield* Config.all({
                stripeSecretKey: Config.option(
                    Config.redacted("STRIPE_SECRET_KEY")
                ),
                stripeWebhookSecret: Config.option(
                    Config.redacted("STRIPE_WEBHOOK_SECRET")
                ),
            }).pipe(
                Config.map((c) => ({
                    stripeSecretKey: Option.getOrElse(c.stripeSecretKey, () =>
                        Redacted.make("")
                    ),
                    stripeWebhookSecret: Option.getOrElse(
                        c.stripeWebhookSecret,
                        () => Redacted.make("")
                    ),
                }))
            )
            return StripeConfig.of(config)
        })
    )
}

export const StripeConfigLive = StripeConfig.layer

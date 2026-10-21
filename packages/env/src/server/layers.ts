/**
 * # Env Layers
 *
 * Composed layers for server-side config.
 * Provide EnvServerLive to get ServerConfig, AuthConfig, StripeConfig, ResendConfig, DbConfig, AlchemyConfig, CloudflareEmailConfig.
 */
import * as Layer from "effect/Layer"
import { AlchemyConfigLive } from "./alchemy-config.ts"
import { AuthConfigLive } from "./auth-config.ts"
import { CloudflareEmailConfigLive } from "./cloudflare-email-config.ts"
import { DbConfigLive } from "./db-config.ts"
import { ResendConfigLive } from "./resend-config.ts"
import { ServerConfigLive } from "./server-config.ts"
import { StripeConfigLive } from "./stripe-config.ts"

/** Server + Auth + Stripe + Resend + Db + Alchemy + Cloudflare email config layers merged. */
export const EnvServerLive = Layer.mergeAll(
    ServerConfigLive,
    AuthConfigLive,
    StripeConfigLive,
    ResendConfigLive,
    DbConfigLive,
    AlchemyConfigLive,
    CloudflareEmailConfigLive
)

import { type AuthPersistence } from "@urm/auth/auth-persistence"
import { authRateLimitKey, checkAuthRateLimit } from "@urm/auth/rate-limiter"
import { Effect } from "effect"

const CART_MUTATION_LIMIT = 30
const CART_MUTATION_WINDOW_SECONDS = 60
const CHECKOUT_LIMIT = 3
const CHECKOUT_WINDOW_SECONDS = 60 * 60

const allowShopMutation = (
    route: string,
    domain_id: string,
    session_id: string,
    limit: number,
    window_seconds: number
): Effect.Effect<boolean, never, AuthPersistence> =>
    checkAuthRateLimit({
        route,
        key: authRateLimitKey(["shop", domain_id, session_id, route]),
        limit,
        window_seconds,
        block_seconds: window_seconds,
    }).pipe(
        Effect.map((decision) => decision.allowed),
        Effect.catch(() => Effect.succeed(false))
    )

export const allowCartMutation = (
    route: "shop/cart/add" | "shop/cart/remove" | "shop/cart/update",
    domain_id: string,
    session_id: string
) =>
    allowShopMutation(
        route,
        domain_id,
        session_id,
        CART_MUTATION_LIMIT,
        CART_MUTATION_WINDOW_SECONDS
    )

export const allowCheckoutCreate = (domain_id: string, session_id: string) =>
    allowShopMutation(
        "shop/checkout/create",
        domain_id,
        session_id,
        CHECKOUT_LIMIT,
        CHECKOUT_WINDOW_SECONDS
    )

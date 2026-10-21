import { describe, expect, it } from "@effect/vitest"
import {
    ActiveDomainRpcMiddleware,
    AuthenticatedRpcMiddleware,
    DomainManagerRpcMiddleware,
} from "../src/auth-legacy/rpc-middleware.ts"
import { ShopRpcs } from "../src/shop/routes.ts"

const public_shop_rpcs = ["products_list", "products_get", "collections_list"]

const session_shop_rpcs = [
    "cart_get",
    "cart_add",
    "cart_remove",
    "cart_update",
    "checkout_create",
    "checkout_order_get",
]

const domain_manager_shop_rpcs = [
    "products_create",
    "products_update",
    "orders_list",
    "orders_get",
]

const hasMiddleware = (
    middlewares: Iterable<unknown> | undefined,
    middleware: unknown
) =>
    middlewares !== undefined &&
    [...middlewares].some((item) => item === middleware)

describe("domain-scoped shop RPC contracts", () => {
    it("requires a resolved domain for public catalog procedures", () => {
        for (const name of public_shop_rpcs) {
            const rpc = ShopRpcs.requests.get(name)

            expect(
                hasMiddleware(rpc?.middlewares, ActiveDomainRpcMiddleware)
            ).toBe(true)
            expect(
                hasMiddleware(rpc?.middlewares, AuthenticatedRpcMiddleware)
            ).toBe(false)
        }
    })

    it("scopes anonymous carts to the active domain without manager authority", () => {
        for (const name of session_shop_rpcs) {
            const rpc = ShopRpcs.requests.get(name)

            expect(
                hasMiddleware(rpc?.middlewares, ActiveDomainRpcMiddleware)
            ).toBe(true)
            expect(
                hasMiddleware(rpc?.middlewares, AuthenticatedRpcMiddleware)
            ).toBe(false)
            expect(
                hasMiddleware(rpc?.middlewares, DomainManagerRpcMiddleware)
            ).toBe(false)
        }
    })

    it("requires domain-owner authority for non-public shop procedures", () => {
        for (const name of domain_manager_shop_rpcs) {
            const rpc = ShopRpcs.requests.get(name)

            expect(
                hasMiddleware(rpc?.middlewares, ActiveDomainRpcMiddleware)
            ).toBe(true)
            expect(
                hasMiddleware(rpc?.middlewares, AuthenticatedRpcMiddleware)
            ).toBe(true)
            expect(
                hasMiddleware(rpc?.middlewares, DomainManagerRpcMiddleware)
            ).toBe(true)
        }
    })
})

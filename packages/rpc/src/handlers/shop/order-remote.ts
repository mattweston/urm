import { Effect } from "effect"
import { entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    CreateShopPendingOrder,
    DomainShopOrders,
    ShopOrdersEntity,
    ShopOrdersRemote,
} from "@urm/contracts/shop"
import { shop_admin_cart_session_id } from "@urm/domain/shop"
import type { ShopCatalogPrincipal } from "./catalog-repository.ts"
import { ShopOrderRepository } from "./order-repository.ts"

const terminal: Boundary = { _tag: "Terminal" }
const failure = () =>
    new RemoteServerError({
        message: "Shop order unavailable or access denied",
    })

export const ShopOrderServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<ShopCatalogPrincipal, ShopOrderRepository>(
            ShopOrdersEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        if (ids.some((id) => id !== principal.domain_id))
                            return yield* Effect.fail(failure())
                        return ids.length === 0
                            ? []
                            : [
                                  {
                                      id: principal.domain_id,
                                      values: {
                                          id: principal.domain_id,
                                          orders: yield* Effect.flatMap(
                                              ShopOrderRepository,
                                              (repository) =>
                                                  repository.list_orders(
                                                      principal
                                                  )
                                          ),
                                      },
                                  },
                              ]
                    }).pipe(Effect.mapError(failure)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            DomainShopOrders,
            ({
                input,
                principal,
            }: {
                input: typeof DomainShopOrders.Input.Type
                principal: ShopCatalogPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    yield* Effect.flatMap(ShopOrderRepository, (repository) =>
                        repository.list_orders(principal)
                    )
                    return {
                        edges: [
                            {
                                entity: ShopOrdersEntity.name,
                                id: input.domain_id,
                                key: entityKey(
                                    ShopOrdersEntity.name,
                                    input.domain_id
                                ),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
    mutations: [
        RemoteServer.mutation(
            CreateShopPendingOrder,
            ({
                input,
                principal,
            }: {
                input: typeof CreateShopPendingOrder.Input.Type
                principal: ShopCatalogPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.domain_id !== principal.domain_id ||
                        (input.account_id !== undefined &&
                            input.account_id !== principal.account_id) ||
                        input.checkout.session_id !== shop_admin_cart_session_id
                    )
                        return yield* Effect.fail(failure())
                    const snapshot = yield* Effect.flatMap(
                        ShopOrderRepository,
                        (repository) =>
                            repository.create_pending_order(
                                principal,
                                input.checkout
                            )
                    )
                    return { output: { snapshot }, entities: [] }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(ShopOrdersRemote, ShopOrderServer)

export const shop_order_remote_handlers = (principal: ShopCatalogPrincipal) =>
    RemoteServer.handlers(ShopOrderServer, principal)

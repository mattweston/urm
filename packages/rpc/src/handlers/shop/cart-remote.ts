import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    ChangeShopCart,
    DomainShopCart,
    ShopCartEntity,
    ShopCartRemote,
} from "@urm/contracts/shop"
import { shop_admin_cart_session_id } from "@urm/domain/shop"
import type { ShopCatalogPrincipal } from "./catalog-repository.ts"
import { ShopCartRepository } from "./cart-repository.ts"

const terminal: Boundary = { _tag: "Terminal" }
const failure = () =>
    new RemoteServerError({ message: "Shop cart unavailable or access denied" })

export const ShopCartServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<ShopCatalogPrincipal, ShopCartRepository>(
            ShopCartEntity,
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
                                          snapshot: yield* Effect.flatMap(
                                              ShopCartRepository,
                                              (repository) =>
                                                  repository.load_cart(
                                                      principal,
                                                      shop_admin_cart_session_id
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
            DomainShopCart,
            ({
                input,
                principal,
            }: {
                input: typeof DomainShopCart.Input.Type
                principal: ShopCatalogPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    yield* Effect.flatMap(ShopCartRepository, (repository) =>
                        repository.load_cart(
                            principal,
                            shop_admin_cart_session_id
                        )
                    )
                    return {
                        edges: [
                            {
                                entity: ShopCartEntity.name,
                                id: input.domain_id,
                                key: entityKey(
                                    ShopCartEntity.name,
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
            ChangeShopCart,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeShopCart.Input.Type
                principal: ShopCatalogPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.domain_id !== principal.domain_id ||
                        (input.account_id !== undefined &&
                            input.account_id !== principal.account_id) ||
                        input.action.session_id !== shop_admin_cart_session_id
                    )
                        return yield* Effect.fail(failure())
                    const snapshot = yield* Effect.flatMap(
                        ShopCartRepository,
                        (repository) =>
                            repository.change_cart(principal, input.action)
                    )
                    const state = { id: input.domain_id, snapshot }
                    return {
                        output: { state },
                        entities: [
                            Entity.patch(ShopCartEntity.ref(state.id), state),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(ShopCartRemote, ShopCartServer)

export const shop_cart_remote_handlers = (principal: ShopCatalogPrincipal) =>
    RemoteServer.handlers(ShopCartServer, principal)

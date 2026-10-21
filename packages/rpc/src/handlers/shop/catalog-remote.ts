import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    ChangeShopCatalog,
    DomainShopCatalog,
    ShopCatalogEntity,
    ShopCatalogRemote,
} from "@urm/contracts/shop"
import {
    ShopCatalogRepository,
    type ShopCatalogPrincipal,
} from "./catalog-repository.ts"

const terminal: Boundary = { _tag: "Terminal" }
const failure = () =>
    new RemoteServerError({
        message: "Shop catalog unavailable or access denied",
    })

export const ShopCatalogServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<ShopCatalogPrincipal, ShopCatalogRepository>(
            ShopCatalogEntity,
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
                                      values: yield* Effect.flatMap(
                                          ShopCatalogRepository,
                                          (repository) =>
                                              repository.load_catalog(principal)
                                      ),
                                  },
                              ]
                    }).pipe(Effect.mapError(failure)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            DomainShopCatalog,
            ({
                input,
                principal,
            }: {
                input: typeof DomainShopCatalog.Input.Type
                principal: ShopCatalogPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(failure())
                    yield* Effect.flatMap(ShopCatalogRepository, (repository) =>
                        repository.authorize_shop(principal)
                    )
                    return {
                        edges: [
                            {
                                entity: ShopCatalogEntity.name,
                                id: input.domain_id,
                                key: entityKey(
                                    ShopCatalogEntity.name,
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
            ChangeShopCatalog,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeShopCatalog.Input.Type
                principal: ShopCatalogPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.domain_id !== principal.domain_id ||
                        (input.account_id !== undefined &&
                            input.account_id !== principal.account_id)
                    )
                        return yield* Effect.fail(failure())
                    yield* Effect.flatMap(ShopCatalogRepository, (repository) =>
                        repository.authorize_shop(principal, true)
                    )
                    const catalog = yield* Effect.flatMap(
                        ShopCatalogRepository,
                        (repository) =>
                            repository.change_catalog(principal, input.action)
                    )
                    return {
                        output: { catalog },
                        entities: [
                            Entity.patch(
                                ShopCatalogEntity.ref(catalog.id),
                                catalog
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(ShopCatalogRemote, ShopCatalogServer)

export const shop_catalog_remote_handlers = (principal: ShopCatalogPrincipal) =>
    RemoteServer.handlers(ShopCatalogServer, principal)

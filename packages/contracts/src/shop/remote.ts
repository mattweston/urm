import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"
import {
    ShopCatalog,
    ShopCatalogAction,
    ShopCartAction,
    ShopCartSnapshot,
    ShopCheckoutInput,
    ShopOrderSnapshot,
} from "@urm/domain/shop"

export const ShopCatalogEntity = Entity.make("ShopCatalog", ShopCatalog)
export const ShopCatalogSummary = ShopCatalogEntity.select({
    id: true,
    products: true,
    variants: true,
    collections: true,
    memberships: true,
})
export const DomainShopCatalog = Query.make("DomainShopCatalog", {
    Input: { domain_id: Schema.String },
    Result: ShopCatalogEntity,
})
export const ChangeShopCatalog = Mutation.make("ChangeShopCatalog", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.optional(Schema.String),
        action: ShopCatalogAction,
    },
    Output: { catalog: ShopCatalog },
})
export const ShopCartState = Schema.Struct({
    id: Schema.String,
    snapshot: Schema.NullOr(ShopCartSnapshot),
})
export const ShopCartEntity = Entity.make("ShopCartState", ShopCartState)
export const ShopCartSummary = ShopCartEntity.select({
    id: true,
    snapshot: true,
})
export const DomainShopCart = Query.make("DomainShopCart", {
    Input: { domain_id: Schema.String },
    Result: ShopCartEntity,
})
export const ChangeShopCart = Mutation.make("ChangeShopCart", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.optional(Schema.String),
        action: ShopCartAction,
    },
    Output: { state: ShopCartState },
})
export const ShopOrdersState = Schema.Struct({
    id: Schema.String,
    orders: Schema.Array(ShopOrderSnapshot),
})
export const ShopOrdersEntity = Entity.make("ShopOrdersState", ShopOrdersState)
export const ShopOrdersSummary = ShopOrdersEntity.select({
    id: true,
    orders: true,
})
export const DomainShopOrders = Query.make("DomainShopOrders", {
    Input: { domain_id: Schema.String },
    Result: ShopOrdersEntity,
})
export const CreateShopPendingOrder = Mutation.make("CreateShopPendingOrder", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.optional(Schema.String),
        checkout: ShopCheckoutInput,
    },
    Output: { snapshot: ShopOrderSnapshot },
})
export const ShopCatalogRemote = Remote.define({
    entities: [ShopCatalogEntity],
    queries: [DomainShopCatalog],
    mutations: [ChangeShopCatalog],
})
export const ShopCartRemote = Remote.define({
    entities: [ShopCartEntity],
    queries: [DomainShopCart],
    mutations: [ChangeShopCart],
})
export const ShopOrdersRemote = Remote.define({
    entities: [ShopOrdersEntity],
    queries: [DomainShopOrders],
    mutations: [CreateShopPendingOrder],
})

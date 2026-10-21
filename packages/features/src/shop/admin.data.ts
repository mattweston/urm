import { Schema as S } from "effect"
import type { Product as RemoteProduct } from "@urm/domain/schemas/shop"
import { shop_admin_cart_session_id } from "@urm/domain/shop"
import {
    Cart,
    CartItem,
    CheckoutAddress,
    Order,
    OrderItem,
    Product as ProductSchema,
    ProductCollection,
} from "@urm/domain/schemas/shop"

export const shopAdminCartSessionId = shop_admin_cart_session_id

export const CartSnapshot = S.Struct({
    cart: S.NullOr(Cart),
    items: S.Array(CartItem),
})
export type CartSnapshot = typeof CartSnapshot.Type

export const OrderSnapshot = S.Struct({
    order: Order,
    items: S.Array(OrderItem),
})
export type OrderSnapshot = typeof OrderSnapshot.Type

export const CheckoutDraft = S.Struct({
    email: S.String,
    firstName: S.String,
    lastName: S.String,
    line1: S.String,
    city: S.String,
    province: S.String,
    country: S.String,
    postal: S.String,
})
export type CheckoutDraft = typeof CheckoutDraft.Type

export const Product = ProductSchema
export type Product = RemoteProduct

export const ProductDraft = S.Struct({
    name: S.String,
    slug: S.String,
    description: S.String,
    price: S.String,
    inventory: S.String,
    imageUrl: S.String,
    imageId: S.NullOr(S.String),
    collectionIds: S.Array(S.String),
    isActive: S.Boolean,
    isFeatured: S.Boolean,
})
export type ProductDraft = typeof ProductDraft.Type

export const CollectionDraft = S.Struct({
    name: S.String,
    slug: S.String,
    description: S.String,
    imageUrl: S.String,
    isActive: S.Boolean,
})
export type CollectionDraft = typeof CollectionDraft.Type

export const blankProductDraft = (): ProductDraft => ({
    name: "",
    slug: "",
    description: "",
    price: "",
    inventory: "0",
    imageUrl: "",
    imageId: null,
    collectionIds: [],
    isActive: true,
    isFeatured: false,
})

export const blankCollectionDraft = (): CollectionDraft => ({
    name: "",
    slug: "",
    description: "",
    imageUrl: "",
    isActive: true,
})

export const blankCheckoutDraft = (): CheckoutDraft => ({
    email: "",
    firstName: "",
    lastName: "",
    line1: "",
    city: "",
    province: "",
    country: "",
    postal: "",
})

export const checkoutAddressFromDraft = (
    draft: CheckoutDraft
): CheckoutAddress => ({
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    line1: draft.line1.trim(),
    city: draft.city.trim(),
    province: draft.province.trim(),
    country: draft.country.trim(),
    postal: draft.postal.trim(),
})

export const collectionDraftFromCollection = (
    collection: ProductCollection
): CollectionDraft => ({
    name: collection.name,
    slug: collection.slug,
    description: collection.description ?? "",
    imageUrl: collection.imageUrl ?? "",
    isActive: collection.isActive ?? true,
})

export const productDraftFromProduct = (
    product: RemoteProduct
): ProductDraft => ({
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    price: (product.price / 100).toFixed(2),
    inventory: String(
        product.variants?.find((variant) => variant.name === "Default")
            ?.stock ?? 0
    ),
    imageUrl: product.imageUrl,
    imageId: product.imageId ?? null,
    collectionIds: product.collectionIds ?? [],
    isActive: product.isActive,
    isFeatured: product.isFeatured,
})

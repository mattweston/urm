import { Schema } from "effect"
import { Email } from "./schemas/contacts.ts"

export const shop_admin_cart_session_id = "shop-admin-preview"

const shop_name = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(500)
)
const shop_slug = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(500),
    Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
)
const shop_description = Schema.String.check(Schema.isMaxLength(20_000))
const shop_price = Schema.Int.check(
    Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(2147483647)
)
const shop_image_url = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(2048)
)

export const ShopProduct = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    name: Schema.String,
    slug: Schema.String,
    description: Schema.NullOr(Schema.String),
    price: Schema.Number,
    image_url: Schema.String,
    image_id: Schema.NullOr(Schema.String),
    is_active: Schema.Boolean,
    is_featured: Schema.Boolean,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const ShopVariant = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    product_id: Schema.String,
    name: Schema.String,
    description: Schema.NullOr(Schema.String),
    sku: Schema.NullOr(Schema.String),
    price: Schema.Number,
    currency: Schema.String,
    stock: Schema.Number,
    is_active: Schema.Boolean,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const ShopCollection = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    name: Schema.String,
    slug: Schema.String,
    description: Schema.NullOr(Schema.String),
    image_url: Schema.NullOr(Schema.String),
    is_active: Schema.Boolean,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const ShopMembership = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    product_id: Schema.String,
    collection_id: Schema.String,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const ShopCatalog = Schema.Struct({
    id: Schema.String,
    products: Schema.Array(ShopProduct),
    variants: Schema.Array(ShopVariant),
    collections: Schema.Array(ShopCollection),
    memberships: Schema.Array(ShopMembership),
})
export const ShopCart = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    session_id: Schema.String,
    contact_id: Schema.NullOr(Schema.String),
    currency: Schema.String,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const ShopCartItem = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    cart_id: Schema.String,
    product_id: Schema.String,
    variant_id: Schema.String,
    quantity: Schema.Number,
    product_name: Schema.String,
    product_slug: Schema.String,
    product_image_url: Schema.String,
    product_price: Schema.Number,
    variant_name: Schema.String,
    variant_options: Schema.Record(Schema.String, Schema.String),
    is_selected: Schema.Boolean,
    note: Schema.NullOr(Schema.String),
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const ShopCartSnapshot = Schema.Struct({
    cart: ShopCart,
    items: Schema.Array(ShopCartItem),
    item_count: Schema.Number,
    total_price: Schema.Number,
})
const shop_session_id = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(255)
)
const shop_quantity = Schema.Int.check(
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(20)
)
export const ShopCartAction = Schema.Union([
    Schema.TaggedStruct("add_item", {
        session_id: shop_session_id,
        variant_id: Schema.String,
        quantity: shop_quantity,
    }),
    Schema.TaggedStruct("update_item", {
        session_id: shop_session_id,
        item_id: Schema.String,
        quantity: shop_quantity,
    }),
    Schema.TaggedStruct("remove_item", {
        session_id: shop_session_id,
        item_id: Schema.String,
    }),
    Schema.TaggedStruct("clear", { session_id: shop_session_id }),
    Schema.TaggedStruct("set_item_selected", {
        session_id: shop_session_id,
        item_id: Schema.String,
        is_selected: Schema.Boolean,
    }),
    Schema.TaggedStruct("set_item_note", {
        session_id: shop_session_id,
        item_id: Schema.String,
        note: Schema.NullOr(Schema.Trimmed.check(Schema.isMaxLength(500))),
    }),
])
export type ShopCartAction = typeof ShopCartAction.Type
const checkout_text = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(255)
)
export const ShopCheckoutAddress = Schema.Struct({
    firstName: checkout_text,
    lastName: checkout_text,
    line1: checkout_text,
    city: checkout_text,
    province: checkout_text,
    country: checkout_text,
    postal: checkout_text,
})
export const ShopOrder = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    cart_id: Schema.String,
    session_id: Schema.String,
    checkout_key: Schema.String,
    email: Schema.String,
    status: Schema.Literals([
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
    ]),
    total_price: Schema.Number,
    currency: Schema.String,
    shipping_address: ShopCheckoutAddress,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const ShopOrderItem = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    order_id: Schema.String,
    product_id: Schema.String,
    variant_id: Schema.String,
    quantity: Schema.Number,
    product_name: Schema.String,
    product_slug: Schema.String,
    product_image_url: Schema.String,
    product_price: Schema.Number,
    variant_name: Schema.String,
    variant_options: Schema.Record(Schema.String, Schema.String),
    created_at: Schema.Number,
})
export const ShopOrderSnapshot = Schema.Struct({
    order: ShopOrder,
    items: Schema.Array(ShopOrderItem),
})
export const ShopPayment = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    order_id: Schema.String,
    provider: Schema.Literal("stripe"),
    request_key: Schema.String,
    provider_idempotency_key: Schema.String,
    stripe_checkout_session_id: Schema.NullOr(Schema.String),
    stripe_payment_intent_id: Schema.NullOr(Schema.String),
    status: Schema.Literals([
        "reserved",
        "checkout_open",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
        "refunded",
    ]),
    amount: Schema.Number,
    currency: Schema.String,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const ShopStripeEventReceipt = Schema.Struct({
    id: Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
    event_type: Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(255)
    ),
    provider_object_id: Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(255)
    ),
    payload_sha256: Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)),
    occurred_at: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
})
export type ShopStripeEventReceipt = typeof ShopStripeEventReceipt.Type
export const ShopCheckoutInput = Schema.Struct({
    session_id: shop_session_id,
    checkout_key: Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(511)
    ),
    email: Email,
    shipping_address: ShopCheckoutAddress,
})
export type ShopCheckoutInput = typeof ShopCheckoutInput.Type
export const ShopProductFields = Schema.Struct({
    name: shop_name,
    slug: shop_slug,
    description: Schema.NullOr(shop_description),
    price: shop_price,
    inventory: shop_price,
    image_url: shop_image_url,
    image_id: Schema.NullOr(Schema.String),
    collection_ids: Schema.Array(Schema.String).check(Schema.isMaxLength(100)),
    is_active: Schema.Boolean,
    is_featured: Schema.Boolean,
})
export const ShopCollectionFields = Schema.Struct({
    name: shop_name,
    slug: shop_slug,
    description: Schema.NullOr(shop_description),
    image_url: Schema.NullOr(Schema.String.check(Schema.isMaxLength(2048))),
    is_active: Schema.Boolean,
})
export const ShopCatalogAction = Schema.Union([
    Schema.TaggedStruct("create_product", {
        id: Schema.String,
        variant_id: Schema.String,
        ...ShopProductFields.fields,
    }),
    Schema.TaggedStruct("update_product", {
        id: Schema.String,
        variant_id: Schema.String,
        ...ShopProductFields.fields,
    }),
    Schema.TaggedStruct("create_collection", {
        id: Schema.String,
        ...ShopCollectionFields.fields,
    }),
    Schema.TaggedStruct("update_collection", {
        id: Schema.String,
        ...ShopCollectionFields.fields,
    }),
    Schema.TaggedStruct("set_product_collections", {
        product_id: Schema.String,
        collection_ids: Schema.Array(Schema.String).check(
            Schema.isMaxLength(100)
        ),
    }),
])
export type ShopCatalogAction = typeof ShopCatalogAction.Type
export class ShopCatalogError extends Schema.TaggedErrorClass<ShopCatalogError>()(
    "ShopCatalogError",
    { message: Schema.String }
) {}
export class ShopCartError extends Schema.TaggedErrorClass<ShopCartError>()(
    "ShopCartError",
    { message: Schema.String }
) {}
export class ShopOrderError extends Schema.TaggedErrorClass<ShopOrderError>()(
    "ShopOrderError",
    { message: Schema.String }
) {}
export class ShopPaymentError extends Schema.TaggedErrorClass<ShopPaymentError>()(
    "ShopPaymentError",
    { message: Schema.String }
) {}

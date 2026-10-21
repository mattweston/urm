import { Schema } from "effect"

import { Email } from "./contacts.ts"

export const ProductVariant = Schema.Struct({
    id: Schema.String,
    productId: Schema.String,
    name: Schema.String,
    description: Schema.optional(Schema.NullOr(Schema.String)),
    sku: Schema.optional(Schema.NullOr(Schema.String)),
    price: Schema.Number,
    currency: Schema.optional(Schema.NullOr(Schema.String)),
    stock: Schema.Number,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
})
export type ProductVariant = typeof ProductVariant.Type

export const Product = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    slug: Schema.String,
    tagline: Schema.optional(Schema.NullOr(Schema.String)),
    description: Schema.optional(Schema.NullOr(Schema.String)),
    price: Schema.Number,
    discount: Schema.optional(Schema.NullOr(Schema.Number)),
    imageUrl: Schema.String,
    imageId: Schema.optionalKey(Schema.String),
    images: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
    isActive: Schema.Boolean,
    isFeatured: Schema.Boolean,
    collectionIds: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
    variants: Schema.optional(Schema.Array(ProductVariant)),
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
})
export type Product = typeof Product.Type

export const ProductCollection = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    slug: Schema.String,
    description: Schema.optional(Schema.NullOr(Schema.String)),
    imageUrl: Schema.optional(Schema.NullOr(Schema.String)),
    isActive: Schema.optional(Schema.Boolean),
    productCount: Schema.optional(Schema.NullOr(Schema.Number)),
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
})
export type ProductCollection = typeof ProductCollection.Type

export const CartItem = Schema.Struct({
    id: Schema.String,
    cartId: Schema.String,
    variantId: Schema.String,
    productId: Schema.String,
    quantity: Schema.Number,
    productName: Schema.String,
    variantName: Schema.String,
    productPrice: Schema.Number,
    productImageUrl: Schema.optional(Schema.NullOr(Schema.String)),
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
})
export type CartItem = typeof CartItem.Type

export const Cart = Schema.Struct({
    id: Schema.String,
    sessionId: Schema.String,
    contactId: Schema.optional(Schema.NullOr(Schema.String)),
    customerId: Schema.optional(Schema.NullOr(Schema.String)),
    itemCount: Schema.Number,
    totalPrice: Schema.Number,
    currency: Schema.optional(Schema.NullOr(Schema.String)),
    items: Schema.optional(Schema.Array(CartItem)),
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
})
export type Cart = typeof Cart.Type

const CheckoutText = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(255)
)

export const CheckoutAddress = Schema.Struct({
    firstName: CheckoutText,
    lastName: CheckoutText,
    line1: CheckoutText,
    city: CheckoutText,
    province: CheckoutText,
    country: CheckoutText,
    postal: CheckoutText,
})
export type CheckoutAddress = typeof CheckoutAddress.Type

export const OrderItem = Schema.Struct({
    id: Schema.String,
    orderId: Schema.String,
    variantId: Schema.String,
    productId: Schema.String,
    quantity: Schema.Number,
    productName: Schema.String,
    variantName: Schema.String,
    productPrice: Schema.Number,
    productImageUrl: Schema.optional(Schema.NullOr(Schema.String)),
    createdAt: Schema.Number,
})
export type OrderItem = typeof OrderItem.Type

export const Order = Schema.Struct({
    id: Schema.String,
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
    totalPrice: Schema.Number,
    currency: Schema.optional(Schema.NullOr(Schema.String)),
    stripeCheckoutSessionId: Schema.optional(Schema.NullOr(Schema.String)),
    stripePaymentIntentId: Schema.optional(Schema.NullOr(Schema.String)),
    stripeChargeId: Schema.optional(Schema.NullOr(Schema.String)),
    shippingAddress: Schema.optional(CheckoutAddress),
    items: Schema.optional(Schema.Array(OrderItem)),
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
})
export type Order = typeof Order.Type

export const CheckoutCreateInput = Schema.Struct({
    sessionId: Schema.String,
    email: Email,
    shippingAddress: CheckoutAddress,
})
export type CheckoutCreateInput = typeof CheckoutCreateInput.Type

export const CreateCollectionInput = Schema.Struct({
    name: Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
    slug: Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(500),
        Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    ),
    description: Schema.optional(
        Schema.Trimmed.check(Schema.isMaxLength(10_000))
    ),
    imageUrl: Schema.optional(Schema.Trimmed.check(Schema.isMaxLength(2_048))),
    isActive: Schema.Boolean,
})
export type CreateCollectionInput = typeof CreateCollectionInput.Type

export const UpdateCollectionInput = CreateCollectionInput
export type UpdateCollectionInput = typeof UpdateCollectionInput.Type

export const ProductInput = Schema.Struct({
    name: Schema.String,
    slug: Schema.String,
    description: Schema.String,
    price: Schema.Number,
    inventory: Schema.Number,
    imageUrl: Schema.String,
    imageId: Schema.optionalKey(Schema.String),
    collectionIds: Schema.optional(Schema.Array(Schema.String)),
    isActive: Schema.Boolean,
    isFeatured: Schema.Boolean,
})
export type ProductInput = typeof ProductInput.Type

export const AddToCartInput = Schema.Struct({
    sessionId: Schema.String,
    variantId: Schema.String,
    quantity: Schema.Number,
})

export type AddToCartInput = Schema.Schema.Type<typeof AddToCartInput>

export const RemoveFromCartInput = Schema.Struct({
    sessionId: Schema.String,
    itemId: Schema.String,
})

export type RemoveFromCartInput = Schema.Schema.Type<typeof RemoveFromCartInput>

export const UpdateCartItemInput = Schema.Struct({
    sessionId: Schema.String,
    itemId: Schema.String,
    quantity: Schema.Number,
})

export type UpdateCartItemInput = Schema.Schema.Type<typeof UpdateCartItemInput>

export const MergeCartsInput = Schema.Struct({
    sourceSessionId: Schema.String,
    targetSessionId: Schema.String,
})

export type MergeCartsInput = Schema.Schema.Type<typeof MergeCartsInput>

export const MigrateCartToContactInput = Schema.Struct({
    sessionId: Schema.String,
    contactId: Schema.String,
})

export type MigrateCartToContactInput = Schema.Schema.Type<
    typeof MigrateCartToContactInput
>

export const CreateCheckoutSessionInput = Schema.Struct({
    sessionId: Schema.String,
    successUrl: Schema.String,
    cancelUrl: Schema.String,
})

export type CreateCheckoutSessionInput = Schema.Schema.Type<
    typeof CreateCheckoutSessionInput
>

export const ConfirmCheckoutInput = Schema.Struct({
    checkoutSessionId: Schema.String,
})

export type ConfirmCheckoutInput = Schema.Schema.Type<
    typeof ConfirmCheckoutInput
>

export { DatabaseError, NotFoundError, ValidationError } from "../errors.ts"

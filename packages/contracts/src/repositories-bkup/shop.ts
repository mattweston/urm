/**
 * # Shop Repository
 *
 * Unlike every sibling: Promise-returning, scoped on sessionId rather than
 * domain_id, and with no Context.Service tag — so nothing can inject it.
 * Structurally a service interface sitting in the repositories directory.
 *
 * Several methods (markAbandoned, confirmCheckout, getAbandonedCarts) belong to
 * the unbuilt cart and checkout flows, alongside the five reserved shop errors.
 */

import {
    AddToCartInput,
    Cart,
    CartItem,
    ConfirmCheckoutInput,
    CreateCollectionInput,
    CreateCheckoutSessionInput,
    MergeCartsInput,
    MigrateCartToContactInput,
    Order,
    Product,
    ProductCollection,
    RemoveFromCartInput,
    UpdateCartItemInput,
} from "@urm/domain/schemas/shop"

export interface ProductsRepository {
    // Products
    listProducts(): Promise<Product[]>
    getProduct(id: string): Promise<Product | null>
    getProductBySlug(slug: string): Promise<Product | null>

    // Collections
    listCollections(): Promise<ProductCollection[]>
    getCollection(id: string): Promise<ProductCollection | null>
    getCollectionBySlug(slug: string): Promise<ProductCollection | null>
    createCollection(input: CreateCollectionInput): Promise<ProductCollection>
}

export interface CartsRepository {
    // Cart queries
    getCart(sessionId: string): Promise<Cart | null>
    getCartWithItems(
        sessionId: string
    ): Promise<(Cart & { items: CartItem[] }) | null>

    // Cart mutations
    addToCart(input: AddToCartInput): Promise<Cart>
    removeFromCart(input: RemoveFromCartInput): Promise<Cart>
    updateCartItem(input: UpdateCartItemInput): Promise<Cart>
    mergeCarts(input: MergeCartsInput): Promise<Cart>
    migrateCartToContact(input: MigrateCartToContactInput): Promise<Cart>
    markAbandoned(sessionId: string): Promise<Cart>
    clearCart(sessionId: string): Promise<Cart>
    setItemNote(itemId: string): Promise<CartItem>
    setItemSelected(itemId: string): Promise<CartItem>
}

export interface OrdersRepository {
    // Order queries
    getOrder(orderId: string): Promise<Order | null>
    getOrderByStripeSessionId(sessionId: string): Promise<Order | null>
    getAbandonedCarts(): Promise<Cart[]>

    // Checkout mutations
    createCheckoutSession(
        input: CreateCheckoutSessionInput
    ): Promise<{ url: string | null }>
    confirmCheckout(input: ConfirmCheckoutInput): Promise<Order>
}

// --------- Re-export error types for convenience ---------

// export {
//     NotFoundError,
//     DatabaseError,
//     ValidationError,
//     InvalidCartSessionError,
//     CartError,
//     CheckoutError,
//     OrderError,
//     WebhookError,
// };

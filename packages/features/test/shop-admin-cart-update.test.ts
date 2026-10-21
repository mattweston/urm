import { describe, expect, it } from "vitest"
import { Cart, CartItem, Order, OrderItem } from "@urm/domain/schemas/shop"

import {
    CartLoaded,
    ChangedCartItemQuantity,
    ClickedAddCartItem,
    ClickedClearCart,
    ClickedRemoveCartItem,
    PendingOrderCreated,
    SubmittedPendingOrder,
} from "../src/shop/admin.message.ts"
import { ShopCartRoute, ShopCheckoutRoute } from "../src/shop/admin.route.ts"
import { init, update } from "../src/shop/admin.update.ts"

const item = CartItem.make({
    id: "item-1",
    cartId: "cart-1",
    variantId: "variant-1",
    productId: "product-1",
    quantity: 2,
    productName: "Canvas bag",
    variantName: "Default",
    productPrice: 2400,
    productImageUrl: "https://example.com/bag.jpg",
    createdAt: 1,
    updatedAt: 1,
})

const cart = Cart.make({
    id: "cart-1",
    sessionId: "shop-admin-preview",
    itemCount: 2,
    totalPrice: 4800,
    currency: "USD",
    items: [item],
    createdAt: 1,
    updatedAt: 1,
})

describe("shop persistent cart update", () => {
    it("loads a persisted snapshot", () => {
        const [initial_model] = init(ShopCartRoute())
        const [model] = update(
            initial_model,
            CartLoaded({ snapshot: { cart, items: [item] } })
        )

        expect(model.cartSnapshot.cart?.totalPrice).toBe(4800)
        expect(model.cartSnapshot.items).toEqual([item])
        expect(model.isCartLoading).toBe(false)
    })

    it("emits bounded add and quantity commands", () => {
        const [initial_model] = init(ShopCartRoute())
        const [adding_model, add_commands] = update(
            initial_model,
            ClickedAddCartItem({ variantId: "variant-1", quantity: 2 })
        )
        const [loaded_model] = update(
            initial_model,
            CartLoaded({ snapshot: { cart, items: [item] } })
        )
        const [quantity_model, quantity_commands] = update(
            loaded_model,
            ChangedCartItemQuantity({ itemId: item.id, quantity: 3 })
        )

        expect(adding_model.isCartSubmitting).toBe(true)
        expect(add_commands[0]?.name).toBe("AddCartItem")
        expect(add_commands[0]?.args).toEqual({
            variantId: "variant-1",
            quantity: 2,
        })
        expect(quantity_model.isCartSubmitting).toBe(true)
        expect(quantity_commands[0]?.name).toBe("UpdateCartItem")
        expect(quantity_commands[0]?.args).toEqual({
            itemId: item.id,
            quantity: 3,
        })
    })

    it("removes one line or clears every persisted line", () => {
        const [initial_model] = init(ShopCartRoute())
        const [loaded_model] = update(
            initial_model,
            CartLoaded({ snapshot: { cart, items: [item] } })
        )
        const [, remove_commands] = update(
            loaded_model,
            ClickedRemoveCartItem({ itemId: item.id })
        )
        const [, clear_commands] = update(loaded_model, ClickedClearCart())

        expect(remove_commands[0]?.name).toBe("RemoveCartItem")
        expect(remove_commands[0]?.args).toEqual({ itemId: item.id })
        expect(clear_commands[0]?.name).toBe("ClearCart")
        expect(clear_commands[0]?.args).toEqual({ itemIds: [item.id] })
    })

    it("records and routes to an explicitly pending unpaid order", () => {
        const [initial_model] = init(ShopCheckoutRoute())
        const checkout_model = {
            ...initial_model,
            cartSnapshot: { cart, items: [item] },
            checkoutDraft: {
                email: "buyer@example.com",
                firstName: "Ada",
                lastName: "Lovelace",
                line1: "1 Analytical Engine Way",
                city: "London",
                province: "London",
                country: "GB",
                postal: "SW1A 1AA",
            },
        }
        const [submitting_model, commands] = update(
            checkout_model,
            SubmittedPendingOrder()
        )
        const order_item = OrderItem.make({
            id: "order-item-1",
            orderId: "order-1",
            variantId: item.variantId,
            productId: item.productId,
            quantity: item.quantity,
            productName: item.productName,
            variantName: item.variantName,
            productPrice: item.productPrice,
            productImageUrl: item.productImageUrl,
            createdAt: 2,
        })
        const order = Order.make({
            id: "order-1",
            email: "buyer@example.com",
            status: "pending",
            totalPrice: 4800,
            currency: "USD",
            shippingAddress: {
                firstName: "Ada",
                lastName: "Lovelace",
                line1: "1 Analytical Engine Way",
                city: "London",
                province: "London",
                country: "GB",
                postal: "SW1A 1AA",
            },
            items: [order_item],
            createdAt: 2,
            updatedAt: 2,
        })
        const [created_model, navigation_commands] = update(
            submitting_model,
            PendingOrderCreated({
                snapshot: { order, items: [order_item] },
            })
        )

        expect(commands[0]?.name).toBe("CreatePendingOrder")
        expect(commands[0]?.args).toMatchObject({
            sessionId: "shop-admin-preview",
            checkoutKey: "cart-1:1",
            email: "buyer@example.com",
        })
        expect(created_model.orders[0]?.order.status).toBe("pending")
        expect(created_model.cartSnapshot.items).toEqual([])
        expect(navigation_commands[0]?.name).toBe("ReplaceOrderUrl")
    })
})

import { describe, expect, it } from "vitest"

import {
    ChangedCheckoutAddress,
    ChangedCheckoutCardNumber,
    ChangedCheckoutCity,
    ChangedCheckoutEmail,
    ChangedCheckoutName,
    ChangedCheckoutPostalCode,
    ClickedAddProduct,
    SubmittedCheckout,
    ToggledCheckoutTerms,
    CompletedCheckout,
} from "./cartlane.message.ts"
import { commitOrder } from "./cartlane.domain.ts"
import { cartHref, productHref, routeForPath } from "./cartlane.route.ts"
import { init, update } from "./cartlane.update.ts"

describe("Cartlane update", () => {
    it("parses catalog, product, cart, checkout, and order routes", () => {
        expect(routeForPath("/cartlane/")._tag).toBe("Catalog")
        expect(routeForPath(productHref("arc-lamp"))).toEqual({
            _tag: "Product",
            product_id: "arc-lamp",
        })
        expect(routeForPath(cartHref())._tag).toBe("Cart")
        expect(routeForPath("/cartlane/checkout/")._tag).toBe("Checkout")
        expect(routeForPath("/cartlane/orders/CL-1234567/")).toEqual({
            _tag: "Order",
            order_id: "CL-1234567",
        })
    })

    it("places a valid order and clears the basket", () => {
        const [initial] = init()
        const [withProduct] = update(
            initial,
            ClickedAddProduct({ product_id: "arc-lamp" })
        )
        const [withName] = update(
            withProduct,
            ChangedCheckoutName({ value: "Ada Lovelace" })
        )
        const [withEmail] = update(
            withName,
            ChangedCheckoutEmail({ value: "ada@example.com" })
        )
        const [withAddress] = update(
            withEmail,
            ChangedCheckoutAddress({ value: "12 Analytical Engine Road" })
        )
        const [withCity] = update(
            withAddress,
            ChangedCheckoutCity({ value: "London" })
        )
        const [withPostalCode] = update(
            withCity,
            ChangedCheckoutPostalCode({ value: "SW1A 1AA" })
        )
        const [withCard] = update(
            withPostalCode,
            ChangedCheckoutCardNumber({ value: "4242 4242 4242 4242" })
        )
        const [withTerms] = update(withCard, ToggledCheckoutTerms())
        const [submitting, commands] = update(withTerms, SubmittedCheckout())
        const [ledger, result] = commitOrder(submitting.ledger, {
            idempotency_key: submitting.idempotency_key,
            lines: submitting.last_submitted_cart,
            name: submitting.checkout_form.name,
            email: submitting.checkout_form.email,
            address: submitting.checkout_form.address,
            city: submitting.checkout_form.city,
            postal_code: submitting.checkout_form.postal_code,
            card_number: submitting.checkout_form.card_number,
            agree_to_terms: submitting.checkout_form.agree_to_terms,
        })
        const [ordered] = update(
            submitting,
            CompletedCheckout({ ledger, result })
        )

        expect(submitting.submission_state).toBe("Submitting")
        expect(commands).toHaveLength(1)
        expect(ordered.route._tag).toBe("Order")
        expect(ordered.cart).toEqual([])
        expect(ordered.ledger).toHaveLength(1)
    })
})

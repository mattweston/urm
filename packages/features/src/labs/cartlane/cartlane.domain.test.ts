import { describe, expect, it } from "vitest"

import {
    addCartLine,
    cartCount,
    commitOrder,
    deliveryCost,
    orderTotal,
    type CheckoutRequest,
} from "./cartlane.domain.ts"

const validRequest = (
    overrides: Partial<CheckoutRequest> = {}
): CheckoutRequest => ({
    idempotency_key: "checkout-key-1",
    lines: [{ product_id: "arc-lamp", quantity: 1 }],
    name: "Ada Lovelace",
    email: "ada@example.com",
    address: "12 Analytical Engine Road",
    city: "London",
    postal_code: "SW1A 1AA",
    card_number: "4242 4242 4242 4242",
    agree_to_terms: true,
    ...overrides,
})

describe("Cartlane domain", () => {
    it("clamps and combines cart lines", () => {
        const once = addCartLine([], "arc-lamp", 7)
        const combined = addCartLine(once, "arc-lamp", 4)

        expect(combined).toEqual([{ product_id: "arc-lamp", quantity: 8 }])
        expect(cartCount(combined)).toBe(8)
    })

    it("applies delivery below the free-delivery threshold", () => {
        expect(deliveryCost(0)).toBe(0)
        expect(deliveryCost(11_999)).toBe(600)
        expect(deliveryCost(12_000)).toBe(0)
        expect(orderTotal([{ product_id: "drift-mug", quantity: 1 }])).toBe(
            3_400
        )
    })

    it("returns field-specific validation failures", () => {
        const [, result] = commitOrder(
            [],
            validRequest({ email: "invalid", agree_to_terms: false })
        )

        expect(result).toMatchObject({
            _tag: "Invalid",
            errors: {
                email: { _tag: "Some" },
                agree_to_terms: { _tag: "Some" },
            },
        })
    })

    it("rejects a tampered basket", () => {
        const [, result] = commitOrder(
            [],
            validRequest({ lines: [{ product_id: "arc-lamp", quantity: 99 }] })
        )

        expect(result._tag).toBe("Failed")
    })

    it("returns the recoverable fixture-card decline", () => {
        const [, result] = commitOrder(
            [],
            validRequest({ card_number: "4000 0000 0000 0000" })
        )

        expect(result).toMatchObject({
            _tag: "Failed",
            is_recoverable: true,
        })
        expect(result.message).toContain("declined")
    })

    it("folds duplicate submissions into one stable order", () => {
        const [ledger, first] = commitOrder([], validRequest())
        const [nextLedger, duplicate] = commitOrder(ledger, validRequest())

        expect(nextLedger).toHaveLength(1)
        expect(first).toMatchObject({ _tag: "Succeeded", is_duplicate: false })
        expect(duplicate).toMatchObject({
            _tag: "Succeeded",
            is_duplicate: true,
            submission_count: 2,
        })
        expect(nextLedger[0]?.submission_count).toBe(2)
    })
})

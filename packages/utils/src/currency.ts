/**
 * # Currency Utils
 *
 * Currency formatting utilities for URM.
 */

const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
})

// Input is cents, not dollars. Prices are stored in the smallest unit so
// arithmetic never touches a float; this divides only at the display edge.
export function formatProductPrice(value: number) {
    return formatter.format(value / 100)
}

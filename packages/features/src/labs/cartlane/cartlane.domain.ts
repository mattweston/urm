import { Array, Option, Schema as S } from "effect"

export const ProductId = S.Literals([
    "arc-lamp",
    "field-notes",
    "drift-mug",
    "orbit-tray",
    "weekender",
    "linen-throw",
])
export type ProductId = typeof ProductId.Type

export const Category = S.Literals(["Desk", "Travel", "Home"])
export const Product = S.Struct({
    id: ProductId,
    name: S.String,
    category: Category,
    price_cents: S.Number,
    tagline: S.String,
    description: S.String,
    glyph: S.String,
    badge: S.Option(S.String),
})
export type Product = typeof Product.Type

export const CartLine = S.Struct({
    product_id: ProductId,
    quantity: S.Number,
})
export type CartLine = typeof CartLine.Type

export const FieldErrors = S.Struct({
    name: S.Option(S.String),
    email: S.Option(S.String),
    address: S.Option(S.String),
    city: S.Option(S.String),
    postal_code: S.Option(S.String),
    card_number: S.Option(S.String),
    agree_to_terms: S.Option(S.String),
})
export type FieldErrors = typeof FieldErrors.Type

export const OrderReceipt = S.Struct({
    id: S.String,
    placed_at: S.String,
    line_count: S.Number,
    total_cents: S.Number,
    email: S.String,
    delivery_label: S.String,
})
export type OrderReceipt = typeof OrderReceipt.Type

export const SavedOrder = S.Struct({
    key: S.String,
    receipt: OrderReceipt,
    submission_count: S.Number,
})
export type SavedOrder = typeof SavedOrder.Type

export const CheckoutRequest = S.Struct({
    idempotency_key: S.String,
    lines: S.Unknown,
    name: S.String,
    email: S.String,
    address: S.String,
    city: S.String,
    postal_code: S.String,
    card_number: S.String,
    agree_to_terms: S.Boolean,
})
export type CheckoutRequest = typeof CheckoutRequest.Type

export const CheckoutResult = S.TaggedUnion({
    Invalid: { message: S.String, errors: FieldErrors },
    Failed: { message: S.String, is_recoverable: S.Boolean },
    Succeeded: {
        message: S.String,
        order: OrderReceipt,
        is_duplicate: S.Boolean,
        submission_count: S.Number,
    },
})
export type CheckoutResult = typeof CheckoutResult.Type

export const products: ReadonlyArray<Product> = [
    {
        id: "arc-lamp",
        name: "Arc task lamp",
        category: "Desk",
        price_cents: 8_900,
        tagline: "Warm light, exactly where the work is.",
        description:
            "A dimmable, counterbalanced desk light with a weighted mineral base and a soft-touch brass switch.",
        glyph: "◒",
        badge: Option.some("Bestseller"),
    },
    {
        id: "field-notes",
        name: "Field notes folio",
        category: "Travel",
        price_cents: 3_600,
        tagline: "Ideas travel better on paper.",
        description:
            "Vegetable-tanned folio, two replaceable notebooks, and a slim brass pencil for plans made away from a screen.",
        glyph: "▤",
        badge: Option.none(),
    },
    {
        id: "drift-mug",
        name: "Drift stoneware mug",
        category: "Home",
        price_cents: 2_800,
        tagline: "A quiet start, held comfortably.",
        description:
            "Hand-finished speckled stoneware with a thumb-rest handle and a satin sea-glass glaze.",
        glyph: "◓",
        badge: Option.none(),
    },
    {
        id: "orbit-tray",
        name: "Orbit catchall tray",
        category: "Desk",
        price_cents: 4_400,
        tagline: "A landing place for daily essentials.",
        description:
            "Spun aluminium and cork create a low-profile home for keys, earbuds, watches, and the things pockets collect.",
        glyph: "◎",
        badge: Option.none(),
    },
    {
        id: "weekender",
        name: "Canvas weekender",
        category: "Travel",
        price_cents: 14_800,
        tagline: "Two nights, one beautifully simple bag.",
        description:
            "Waxed organic canvas, an easy-access shoe compartment, and repairable solid-brass hardware.",
        glyph: "▰",
        badge: Option.some("Small batch"),
    },
    {
        id: "linen-throw",
        name: "Washed linen throw",
        category: "Home",
        price_cents: 9_600,
        tagline: "Soft structure for slow afternoons.",
        description:
            "Heavy European linen, garment washed for softness and finished with a hand-knotted fringe.",
        glyph: "≋",
        badge: Option.none(),
    },
]

const emptyFieldErrors = (): FieldErrors => ({
    name: Option.none(),
    email: Option.none(),
    address: Option.none(),
    city: Option.none(),
    postal_code: Option.none(),
    card_number: Option.none(),
    agree_to_terms: Option.none(),
})

export const productForId = (product_id: ProductId): Option.Option<Product> =>
    Array.findFirst(products, ({ id }) => id === product_id)

export const clampQuantity = (quantity: number): number =>
    Number.isFinite(quantity)
        ? Math.max(1, Math.min(8, Math.floor(quantity)))
        : 1

export const addCartLine = (
    lines: ReadonlyArray<CartLine>,
    product_id: ProductId,
    quantity = 1
): ReadonlyArray<CartLine> =>
    Option.match(
        Array.findFirst(lines, (line) => line.product_id === product_id),
        {
            onNone: () => [
                ...lines,
                { product_id, quantity: clampQuantity(quantity) },
            ],
            onSome: () =>
                Array.map(lines, (line) =>
                    line.product_id === product_id
                        ? {
                              product_id,
                              quantity: clampQuantity(line.quantity + quantity),
                          }
                        : line
                ),
        }
    )

export const updateCartLine = (
    lines: ReadonlyArray<CartLine>,
    product_id: ProductId,
    quantity: number
): ReadonlyArray<CartLine> =>
    quantity <= 0
        ? Array.filter(lines, (line) => line.product_id !== product_id)
        : Array.map(lines, (line) =>
              line.product_id === product_id
                  ? { product_id, quantity: clampQuantity(quantity) }
                  : line
          )

export const cartCount = (lines: ReadonlyArray<CartLine>): number =>
    Array.reduce(lines, 0, (total, line) => total + line.quantity)

export const cartSubtotal = (lines: ReadonlyArray<CartLine>): number =>
    Array.reduce(
        lines,
        0,
        (total, line) =>
            total +
            Option.match(productForId(line.product_id), {
                onNone: () => 0,
                onSome: ({ price_cents }) => price_cents * line.quantity,
            })
    )

export const deliveryCost = (subtotal: number): number =>
    subtotal >= 12_000 || subtotal === 0 ? 0 : 600

export const orderTotal = (lines: ReadonlyArray<CartLine>): number => {
    const subtotal = cartSubtotal(lines)
    return subtotal + deliveryCost(subtotal)
}

export const formatMoney = (cents: number): string =>
    new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 0,
        maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100)

const validateFields = (request: CheckoutRequest): FieldErrors => {
    const errors = emptyFieldErrors()
    return {
        name:
            request.name.trim().length < 2
                ? Option.some("Enter the name shown on the delivery address.")
                : errors.name,
        email:
            request.email.length > 254 ||
            !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(request.email)
                ? Option.some("Enter a valid email address.")
                : errors.email,
        address:
            request.address.trim().length < 5
                ? Option.some("Enter a street address.")
                : errors.address,
        city:
            request.city.trim().length < 2 || request.city.trim().length > 100
                ? Option.some("Enter a town or city.")
                : errors.city,
        postal_code: !/^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/.test(
            request.postal_code.trim()
        )
            ? Option.some("Enter a valid postal code.")
            : errors.postal_code,
        card_number: !/^\d{16}$/.test(request.card_number.replace(/\s/g, ""))
            ? Option.some("Use the 16-digit fixture card number.")
            : errors.card_number,
        agree_to_terms: request.agree_to_terms
            ? errors.agree_to_terms
            : Option.some("Accept the store terms to continue."),
    }
}

const hasFieldErrors = (errors: FieldErrors): boolean =>
    Option.isSome(errors.name) ||
    Option.isSome(errors.email) ||
    Option.isSome(errors.address) ||
    Option.isSome(errors.city) ||
    Option.isSome(errors.postal_code) ||
    Option.isSome(errors.card_number) ||
    Option.isSome(errors.agree_to_terms)

const verifiedCart = (value: unknown): Option.Option<ReadonlyArray<CartLine>> =>
    S.decodeUnknownOption(S.Array(CartLine))(value).pipe(
        Option.filter((lines) => lines.length <= products.length),
        Option.filter((lines) =>
            Array.every(
                lines,
                (line) => line.quantity >= 1 && line.quantity <= 8
            )
        ),
        Option.filter(
            (lines) =>
                new Set(Array.map(lines, (line) => line.product_id)).size ===
                lines.length
        )
    )

const stableOrderId = (key: string): string => {
    const hash = Array.reduce(
        Array.fromIterable(key),
        2_166_136_261,
        (value, character) =>
            Math.imul(value ^ character.charCodeAt(0), 16_777_619)
    )
    return `CL-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7)}`
}

export const commitOrder = (
    ledger: ReadonlyArray<SavedOrder>,
    request: CheckoutRequest
): readonly [ReadonlyArray<SavedOrder>, CheckoutResult] => {
    const existing = Array.findFirst(
        ledger,
        ({ key }) => key === request.idempotency_key
    )
    if (Option.isSome(existing)) {
        const submission_count = existing.value.submission_count + 1
        return [
            Array.map(ledger, (saved) =>
                saved.key === request.idempotency_key
                    ? {
                          key: saved.key,
                          receipt: saved.receipt,
                          submission_count,
                      }
                    : saved
            ),
            CheckoutResult.cases.Succeeded.make({
                message: "Duplicate request safely reused the original order.",
                order: existing.value.receipt,
                is_duplicate: true,
                submission_count,
            }),
        ]
    }
    const errors = validateFields(request)
    if (hasFieldErrors(errors)) {
        return [
            ledger,
            CheckoutResult.cases.Invalid.make({
                message: "Check the highlighted details.",
                errors,
            }),
        ]
    }
    const maybeLines = verifiedCart(request.lines)
    if (Option.isNone(maybeLines) || maybeLines.value.length === 0) {
        return [
            ledger,
            CheckoutResult.cases.Failed.make({
                message: Option.isNone(maybeLines)
                    ? "The basket could not be verified. Review it and retry without being charged."
                    : "Your basket is empty. Add an item before checking out.",
                is_recoverable: true,
            }),
        ]
    }
    if (request.card_number.replace(/\s/g, "") === "4000000000000000") {
        return [
            ledger,
            CheckoutResult.cases.Failed.make({
                message:
                    "The fixture bank declined this card. Use 4242 4242 4242 4242 and retry.",
                is_recoverable: true,
            }),
        ]
    }
    const receipt: OrderReceipt = {
        id: stableOrderId(request.idempotency_key),
        placed_at: "15 July 2026, 14:30",
        line_count: cartCount(maybeLines.value),
        total_cents: orderTotal(maybeLines.value),
        email: request.email,
        delivery_label: `${request.city.trim()}, ${request.postal_code.trim().toUpperCase()}`,
    }
    return [
        [
            ...ledger,
            { key: request.idempotency_key, receipt, submission_count: 1 },
        ],
        CheckoutResult.cases.Succeeded.make({
            message: "Order placed once and confirmed by Cartlane.",
            order: receipt,
            is_duplicate: false,
            submission_count: 1,
        }),
    ]
}

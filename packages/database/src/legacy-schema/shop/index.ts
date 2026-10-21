/**
 * # Shop Schema
 */
export { products, type Product, type NewProduct } from "./products.ts"

export {
    product_variants,
    type ProductVariant,
    type NewProductVariant,
} from "./product-variants.ts"

export {
    product_collections,
    type ProductCollection,
    type NewProductCollection,
} from "./product-collections.ts"

export { carts, type Cart, type NewCart } from "./carts.ts"

export { cart_items, type CartItem, type NewCartItem } from "./cart-items.ts"

export {
    orders,
    orderStatusEnum,
    type Order,
    type NewOrder,
    type Address,
} from "./orders.ts"

export {
    order_items,
    fulfillmentStatusEnum,
    type OrderItem,
    type NewOrderItem,
} from "./order-items.ts"

export { customers, type Customer, type NewCustomer } from "./customers.ts"

export {
    payments,
    paymentStatusEnum,
    type Payment,
    type NewPayment,
} from "./payments.ts"

import type { Email } from "@urm/domain/schemas/contacts"
import type {
    Cart,
    CartItem,
    CheckoutAddress,
    CreateCollectionInput,
    Order,
    Product,
    ProductCollection,
    ProductInput,
    UpdateCollectionInput,
} from "@urm/domain/schemas/shop"

type CartSnapshot = Readonly<{
    cart: Cart | null
    items: ReadonlyArray<CartItem>
}>

type OrderSnapshot = Readonly<{
    order: Order
    items: NonNullable<Order["items"]>
}>

const unavailable = <A>(): Promise<A> =>
    Promise.reject(new Error("No shop persistence adapter installed"))

export const loadProducts = (): Promise<ReadonlyArray<Product>> => unavailable()

export const createProduct = (_product: ProductInput): Promise<Product> =>
    unavailable()

export const updateProduct = (
    _id: string,
    _product: ProductInput
): Promise<Product> => unavailable()

export const loadCollections = (): Promise<ReadonlyArray<ProductCollection>> =>
    unavailable()

export const createCollection = (
    _collection: CreateCollectionInput
): Promise<ProductCollection> => unavailable()

export const updateCollection = (
    _id: string,
    _collection: UpdateCollectionInput
): Promise<ProductCollection> => unavailable()

export const loadCart = (_sessionId: string): Promise<CartSnapshot> =>
    unavailable()

export const addCartItem = (
    _sessionId: string,
    _variantId: string,
    _quantity: number
): Promise<CartSnapshot> => unavailable()

export const updateCartItem = (
    _sessionId: string,
    _itemId: string,
    _quantity: number
): Promise<CartSnapshot> => unavailable()

export const removeCartItem = (
    _sessionId: string,
    _itemId: string
): Promise<CartSnapshot> => unavailable()

export const clearCart = (
    _sessionId: string,
    _itemIds: ReadonlyArray<string>
): Promise<CartSnapshot> => unavailable()

export const loadOrders = (): Promise<ReadonlyArray<OrderSnapshot>> =>
    unavailable()

export const createPendingOrder = (
    _sessionId: string,
    _checkoutKey: string,
    _email: Email,
    _shippingAddress: CheckoutAddress
): Promise<OrderSnapshot> => unavailable()

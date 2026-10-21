import { Array, Number, Option, Predicate, Schema as S } from "effect"
import { modifyFields } from "foldkit/struct"
import { CartItem as CartItemSchema } from "./shop.item.ts"
import type { CartItem, Item } from "./shop.item.ts"

export const Cart = S.Array(CartItemSchema)

export type Cart = typeof Cart.Type

const hasItemId =
    (itemId: string) =>
    (cartItem: CartItem): boolean =>
        cartItem.item.id === itemId

const mapCartItem = (itemId: string, f: (cartItem: CartItem) => CartItem) =>
    Array.map<Cart, CartItem>((cartItem) =>
        hasItemId(itemId)(cartItem) ? f(cartItem) : cartItem
    )

export const addItem =
    (item: Item) =>
    (cart: Cart): Cart =>
        Option.match(Array.findFirst(cart, hasItemId(item.id)), {
            onNone: () => [...cart, { item, quantity: 1 }],
            onSome: () =>
                mapCartItem(
                    item.id,
                    modifyFields({
                        quantity: Number.increment,
                    })
                )(cart),
        })

export const removeItem =
    (itemId: string) =>
    (cart: Cart): Cart =>
        Array.filter(cart, Predicate.not(hasItemId(itemId)))

export const changeQuantity = (itemId: string, quantity: number) =>
    quantity <= 0
        ? removeItem(itemId)
        : mapCartItem(
              itemId,
              modifyFields({
                  quantity: () => quantity,
              })
          )

export const itemQuantity =
    (itemId: string) =>
    (cart: Cart): number =>
        Option.match(Array.findFirst(cart, hasItemId(itemId)), {
            onNone: () => 0,
            onSome: ({ quantity }) => quantity,
        })

export const totalItems = (cart: Cart): number =>
    Array.reduce(cart, 0, (total, { quantity }) => total + quantity)

export const totalPrice = (cart: Cart): number =>
    Array.reduce(
        cart,
        0,
        (total, { item, quantity }) => total + item.price * quantity
    )

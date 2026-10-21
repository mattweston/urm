import { Schema as S } from "effect"

export const Item = S.Struct({
    id: S.String,
    name: S.String,
    price: S.Number,
})

export type Item = typeof Item.Type

export const CartItem = S.Struct({
    item: Item,
    quantity: S.Number,
})

export type CartItem = typeof CartItem.Type

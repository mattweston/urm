import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const ToggledSearchBarIsOpen = taggedStruct("ToggledSearchBarIsOpen")
export const ChangedSearchBarQuery = taggedStruct("ChangedSearchBarQuery", {
    value: S.String,
})
export const ClosedSearchBar = taggedStruct("ClosedSearchBar")
export const ClickedSearchBarItem = taggedStruct("ClickedSearchBarItem", {
    href: S.String,
})

export const MountedSearchBar = taggedStruct("MountedSearchBar")

export const Message = S.Union([
    ToggledSearchBarIsOpen,
    ChangedSearchBarQuery,
    ClosedSearchBar,
    MountedSearchBar,
    ClickedSearchBarItem,
])

export type Message = typeof Message.Type

import { Schema as S } from "effect"

export const ListboxItem = S.Literals([
    "Michael Bluth",
    "Lindsay Funke",
    "Gob Bluth",
    "George Michael",
    "Maeby Funke",
    "Buster Bluth",
    "Tobias Funke",
    "Lucille Bluth",
])

export type ListboxItem = typeof ListboxItem.Type

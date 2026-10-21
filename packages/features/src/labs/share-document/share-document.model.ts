import { Schema as S } from "effect"
import * as Ui from "@foldkit/ui"

export const Person = S.Struct({
    id: S.String,
    name: S.String,
    email: S.String,
    avatarSrc: S.String,
    avatarFallback: S.String,
    permission: S.String,
    permissionListbox: Ui.Listbox.Model,
})

export type Person = typeof Person.Type

export const Model = S.Struct({
    link: S.String,
    people: S.Array(Person),
})

export type Model = typeof Model.Type

import { Schema as S } from "effect"

export const PronounOption = S.Literals([
    "She/Her",
    "He/Him",
    "They/Them",
    "Other",
])

export type PronounOption = typeof PronounOption.Type

export const all = PronounOption.literals

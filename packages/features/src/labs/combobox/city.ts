import { Schema as S } from "effect"

export const City = S.Literals([
    "Johannesburg",
    "Kyiv",
    "Oxford",
    "Plymouth",
    "Quito",
    "Wellington",
    "Zurich",
])
export type City = typeof City.Type

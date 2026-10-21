import { Schema as S } from "effect"

export const TourDateFilter = S.Union([
    S.Literal("All"),
    S.Literal("Confirmed"),
])
export type TourDateFilter = typeof TourDateFilter.Type

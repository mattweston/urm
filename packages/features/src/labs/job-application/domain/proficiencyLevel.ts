import { Schema as S } from "effect"

export const ProficiencyLevel = S.Literals([
    "Expert",
    "Advanced",
    "Intermediate",
    "Beginner",
])

export type ProficiencyLevel = typeof ProficiencyLevel.Type

export const all = ProficiencyLevel.literals

import { Schema as S } from "effect"

export const Plan = S.Literals(["Starter", "Growth", "Enterprise"])
export type Plan = typeof Plan.Type

export const PLANS: ReadonlyArray<Plan> = Plan.literals

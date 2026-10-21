import { Schema } from "effect"

export const Breach = Schema.Struct({
    Name: Schema.String,
    Title: Schema.String,
    Domain: Schema.String,
    BreachDate: Schema.String,
    DataClasses: Schema.Array(Schema.String),
    IsVerified: Schema.Boolean,
})

export const BreachCheckResult = Schema.Struct({
    status: Schema.Literals(["complete", "error"]),
    breaches: Schema.Array(Breach),
    message: Schema.String,
})
export type BreachCheckResult = typeof BreachCheckResult.Type

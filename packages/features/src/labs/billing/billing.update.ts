import { Match as M } from "effect"
import { modifyFields } from "foldkit/struct"

import type { Message, BillingVariable } from "./billing.message.ts"
import type { Model } from "./billing.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

// A record keyed by the literal union, so adding a variable to
// `BillingVariable` fails to compile until it can be set.
const setters: Readonly<
    Record<BillingVariable, (model: Model, value: number) => Model>
> = {
    seats: (model, value) => modifyFields(model, { seats: () => value }),
    contacts: (model, value) => modifyFields(model, { contacts: () => value }),
    emailsPerContact: (model, value) =>
        modifyFields(model, { emailsPerContact: () => value }),
    budget: (model, value) => modifyFields(model, { budget: () => value }),
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedBillingVariable: ({ variable, value }) => [
                setters[variable](model, value),
                [],
            ],
            ToggledAnnualBilling: () => [
                modifyFields(model, { isBilledAnnually: (isAnnual) => !isAnnual }),
                [],
            ],
        })
    )

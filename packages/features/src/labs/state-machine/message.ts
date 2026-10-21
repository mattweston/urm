import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

import { CheckoutMessage } from "./machine.ts"

export const GotCheckoutMachineMessage = taggedStruct(
    "GotCheckoutMachineMessage",
    {
        message: CheckoutMessage,
    }
)
export type GotCheckoutMachineMessage = typeof GotCheckoutMachineMessage.Type

export const StateMachineDemoMessage = S.Union([GotCheckoutMachineMessage])
export type StateMachineDemoMessage = typeof StateMachineDemoMessage.Type

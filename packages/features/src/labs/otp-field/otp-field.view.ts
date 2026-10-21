/** # OTP Field view */
import { Array } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    OTPField,
    OTPFieldGroup,
    OTPFieldInput,
    OTPFieldSeparator,
    OTPFieldSlot,
} from "@urm/ui/foldkit/otp-field.view.ts"
import { UpdatedOtpFieldValue, type Message } from "./otp-field.message.ts"
import type { Model } from "./otp-field.model.ts"

const OTP_LENGTH = 6
const getActiveIndex = (value: string) => Math.min(value.length, OTP_LENGTH - 1)

/**
 * Enter or paste a one-time password into the segmented field. Input is kept as
 * one model value while the component manages focus movement and individual
 * visual cells.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("space-y-6")],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["OTP Field"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-2xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Pure Foldkit port. The input is transparent and the slots render the code state.",
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    OTPField({
                        class: "w-fit",
                        children: [
                            OTPFieldInput(
                                {
                                    value: model.value,
                                    onInput: (value) =>
                                        toParentMessage(
                                            UpdatedOtpFieldValue({ value })
                                        ),
                                    ariaLabel: "One time password",
                                    autocomplete: "one-time-code",
                                    maxLength: OTP_LENGTH,
                                },
                                h
                            ),
                            OTPFieldGroup({
                                class: "gap-0",
                                children: [
                                    ...Array.makeBy(3, (index) =>
                                        OTPFieldSlot({
                                            value: model.value,
                                            index,
                                            length: OTP_LENGTH,
                                            isActive:
                                                index ===
                                                getActiveIndex(model.value),
                                            isFirstInGroup: index === 0,
                                            isLastInGroup: index === 2,
                                        })
                                    ),
                                    OTPFieldSeparator(),
                                    ...Array.makeBy(3, (offset) =>
                                        OTPFieldSlot({
                                            value: model.value,
                                            index: offset + 3,
                                            length: OTP_LENGTH,
                                            isActive:
                                                offset + 3 ===
                                                getActiveIndex(model.value),
                                            isFirstInGroup: offset === 0,
                                            isLastInGroup: offset === 2,
                                        })
                                    ),
                                ],
                            }),
                        ],
                    }),
                    h.p(
                        [h.Class("mt-4 text-sm text-muted-foreground")],
                        [`Current value: ${model.value || "empty"}`]
                    ),
                ]
            ),
        ]
    )
}

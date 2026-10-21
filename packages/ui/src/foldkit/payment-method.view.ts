import { type Html, inertHtml } from "foldkit/html"
import {
    IconBrandApple,
    IconBrandPaypal,
    IconCreditCard,
} from "./icons/view.ts"
import { Button } from "./button/button.view.ts"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "./card.view.ts"

const h = inertHtml

const monthOptions = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

const labelClassName =
    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"

const inputClassName =
    "w-full rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"

const selectClassName =
    "w-full rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background px-4 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"

const paymentOptionClassName =
    "flex flex-col items-center justify-between rounded-[var(--radius-surface)] border-2 border-muted bg-popover p-4 transition hover:bg-accent hover:text-accent-foreground peer-checked:border-primary"

export const PaymentMethod = (): Html => {
    const currentYear = new Date().getFullYear()
    const yearOptions = Array.from({ length: 10 }, (_, index) =>
        String(currentYear + index)
    )

    return Card({
        children: [
            CardHeader({
                children: [
                    CardTitle({ children: ["Payment Method"] }),
                    CardDescription({
                        children: ["Add a new payment method to your account."],
                    }),
                ],
            }),
            CardContent({
                class: "grid gap-6",
                children: [
                    h.div(
                        [h.Class("grid grid-cols-3 gap-4")],
                        [
                            paymentOption("card", IconCreditCard, "Card", true),
                            paymentOption("paypal", IconBrandPaypal, "Paypal"),
                            paymentOption("apple", IconBrandApple, "Apple"),
                        ]
                    ),
                    h.div(
                        [h.Class("grid gap-2")],
                        [
                            h.label([h.Class(labelClassName)], ["Name"]),
                            h.input([
                                h.Type("text"),
                                h.Placeholder("First Last"),
                                h.Class(inputClassName),
                            ]),
                        ]
                    ),
                    h.div(
                        [h.Class("grid gap-2")],
                        [
                            h.label([h.Class(labelClassName)], ["Card number"]),
                            h.input([
                                h.Type("text"),
                                h.Placeholder(""),
                                h.Class(inputClassName),
                            ]),
                        ]
                    ),
                    h.div(
                        [h.Class("grid grid-cols-3 gap-4")],
                        [
                            h.div(
                                [h.Class("grid gap-2")],
                                [
                                    h.label(
                                        [h.Class(labelClassName)],
                                        ["Expires"]
                                    ),
                                    h.select(
                                        [
                                            h.Class(selectClassName),
                                            h.AriaLabel("Month"),
                                        ],
                                        monthOptions.map((month) =>
                                            h.option([h.Value(month)], [month])
                                        )
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("grid gap-2")],
                                [
                                    h.label(
                                        [h.Class(labelClassName)],
                                        ["Year"]
                                    ),
                                    h.select(
                                        [
                                            h.Class(selectClassName),
                                            h.AriaLabel("Year"),
                                        ],
                                        yearOptions.map((year) =>
                                            h.option([h.Value(year)], [year])
                                        )
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("grid gap-2")],
                                [
                                    h.label([h.Class(labelClassName)], ["CVC"]),
                                    h.input([
                                        h.Type("text"),
                                        h.Placeholder("CVC"),
                                        h.Class(inputClassName),
                                    ]),
                                ]
                            ),
                        ]
                    ),
                ],
            }),
            CardFooter({
                children: [
                    Button(
                        {
                            class: "w-full",
                            children: ["Continue"],
                        },
                        h
                    ),
                ],
            }),
        ],
    })
}

const paymentOption = (
    value: string,
    icon: (props?: Readonly<{ class?: string }>) => Html,
    label: string,
    isChecked = false
): Html => {
    const radioId = `payment-${value}`

    return h.div(
        [],
        [
            h.input([
                h.Id(radioId),
                h.Type("radio"),
                h.Name("payment-method"),
                h.Value(value),
                ...(isChecked ? [h.Checked(true)] : []),
                h.Class("peer sr-only"),
            ]),
            h.label(
                [h.For(radioId), h.Class(paymentOptionClassName)],
                [icon({ class: "mb-3 size-6" }), h.span([], [label])]
            ),
        ]
    )
}

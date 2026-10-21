import { Array } from "effect"
import { inertHtml } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"

import { count, money, percent, plural, signedMoney } from "./formats/index.ts"
import type { Message, BillingVariable } from "./billing.message.ts"
import type { Model } from "./billing.model.ts"
import {
    ANNUAL_DISCOUNT,
    CONTACT_BLOCK,
    CONTACT_BLOCK_PRICE,
    EMAIL_BLOCK,
    EMAIL_BLOCK_PRICE,
    INCLUDED_CONTACTS,
    INCLUDED_EMAILS,
    SEAT_PRICE,
    derive,
    ranges,
} from "./billing.plan.ts"
import type { Derived } from "./billing.plan.ts"
import {
    byIndex,
    bySign,
    meter,
    numberField,
    scrubber,
    stackedBar,
    toggle,
} from "./widgets/index.ts"

type ToParent<ParentMessage> = (message: Message) => ParentMessage

// A number the reader cannot change: shown plainly so the adjustable ones stand
// out as the only things on the page that are variables.
const fixed = (text: string): Html => {
    const h = inertHtml

    return h.span([h.Class("tabular-nums")], [text])
}

// A number that fell out of the calculation. Reads as part of the sentence, but
// is boxed so it is visibly an output rather than something to reach for.
const result = (text: string): Html => {
    const h = inertHtml

    return h.span(
        [
            h.Class(
                "rounded-sm bg-accent/60 px-1 font-medium tabular-nums text-accent-foreground"
            ),
        ],
        [text]
    )
}

const paragraphClassName = "text-[1.0625rem] leading-loose text-foreground"

/** The Tangle idea: the numbers in the prose are the controls. */
export const paragraphView = <ParentMessage>(
    model: Model,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const derived = derive(model)

    return h.p(
        [h.Class(paragraphClassName)],
        [
            "A URM workspace with ",
            scrubber(
                {
                    variable: "seats",
                    value: model.seats,
                    label: "Seats",
                    format: count,
                },
                toParentMessage,
                h
            ),
            ` ${plural(model.seats, "seat", "seats")} costs `,
            result(money(derived.seatCost)),
            " a month. It syncs ",
            scrubber(
                {
                    variable: "contacts",
                    value: model.contacts,
                    label: "Contacts",
                    format: count,
                },
                toParentMessage,
                h
            ),
            " contacts, ",
            result(count(derived.billableContacts)),
            " of them past the ",
            fixed(count(INCLUDED_CONTACTS)),
            " the plan includes, billed in blocks of ",
            fixed(count(CONTACT_BLOCK)),
            " at ",
            fixed(money(CONTACT_BLOCK_PRICE)),
            ": ",
            result(money(derived.contactCost)),
            ". Each contact gets ",
            scrubber(
                {
                    variable: "emailsPerContact",
                    value: model.emailsPerContact,
                    label: "Emails per contact each month",
                    format: count,
                },
                toParentMessage,
                h
            ),
            " emails a month, so ",
            result(count(derived.emails)),
            " sends against the ",
            fixed(count(INCLUDED_EMAILS)),
            " included: ",
            result(money(derived.emailCost)),
            ". Billed ",
            toggle(
                {
                    isOn: model.isBilledAnnually,
                    label: "Billing period",
                    labelOff: "monthly",
                    labelOn: "annually",
                },
                toParentMessage,
                h
            ),
            ", that is ",
            result(money(derived.monthly)),
            " a month, or ",
            result(money(derived.yearly)),
            " a year.",
        ]
    )
}

const verdicts = (model: Model, derived: Derived): ReadonlyArray<Html> => {
    const h = inertHtml

    return [
        h.span(
            [],
            [
                "That leaves ",
                result(money(derived.budgetDelta)),
                " a month unspent — room for the workspace to roughly double before the budget is the constraint.",
            ]
        ),
        h.span(
            [],
            [
                "That fits, with ",
                result(money(derived.budgetDelta)),
                " a month of headroom.",
            ]
        ),
        h.span(
            [],
            [
                "That is over budget. Giving up ",
                result(count(derived.seatsOverBudget)),
                ` ${plural(derived.seatsOverBudget, "seat", "seats")} would bring it back inside.`,
            ]
        ),
        h.span(
            [],
            [
                "That is well past the budget: ",
                result(percent(derived.budgetUsedPercent)),
                " of it, and the ",
                fixed(count(model.contacts)),
                " contacts are the reason more often than the seats.",
            ]
        ),
    ]
}

/** The same numbers again, read against a limit rather than as a total. */
export const budgetView = <ParentMessage>(
    model: Model,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const derived = derive(model)

    return h.div(
        [h.Class("grid gap-4")],
        [
            h.p(
                [h.Class(paragraphClassName)],
                [
                    "Against a budget of ",
                    numberField(
                        {
                            variable: "budget",
                            value: model.budget,
                            label: "Monthly budget",
                        },
                        toParentMessage,
                        h
                    ),
                    " a month, the workspace is ",
                    bySign({
                        value: derived.budgetDelta,
                        whenPositive: "under",
                        whenNegative: "over",
                    }),
                    " by ",
                    result(signedMoney(Math.abs(derived.budgetDelta))),
                    ". ",
                    byIndex({
                        index: derived.verdictIndex,
                        children: verdicts(model, derived),
                    }),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "flex items-center gap-3 text-sm text-muted-foreground"
                    ),
                ],
                [
                    meter({
                        percent: derived.budgetUsedPercent,
                        label: "Budget used",
                        isOver: derived.budgetDelta < 0,
                    }),
                    h.span(
                        [h.Class("tabular-nums")],
                        [`${percent(derived.budgetUsedPercent)} of budget`]
                    ),
                ]
            ),
        ]
    )
}

type LadderRow = Readonly<{
    name: string
    expression: string
    value: string
}>

const ladderRows = (
    model: Model,
    derived: Derived
): ReadonlyArray<LadderRow> => [
    {
        name: "seatCost",
        expression: `${count(model.seats)} × ${money(SEAT_PRICE)}`,
        value: money(derived.seatCost),
    },
    {
        name: "contactCost",
        expression: `⌈${count(derived.billableContacts)} ÷ ${count(CONTACT_BLOCK)}⌉ × ${money(CONTACT_BLOCK_PRICE)}`,
        value: money(derived.contactCost),
    },
    {
        name: "emails",
        expression: `${count(model.contacts)} × ${count(model.emailsPerContact)}`,
        value: count(derived.emails),
    },
    {
        name: "emailCost",
        expression: `⌈${count(derived.billableEmails)} ÷ ${count(EMAIL_BLOCK)}⌉ × ${money(EMAIL_BLOCK_PRICE)}`,
        value: money(derived.emailCost),
    },
    {
        name: "listPrice",
        expression: `${money(derived.seatCost)} + ${money(derived.contactCost)} + ${money(derived.emailCost)}`,
        value: money(derived.listPrice),
    },
    {
        name: "discount",
        expression: model.isBilledAnnually
            ? `${money(derived.listPrice)} × ${percent(ANNUAL_DISCOUNT * 100)}`
            : "annual billing off",
        value: money(derived.discount),
    },
    {
        name: "monthly",
        expression: `${money(derived.listPrice)} − ${money(derived.discount)}`,
        value: money(derived.monthly),
    },
    {
        name: "yearly",
        expression: `${money(derived.monthly)} × 12`,
        value: money(derived.yearly),
    },
    {
        name: "budgetDelta",
        expression: `${money(model.budget)} − ${money(derived.monthly)}`,
        value: signedMoney(derived.budgetDelta),
    },
]

/** Every derivation, in the order the calculation makes them. */
export const ladderView = (model: Model): Html => {
    const h = inertHtml
    const derived = derive(model)

    return h.div(
        [h.Class("grid gap-5")],
        [
            h.div(
                [
                    h.Class(
                        "grid gap-px overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-border"
                    ),
                ],
                Array.map(ladderRows(model, derived), (row) =>
                    h.keyed("div")(
                        row.name,
                        [
                            h.Class(
                                "grid grid-cols-[minmax(7rem,auto)_1fr_auto] items-baseline gap-3 bg-card px-4 py-2 font-mono text-xs sm:text-sm"
                            ),
                        ],
                        [
                            h.span(
                                [h.Class("text-muted-foreground")],
                                [row.name]
                            ),
                            h.span(
                                [h.Class("truncate text-muted-foreground/80")],
                                [row.expression]
                            ),
                            h.span(
                                [
                                    h.Class(
                                        "text-right font-medium tabular-nums text-foreground"
                                    ),
                                ],
                                [row.value]
                            ),
                        ]
                    )
                )
            ),
            stackedBar({
                label: "Where the monthly cost comes from",
                format: money,
                segments: [
                    {
                        label: "seats",
                        value: derived.seatCost,
                        className: "bg-chart-1",
                    },
                    {
                        label: "contacts",
                        value: derived.contactCost,
                        className: "bg-chart-2",
                    },
                    {
                        label: "emails",
                        value: derived.emailCost,
                        className: "bg-chart-3",
                    },
                ],
            }),
        ]
    )
}

type InputRow = Readonly<{
    variable: BillingVariable
    label: string
    note: string
}>

const inputRows: ReadonlyArray<InputRow> = [
    { variable: "seats", label: "seats", note: "people with a login" },
    { variable: "contacts", label: "contacts", note: "records being synced" },
    {
        variable: "emailsPerContact",
        label: "emailsPerContact",
        note: "sends per contact each month",
    },
    {
        variable: "budget",
        label: "budget",
        note: "what the workspace may cost",
    },
]

/** The Model, laid out field by field. Nothing else is stored. */
export const inputsView = <ParentMessage>(
    model: Model,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const values: Readonly<Record<BillingVariable, number>> = {
        seats: model.seats,
        contacts: model.contacts,
        emailsPerContact: model.emailsPerContact,
        budget: model.budget,
    }

    return h.div(
        [
            h.Class(
                "grid gap-px overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-border"
            ),
        ],
        [
            ...Array.map(inputRows, (row) =>
                h.keyed("div")(
                    row.variable,
                    [
                        h.Class(
                            "grid grid-cols-[minmax(9rem,auto)_1fr_auto] items-baseline gap-3 bg-card px-4 py-2.5 text-sm"
                        ),
                    ],
                    [
                        h.span(
                            [
                                h.Class(
                                    "font-mono text-xs sm:text-sm text-foreground"
                                ),
                            ],
                            [row.label]
                        ),
                        h.span([h.Class("text-muted-foreground")], [row.note]),
                        h.span(
                            [h.Class("text-right")],
                            [
                                scrubber(
                                    {
                                        variable: row.variable,
                                        value: values[row.variable],
                                        label: row.label,
                                        format:
                                            row.variable === "budget"
                                                ? money
                                                : count,
                                    },
                                    toParentMessage,
                                    h
                                ),
                                h.span(
                                    [
                                        h.Class(
                                            "ml-2 font-mono text-xs text-muted-foreground/70"
                                        ),
                                    ],
                                    [
                                        `${count(ranges[row.variable].minimum)}–${count(ranges[row.variable].maximum)}`,
                                    ]
                                ),
                            ]
                        ),
                    ]
                )
            ),
            h.div(
                [
                    h.Class(
                        "grid grid-cols-[minmax(9rem,auto)_1fr_auto] items-baseline gap-3 bg-card px-4 py-2.5 text-sm"
                    ),
                ],
                [
                    h.span(
                        [
                            h.Class(
                                "font-mono text-xs sm:text-sm text-foreground"
                            ),
                        ],
                        ["isBilledAnnually"]
                    ),
                    h.span(
                        [h.Class("text-muted-foreground")],
                        ["the only field that is not a number"]
                    ),
                    h.span(
                        [h.Class("text-right")],
                        [
                            toggle(
                                {
                                    isOn: model.isBilledAnnually,
                                    label: "Billing period",
                                    labelOff: "false",
                                    labelOn: "true",
                                },
                                toParentMessage,
                                h
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: ToParent<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("grid gap-8")],
        [
            paragraphView(model, toParentMessage, h),
            budgetView(model, toParentMessage, h),
            inputsView(model, toParentMessage, h),
            ladderView(model),
        ]
    )
}

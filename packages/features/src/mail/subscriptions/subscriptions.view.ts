import * as Foldkit from "foldkit"
import * as Ui from "@foldkit/ui"
import { type Html, type HtmlBuilder } from "foldkit/html"
import type { EmailSubscriptionStatus as EmailSubscriptionStatusType } from "@urm/domain/schemas/email"
import type { Model } from "./subscriptions.model.ts"
import type { Message } from "./subscriptions.message.ts"
import {
    SubmittedSubscriptionsListKey,
    SelectedSubscriptionContactChanged,
    SubmittedSubscriptionContact,
    SubscriptionStatusChanged,
    UpdatedSubscriptionsListKey,
} from "./subscriptions.message.ts"
const inputClasses =
    "h-10 w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"

const statusOptions: ReadonlyArray<
    Readonly<{ status: EmailSubscriptionStatusType; label: string }>
> = [
    { status: "subscribed", label: "Subscribed" },
    { status: "unsubscribed", label: "Unsubscribed" },
    { status: "suppressed", label: "Suppressed" },
]

const statusClassName = (status: EmailSubscriptionStatusType): string => {
    switch (status) {
        case "subscribed":
            return "border-success/30 bg-success/10 text-success"
        case "suppressed":
            return "border-destructive/30 bg-destructive/10 text-destructive"
        case "unsubscribed":
            return "border-border bg-muted text-muted-foreground"
    }
}

const countByStatus = (
    model: Model,
    status: EmailSubscriptionStatusType
): number =>
    model.subscriptions.filter((subscription) => subscription.status === status)
        .length

const eligibleContacts = (model: Model) =>
    model.availableContacts.filter(
        (contact) =>
            !model.subscriptions.some(
                ({ contact_id }) => contact_id === contact.id
            )
    )

const metricView = (
    label: string,
    value: number,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-xs uppercase tracking-[0.16em] text-muted-foreground"
                    ),
                ],
                [label]
            ),
            h.div([h.Class("mt-1 text-2xl font-semibold")], [String(value)]),
        ]
    )

const statusButton = (
    contact_id: string,
    currentStatus: EmailSubscriptionStatusType,
    option: Readonly<{ status: EmailSubscriptionStatusType; label: string }>,
    disabled: boolean,
    h: HtmlBuilder<Message>
): Html =>
    h.button(
        [
            h.Type("button"),
            h.Disabled(disabled || currentStatus === option.status),
            h.OnClick(
                SubscriptionStatusChanged({ contact_id, status: option.status })
            ),
            h.Class(
                currentStatus === option.status
                    ? "inline-flex h-8 items-center rounded-[var(--radius-control)] bg-primary px-3 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                    : "inline-flex h-8 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 [box-shadow:var(--shadow-control)]"
            ),
        ],
        [option.label]
    )

const subscriptionRow = (
    model: Model,
    subscription: Model["subscriptions"][number],
    h: HtmlBuilder<Message>
): Html => {
    const isSaving = model.savingContactId === subscription.contact_id

    return h.article(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
                    ),
                ],
                [
                    h.div(
                        [h.Class("min-w-0 space-y-1")],
                        [
                            h.div(
                                [h.Class("truncate text-base font-semibold")],
                                [subscription.name]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "truncate text-sm text-muted-foreground"
                                    ),
                                ],
                                [subscription.email]
                            ),
                            h.div(
                                [h.Class("text-xs text-muted-foreground")],
                                [`Contact ${subscription.contact_id}`]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-col gap-3 lg:items-end")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        `inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${statusClassName(subscription.status)}`
                                    ),
                                ],
                                [isSaving ? "Saving..." : subscription.status]
                            ),
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                statusOptions.map((option) =>
                                    statusButton(
                                        subscription.contact_id,
                                        subscription.status,
                                        option,
                                        isSaving,
                                        h
                                    )
                                )
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

export const view = Foldkit.Submodel.defineView<Model, Message>(
    (model, h: HtmlBuilder<Message>): Html =>
        h.div(
            [
                h.Class(
                    "h-full min-h-0 overflow-auto bg-background text-foreground"
                ),
            ],
            [
                h.main(
                    [
                        h.Class(
                            "mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8"
                        ),
                    ],
                    [
                        h.section(
                            [
                                h.Class(
                                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
                                ),
                            ],
                            [
                                h.div(
                                    [
                                        h.Class(
                                            "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
                                        ),
                                    ],
                                    [
                                        h.div(
                                            [h.Class("space-y-2")],
                                            [
                                                h.h1(
                                                    [
                                                        h.Class(
                                                            "text-3xl font-bold tracking-tight"
                                                        ),
                                                    ],
                                                    ["Email Subscriptions"]
                                                ),
                                                h.p(
                                                    [
                                                        h.Class(
                                                            "text-sm text-muted-foreground"
                                                        ),
                                                    ],
                                                    [
                                                        "Manage contact subscription status for one email list.",
                                                    ]
                                                ),
                                            ]
                                        ),
                                        h.form(
                                            [
                                                h.Class(
                                                    "flex w-full max-w-md gap-2"
                                                ),
                                                h.OnSubmit(
                                                    SubmittedSubscriptionsListKey()
                                                ),
                                            ],
                                            [
                                                h.label(
                                                    [h.Class("sr-only")],
                                                    ["List key"]
                                                ),
                                                h.input([
                                                    h.Value(model.listKey),
                                                    h.Placeholder("newsletter"),
                                                    h.OnInput((value) =>
                                                        UpdatedSubscriptionsListKey(
                                                            { value }
                                                        )
                                                    ),
                                                    h.Class(inputClasses),
                                                ]),
                                                h.button(
                                                    [
                                                        h.Type("submit"),
                                                        h.Disabled(
                                                            model.loading
                                                        ),
                                                        h.Class(
                                                            "inline-flex h-10 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                                        ),
                                                    ],
                                                    [
                                                        model.loading
                                                            ? "Loading..."
                                                            : "Load",
                                                    ]
                                                ),
                                            ]
                                        ),
                                    ]
                                ),
                            ]
                        ),
                        h.div(
                            [h.Class("grid gap-3 sm:grid-cols-4")],
                            [
                                metricView(
                                    "Subscribers",
                                    model.subscriptions.length,
                                    h
                                ),
                                metricView(
                                    "Subscribed",
                                    countByStatus(model, "subscribed"),
                                    h
                                ),
                                metricView(
                                    "Unsubscribed",
                                    countByStatus(model, "unsubscribed"),
                                    h
                                ),
                                metricView(
                                    "Suppressed",
                                    countByStatus(model, "suppressed"),
                                    h
                                ),
                            ]
                        ),
                        h.form(
                            [
                                h.Class(
                                    "flex flex-col gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground sm:flex-row sm:items-end [box-shadow:var(--shadow-surface)]"
                                ),
                                h.OnSubmit(SubmittedSubscriptionContact()),
                            ],
                            [
                                Ui.Select.view(
                                    {
                                        id: "mail-subscription-contact",
                                        value: model.selectedContactId,
                                        onChange: (value) =>
                                            SelectedSubscriptionContactChanged({
                                                value,
                                            }),
                                        toView: (attributes) =>
                                            h.div(
                                                [
                                                    h.Class(
                                                        "min-w-0 flex-1 space-y-1.5"
                                                    ),
                                                ],
                                                [
                                                    h.label(
                                                        [
                                                            ...attributes.label,
                                                            h.Class(
                                                                "text-sm font-medium"
                                                            ),
                                                        ],
                                                        ["Add a contact"]
                                                    ),
                                                    h.select(
                                                        [
                                                            ...attributes.select,
                                                            h.Disabled(
                                                                eligibleContacts(
                                                                    model
                                                                ).length === 0
                                                            ),
                                                            h.Class(
                                                                "h-10 w-full rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background px-3 text-sm outline-none focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                            ),
                                                        ],
                                                        [
                                                            h.option(
                                                                [h.Value("")],
                                                                [
                                                                    eligibleContacts(
                                                                        model
                                                                    ).length ===
                                                                    0
                                                                        ? "No eligible contacts"
                                                                        : "Choose a contact",
                                                                ]
                                                            ),
                                                            ...eligibleContacts(
                                                                model
                                                            ).map((contact) =>
                                                                h.option(
                                                                    [
                                                                        h.Key(
                                                                            contact.id
                                                                        ),
                                                                        h.Value(
                                                                            contact.id
                                                                        ),
                                                                    ],
                                                                    [
                                                                        `${contact.name} — ${contact.email}`,
                                                                    ]
                                                                )
                                                            ),
                                                        ]
                                                    ),
                                                    h.span(
                                                        [
                                                            ...attributes.description,
                                                            h.Class(
                                                                "text-xs text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            "Only contacts with an email address can be subscribed.",
                                                        ]
                                                    ),
                                                ]
                                            ),
                                    },
                                    h
                                ),
                                h.button(
                                    [
                                        h.Type("submit"),
                                        h.Disabled(
                                            model.selectedContactId === "" ||
                                                model.savingContactId !== null
                                        ),
                                        h.Class(
                                            "inline-flex h-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                        ),
                                    ],
                                    [
                                        model.savingContactId === null
                                            ? "Subscribe"
                                            : "Saving...",
                                    ]
                                ),
                            ]
                        ),
                        ...(model.error === null
                            ? []
                            : [
                                  h.div(
                                      [
                                          h.Class(
                                              "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
                                          ),
                                      ],
                                      [model.error]
                                  ),
                              ]),
                        ...(model.notice === null
                            ? []
                            : [
                                  h.div(
                                      [
                                          h.Class(
                                              "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted/30 p-4 text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [model.notice]
                                  ),
                              ]),
                        model.loading
                            ? h.div(
                                  [
                                      h.Class(
                                          "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-8 text-sm text-muted-foreground"
                                      ),
                                  ],
                                  ["Loading subscriptions..."]
                              )
                            : model.subscriptions.length === 0
                              ? h.div(
                                    [
                                        h.Class(
                                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground"
                                        ),
                                    ],
                                    ["No subscriptions for this list yet."]
                                )
                              : h.div(
                                    [h.Class("grid gap-3")],
                                    model.subscriptions.map((subscription) =>
                                        subscriptionRow(model, subscription, h)
                                    )
                                ),
                    ]
                ),
            ]
        )
)

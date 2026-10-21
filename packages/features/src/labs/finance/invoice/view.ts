import { Option } from "effect"
import { Submodel } from "foldkit"
import { Button, Fieldset, Input } from "@foldkit/ui"
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"
import { defaultEmailTemplateTheme } from "@urm/email/templates"
import { format_invoice_money, invoice_total_minor } from "@urm/domain/finance"
import { content_templates_href } from "../../../content/route.ts"
import { invoice_view } from "../../../mail/templates/invoice.ts"
import { renderHtmlToEmailDocument } from "../../../mail/templates/renderer.ts"
import { HeaderField, preview, type Model } from "./model.ts"
import {
    AddedLine,
    ChangedHeader,
    ChangedLine,
    RemovedLine,
    RequestedPreview,
    ResetDemo,
    type Message,
} from "./update.ts"

const fields: ReadonlyArray<
    Readonly<{
        field: typeof HeaderField.Type
        label: string
        type: string
        hint: string
    }>
> = [
    {
        field: "seller_name",
        label: "Business name",
        type: "text",
        hint: "The business issuing this invoice.",
    },
    {
        field: "customer_name",
        label: "Customer name",
        type: "text",
        hint: "The person or business being billed.",
    },
    {
        field: "customer_email",
        label: "Customer email",
        type: "email",
        hint: "Shown as the recipient in the email preview.",
    },
    {
        field: "invoice_number",
        label: "Invoice number",
        type: "text",
        hint: "A reference for this demo invoice.",
    },
    {
        field: "issued_on",
        label: "Invoice date",
        type: "date",
        hint: "The date this invoice is issued.",
    },
    {
        field: "due_on",
        label: "Due date",
        type: "date",
        hint: "On or after the invoice date.",
    },
]

const input_class =
    "block min-h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary data-[invalid]:border-destructive"
const button_class =
    "min-h-12 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"

const input_field = (
    config: Readonly<{
        id: string
        label: string
        value: string
        hint: string
        type?: string
        attributes?: ReadonlyArray<Attribute<Message>>
        on_input: (value: string) => Message
    }>,
    h: HtmlBuilder<Message>
): Html =>
    Input.view(
        {
            id: config.id,
            name: config.id,
            value: config.value,
            type: config.type ?? "text",
            onInput: config.on_input,
            toView: (attributes) =>
                h.div(
                    [h.Class("flex flex-col gap-1.5")],
                    [
                        h.label(
                            [
                                ...attributes.label,
                                h.Class("text-sm font-medium"),
                            ],
                            [config.label]
                        ),
                        h.input([
                            ...attributes.input,
                            h.Required(true),
                            h.Maxlength(255),
                            h.Class(input_class),
                            ...(config.attributes ?? []),
                        ]),
                        h.p(
                            [
                                ...attributes.description,
                                h.Class("text-xs text-muted-foreground"),
                            ],
                            [config.hint]
                        ),
                    ]
                ),
        },
        h
    )

const action_button = (
    label: string,
    message: Message,
    h: HtmlBuilder<Message>,
    disabled = false
): Html =>
    Button.view(
        {
            onClick: message,
            isDisabled: disabled,
            toView: (attributes) =>
                h.button(
                    [...attributes.button, h.Class(button_class)],
                    [label]
                ),
        },
        h
    )

const invoice_form = (model: Model, h: HtmlBuilder<Message>): Html => {
    const invoice = preview(model)
    return h.div(
        [
            h.Class(
                "mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"
            ),
        ],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.p(
                        [h.Class("text-sm font-medium text-muted-foreground")],
                        ["Finance / Labs"]
                    ),
                    h.h1(
                        [h.Class("text-2xl font-semibold tracking-tight")],
                        ["Invoice form demo"]
                    ),
                    h.p(
                        [h.Class("max-w-prose text-sm text-muted-foreground")],
                        [
                            "Edit a sample invoice and preview its email. GBP only; tax is not calculated. Nothing is saved or sent.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid min-w-0 items-start gap-6 xl:grid-cols-2")],
                [
                    h.form(
                        [
                            h.Class("min-w-0 space-y-6"),
                            h.OnSubmit(RequestedPreview()),
                        ],
                        [
                            Fieldset.view(
                                {
                                    id: "invoice-details",
                                    toView: (attributes) =>
                                        h.fieldset(
                                            [
                                                ...attributes.fieldset,
                                                h.Class(
                                                    "rounded-xl border bg-card p-5 sm:p-6"
                                                ),
                                            ],
                                            [
                                                h.legend(
                                                    [
                                                        ...attributes.legend,
                                                        h.Class(
                                                            "px-1 text-base font-semibold"
                                                        ),
                                                    ],
                                                    ["Invoice details"]
                                                ),
                                                h.p(
                                                    [
                                                        ...attributes.description,
                                                        h.Class(
                                                            "mb-5 text-sm text-muted-foreground"
                                                        ),
                                                    ],
                                                    [
                                                        "All fields are required. The preview updates when the invoice is valid.",
                                                    ]
                                                ),
                                                h.div(
                                                    [
                                                        h.Class(
                                                            "grid gap-5 sm:grid-cols-2"
                                                        ),
                                                    ],
                                                    fields.map(
                                                        ({
                                                            field,
                                                            label,
                                                            type,
                                                            hint,
                                                        }) =>
                                                            input_field(
                                                                {
                                                                    id: `invoice-${field}`,
                                                                    label,
                                                                    type,
                                                                    hint,
                                                                    value: model[
                                                                        field
                                                                    ],
                                                                    attributes:
                                                                        field ===
                                                                        "due_on"
                                                                            ? [
                                                                                  h.Min(
                                                                                      model.issued_on
                                                                                  ),
                                                                              ]
                                                                            : [],
                                                                    on_input: (
                                                                        value
                                                                    ) =>
                                                                        ChangedHeader(
                                                                            {
                                                                                field,
                                                                                value,
                                                                            }
                                                                        ),
                                                                },
                                                                h
                                                            )
                                                    )
                                                ),
                                            ]
                                        ),
                                },
                                h
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex items-center justify-between gap-3"
                                    ),
                                ],
                                [
                                    h.h2(
                                        [h.Class("text-lg font-semibold")],
                                        ["Line items"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [`${model.lines.length} / 50 items`]
                                    ),
                                ]
                            ),
                            ...model.lines.map((line, index) =>
                                Fieldset.view(
                                    {
                                        id: `invoice-item-${line.id}`,
                                        toView: (attributes) =>
                                            h.fieldset(
                                                [
                                                    ...attributes.fieldset,
                                                    h.Key(String(line.id)),
                                                    h.Class(
                                                        "space-y-4 rounded-xl border bg-card p-5 sm:p-6"
                                                    ),
                                                ],
                                                [
                                                    h.legend(
                                                        [
                                                            ...attributes.legend,
                                                            h.Class(
                                                                "px-1 text-sm font-semibold"
                                                            ),
                                                        ],
                                                        [`Item ${index + 1}`]
                                                    ),
                                                    h.p(
                                                        [
                                                            ...attributes.description,
                                                            h.Class(
                                                                "text-sm text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            "Describe the work or product and set its price.",
                                                        ]
                                                    ),
                                                    input_field(
                                                        {
                                                            id: `invoice-description-${line.id}`,
                                                            label: "Description",
                                                            value: line.description,
                                                            hint: "Up to 255 characters.",
                                                            on_input: (value) =>
                                                                ChangedLine({
                                                                    id: line.id,
                                                                    field: "description",
                                                                    value,
                                                                }),
                                                        },
                                                        h
                                                    ),
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "grid gap-4 sm:grid-cols-2"
                                                            ),
                                                        ],
                                                        [
                                                            input_field(
                                                                {
                                                                    id: `invoice-quantity-${line.id}`,
                                                                    label: "Quantity",
                                                                    value: line.quantity,
                                                                    hint: "Whole number, 1–1,000.",
                                                                    attributes:
                                                                        [
                                                                            h.InputMode(
                                                                                "numeric"
                                                                            ),
                                                                            h.Pattern(
                                                                                "[0-9]{1,4}"
                                                                            ),
                                                                        ],
                                                                    on_input: (
                                                                        value
                                                                    ) =>
                                                                        ChangedLine(
                                                                            {
                                                                                id: line.id,
                                                                                field: "quantity",
                                                                                value,
                                                                            }
                                                                        ),
                                                                },
                                                                h
                                                            ),
                                                            input_field(
                                                                {
                                                                    id: `invoice-price-${line.id}`,
                                                                    label: "Unit price (GBP)",
                                                                    value: line.unit_price,
                                                                    hint: "Up to £9,999,999.99; at most two decimal places.",
                                                                    attributes:
                                                                        [
                                                                            h.InputMode(
                                                                                "decimal"
                                                                            ),
                                                                            h.Pattern(
                                                                                "[0-9]{1,7}([.][0-9]{1,2})?"
                                                                            ),
                                                                        ],
                                                                    on_input: (
                                                                        value
                                                                    ) =>
                                                                        ChangedLine(
                                                                            {
                                                                                id: line.id,
                                                                                field: "unit_price",
                                                                                value,
                                                                            }
                                                                        ),
                                                                },
                                                                h
                                                            ),
                                                        ]
                                                    ),
                                                    action_button(
                                                        `Remove item ${index + 1}`,
                                                        RemovedLine({
                                                            id: line.id,
                                                        }),
                                                        h,
                                                        model.lines.length === 1
                                                    ),
                                                ]
                                            ),
                                    },
                                    h
                                )
                            ),
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    action_button(
                                        "Add item",
                                        AddedLine(),
                                        h,
                                        model.lines.length >= 50
                                    ),
                                    Button.view(
                                        {
                                            type: "submit",
                                            toView: (attributes) =>
                                                h.button(
                                                    [
                                                        ...attributes.button,
                                                        h.Class(
                                                            "min-h-12 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
                                                        ),
                                                    ],
                                                    ["Validate invoice"]
                                                ),
                                        },
                                        h
                                    ),
                                    action_button("Reset demo", ResetDemo(), h),
                                ]
                            ),
                            ...(model.show_errors
                                ? [
                                      h.p(
                                          [
                                              h.Role("status"),
                                              h.Class(
                                                  "rounded-lg border p-4 text-sm"
                                              ),
                                          ],
                                          [
                                              Option.isSome(invoice)
                                                  ? "Invoice is valid. Preview updated."
                                                  : "Check required names, email, item descriptions and amounts. Quantities must be 1–1,000; the due date must be on or after the invoice date.",
                                          ]
                                      ),
                                  ]
                                : []),
                        ]
                    ),
                    h.section(
                        [
                            h.Class(
                                "min-w-0 space-y-4 rounded-xl border bg-muted/30 p-4 sm:p-6"
                            ),
                        ],
                        [
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                ["Email preview"]
                            ),
                            Option.match(invoice, {
                                onNone: () =>
                                    h.p(
                                        [
                                            h.Class(
                                                "rounded-lg border bg-card p-6 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Complete the invoice details to see the preview.",
                                        ]
                                    ),
                                onSome: (valid) =>
                                    h.div(
                                        [h.Class("space-y-3")],
                                        [
                                            h.p(
                                                [
                                                    h.Class(
                                                        "break-words text-sm"
                                                    ),
                                                ],
                                                [`To: ${valid.customer_email}`]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "break-words text-sm"
                                                    ),
                                                ],
                                                [
                                                    `Subject: Invoice ${valid.invoice_number}`,
                                                ]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-lg font-semibold tabular-nums"
                                                    ),
                                                ],
                                                [
                                                    `Total: ${format_invoice_money(invoice_total_minor(valid))}`,
                                                ]
                                            ),
                                            h.iframe(
                                                [
                                                    h.Title(
                                                        "Invoice email preview"
                                                    ),
                                                    h.Sandbox(""),
                                                    h.Srcdoc(
                                                        renderHtmlToEmailDocument(
                                                            invoice_view(valid),
                                                            defaultEmailTemplateTheme
                                                        )
                                                    ),
                                                    h.Class(
                                                        "h-[720px] w-full rounded-lg border bg-white"
                                                    ),
                                                ],
                                                []
                                            ),
                                        ]
                                    ),
                            }),
                            h.a(
                                [
                                    h.Href(
                                        `${content_templates_href()}?kind=email`
                                    ),
                                    h.Class(
                                        "inline-block text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                                    ),
                                ],
                                ["Browse email templates"]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

export const view = Submodel.defineView<Model, Message>(invoice_form)

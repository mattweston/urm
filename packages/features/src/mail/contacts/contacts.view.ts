import { Array, Match as M, Option } from "effect"
import * as Foldkit from "foldkit"
import { type Html, type HtmlBuilder } from "foldkit/html"
import type { Model } from "./contacts.model.ts"
import type { Contact } from "./contacts.data.ts"
import type { Message } from "./contacts.message.ts"
import { csvHref } from "../../data/route.ts"
import {
    AddedContactEmailAddress,
    ChangedPrimaryContactEmail,
    ClickedCreateContact,
    ClickedDeleteContact,
    ClickedEditContact,
    ClosedContactDialog,
    ContactsSearchChanged,
    ConfirmedDeleteContact,
    RemovedContactEmailAddress,
    SelectedContactChanged,
    SubmittedContactForm,
    UpdatedContactEmailAddress,
    UpdatedContactDraft,
} from "./contacts.message.ts"

type ViewOptions = Readonly<{
    can_write?: boolean
    can_delete?: boolean
    can_import?: boolean
    edit_label?: string
    paginated?: boolean
    server_search?: boolean
    limited_fields?: boolean
    busy?: boolean
}>

const listItemClasses = (isSelected: boolean) =>
    isSelected
        ? "flex w-full flex-col gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary/30 bg-muted p-4 text-left [box-shadow:var(--shadow-surface)] transition"
        : "flex w-full flex-col gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-left transition hover:border-border/70 hover:bg-accent"

const dialogShellClasses =
    "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"

const dialogPanelClasses =
    "w-full max-w-2xl rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 text-card-foreground [box-shadow:var(--shadow-overlay)]"

const inputClasses =
    "h-10 w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring"

const formatDate = (value: number) =>
    value < 1_000_000_000_000
        ? "Just now"
        : new Intl.DateTimeFormat("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
          }).format(new Date(value))

const initials = (name: string) =>
    name
        .split(" ")
        .map((part) => part[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase()

const selectedContact = (model: Model) =>
    Option.match(
        Array.findFirst(
            model.contacts,
            ({ id }) => id === model.selectedContactId
        ),
        {
            onNone: () => Array.head(model.contacts),
            onSome: (contact) => Option.some(contact),
        }
    )

const contactCardView = (
    model: Model,
    contact: Contact,
    h: HtmlBuilder<Message>,
    options: ViewOptions
): Html => {
    const isSelected = model.selectedContactId === contact.id

    return h.keyed("article")(
        contact.id,
        [h.Class(listItemClasses(isSelected))],
        [
            h.button(
                [
                    h.Type("button"),
                    h.Class("flex w-full items-start gap-3 text-left"),
                    h.OnClick(
                        SelectedContactChanged({ contactId: contact.id })
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                            ),
                        ],
                        [initials(contact.name)]
                    ),
                    h.div(
                        [h.Class("min-w-0 flex-1 space-y-1")],
                        [
                            h.div(
                                [h.Class("truncate text-base font-semibold")],
                                [contact.name]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "truncate text-sm text-muted-foreground"
                                    ),
                                ],
                                [contact.email]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "truncate text-xs text-muted-foreground"
                                    ),
                                ],
                                [contact.company]
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Disabled(options.can_write === false),
                            h.Class(
                                "inline-flex h-8 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                            ),
                            h.OnClick(
                                ClickedEditContact({
                                    contactId: contact.id,
                                })
                            ),
                        ],
                        [options.edit_label ?? "Edit"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Disabled(
                                options.can_write === false ||
                                    options.can_delete === false
                            ),
                            h.Class(
                                "inline-flex h-8 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-destructive/20 bg-destructive/10 px-3 text-xs font-medium text-destructive transition hover:bg-destructive hover:text-destructive-foreground [box-shadow:var(--shadow-control)]"
                            ),
                            h.OnClick(
                                ClickedDeleteContact({
                                    contactId: contact.id,
                                })
                            ),
                        ],
                        ["Delete"]
                    ),
                ]
            ),
        ]
    )
}

const contactDetailView = (
    model: Model,
    h: HtmlBuilder<Message>,
    options: ViewOptions
): Html => {
    const maybeContact = selectedContact(model)

    return Option.match(maybeContact, {
        onNone: () =>
            h.section(
                [
                    h.Class(
                        "flex h-full min-h-0 items-center justify-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-8 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.div(
                        [h.Class("text-center text-sm text-muted-foreground")],
                        ["Pick a contact to see details."]
                    ),
                ]
            ),
        onSome: (contact) =>
            h.section(
                [
                    h.Class(
                        "flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "border-b-(length:--surface-border-width) border-border p-5"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("flex items-start gap-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary"
                                            ),
                                        ],
                                        [initials(contact.name)]
                                    ),
                                    h.div(
                                        [h.Class("min-w-0 flex-1")],
                                        [
                                            h.h2(
                                                [
                                                    h.Class(
                                                        "text-2xl font-semibold tracking-tight"
                                                    ),
                                                ],
                                                [contact.name]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [contact.title]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                [contact.company]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("mt-4 flex flex-wrap gap-2")],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Disabled(
                                                options.can_write === false
                                            ),
                                            h.Class(
                                                "inline-flex h-9 items-center rounded-[var(--radius-control)] bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                            ),
                                            h.OnClick(
                                                ClickedEditContact({
                                                    contactId: contact.id,
                                                })
                                            ),
                                        ],
                                        [options.edit_label ?? "Edit"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Disabled(
                                                options.can_write === false ||
                                                    options.can_delete === false
                                            ),
                                            h.Class(
                                                "inline-flex h-9 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-destructive/20 bg-destructive/10 px-3 text-sm font-medium text-destructive transition hover:bg-destructive hover:text-destructive-foreground [box-shadow:var(--shadow-control)]"
                                            ),
                                            h.OnClick(
                                                ClickedDeleteContact({
                                                    contactId: contact.id,
                                                })
                                            ),
                                        ],
                                        ["Delete"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("grid gap-4 p-5 text-sm")],
                        [
                            contactEmailAddressesView(contact, h),
                            contactFieldView(
                                "Phone",
                                `tel:${contact.tel}`,
                                contact.tel,
                                h
                            ),
                            contactFieldView(
                                "Updated",
                                undefined,
                                formatDate(contact.updatedAt),
                                h
                            ),
                        ]
                    ),
                ]
            ),
    })
}

const contactFieldView = (
    label: string,
    href: string | undefined,
    value: string,
    h: HtmlBuilder<Message>
): Html => {
    return h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background/40 p-4"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                    ),
                ],
                [label]
            ),
            href === undefined
                ? h.div([h.Class("mt-2 text-foreground")], [value])
                : h.a(
                      [
                          h.Href(href),
                          h.Class(
                              "mt-2 inline-flex text-foreground underline-offset-4 hover:underline"
                          ),
                      ],
                      [value]
                  ),
        ]
    )
}

const contactEmailAddressesView = (
    contact: Contact,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background/40 p-4"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                    ),
                ],
                ["Email addresses"]
            ),
            h.div(
                [h.Class("mt-2 grid gap-2")],
                contact.email_addresses.map((email_address) =>
                    h.div(
                        [h.Class("flex min-w-0 items-center gap-2")],
                        [
                            h.a(
                                [
                                    h.Href(`mailto:${email_address.email}`),
                                    h.Class(
                                        "min-w-0 truncate text-foreground underline-offset-4 hover:underline"
                                    ),
                                ],
                                [email_address.email]
                            ),
                            ...(email_address.is_primary
                                ? [
                                      h.span(
                                          [
                                              h.Class(
                                                  "shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                                              ),
                                          ],
                                          ["Primary"]
                                      ),
                                  ]
                                : []),
                        ]
                    )
                )
            ),
        ]
    )

const contactFormView = (
    model: Model,
    h: HtmlBuilder<Message>,
    options: ViewOptions
): Html => {
    return M.value(model.contactsDialog).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            ContactsDialogClosed: () => h.empty,
            ContactsDialogCreate: () =>
                renderContactForm(
                    model,
                    "Create Contact",
                    "Create Contact",
                    "Add a new contact.",
                    h,
                    options
                ),
            ContactsDialogEdit: ({ contactId }) =>
                renderContactForm(
                    model,
                    "Edit Contact",
                    "Update Contact",
                    Option.match(
                        Array.findFirst(
                            model.contacts,
                            ({ id }) => id === contactId
                        ),
                        {
                            onNone: () => "Edit an existing contact.",
                            onSome: (contact) => `Editing ${contact.name}.`,
                        }
                    ),
                    h,
                    options
                ),
            ContactsDialogDelete: ({ contactId }) =>
                h.div(
                    [h.Class(dialogShellClasses)],
                    [
                        h.div(
                            [h.Class(dialogPanelClasses)],
                            [
                                h.h3(
                                    [h.Class("text-xl font-semibold")],
                                    ["Delete Contact"]
                                ),
                                h.p(
                                    [
                                        h.Class(
                                            "mt-2 text-sm text-muted-foreground"
                                        ),
                                    ],
                                    [
                                        Option.match(
                                            Array.findFirst(
                                                model.contacts,
                                                ({ id }) => id === contactId
                                            ),
                                            {
                                                onNone: () =>
                                                    "Delete this contact?",
                                                onSome: (contact) =>
                                                    `Remove ${contact.name} from the list?`,
                                            }
                                        ),
                                    ]
                                ),
                                h.div(
                                    [h.Class("mt-6 flex justify-end gap-2")],
                                    [
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.Class(
                                                    "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                                ),
                                                h.OnClick(
                                                    ClosedContactDialog()
                                                ),
                                            ],
                                            ["Cancel"]
                                        ),
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.Class(
                                                    "inline-flex h-10 items-center rounded-[var(--radius-control)] bg-destructive px-4 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                                ),
                                                h.OnClick(
                                                    ConfirmedDeleteContact()
                                                ),
                                            ],
                                            ["Delete"]
                                        ),
                                    ]
                                ),
                            ]
                        ),
                    ]
                ),
        })
    )
}

const renderContactForm = (
    model: Model,
    title: string,
    submitLabel: string,
    description: string,
    h: HtmlBuilder<Message>,
    options: ViewOptions
): Html => {
    return h.div(
        [h.Class(dialogShellClasses)],
        [
            h.div(
                [h.Class(dialogPanelClasses)],
                [
                    h.div(
                        [h.Class("flex items-start justify-between gap-4")],
                        [
                            h.div(
                                [],
                                [
                                    h.h3(
                                        [h.Class("text-xl font-semibold")],
                                        [title]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-1 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [description]
                                    ),
                                ]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Class(
                                        "text-sm text-muted-foreground transition hover:text-foreground"
                                    ),
                                    h.OnClick(ClosedContactDialog()),
                                    h.Disabled(options.busy === true),
                                ],
                                ["Close"]
                            ),
                        ]
                    ),
                    h.form(
                        [
                            h.Class("mt-6 grid gap-4 md:grid-cols-2"),
                            h.AriaLabel(title),
                            h.OnSubmit(SubmittedContactForm()),
                        ],
                        [
                            contactInput(
                                "Name",
                                "name",
                                model.contactDraft.name,
                                h,
                                true,
                                options.busy
                            ),
                            h.div(
                                [h.Class("md:col-span-2")],
                                [
                                    contactEmailAddressInputs(
                                        model.contactDraft.email_addresses,
                                        h,
                                        options.limited_fields === true,
                                        options.busy === true ||
                                            (options.limited_fields === true &&
                                                model.contactsDialog._tag ===
                                                    "ContactsDialogEdit")
                                    ),
                                ]
                            ),
                            contactInput(
                                "Phone",
                                "tel",
                                model.contactDraft.tel,
                                h,
                                false,
                                options.limited_fields || options.busy
                            ),
                            contactInput(
                                "Title",
                                "title",
                                model.contactDraft.title,
                                h,
                                false,
                                options.limited_fields || options.busy
                            ),
                            h.div(
                                [h.Class("md:col-span-2")],
                                [
                                    contactInput(
                                        "Company",
                                        "company",
                                        model.contactDraft.company,
                                        h,
                                        false,
                                        options.limited_fields || options.busy
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "md:col-span-2 flex justify-end gap-2 pt-2"
                                    ),
                                ],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Class(
                                                "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                            ),
                                            h.OnClick(ClosedContactDialog()),
                                            h.Disabled(options.busy === true),
                                        ],
                                        ["Cancel"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("submit"),
                                            h.Disabled(options.busy === true),
                                            h.Class(
                                                "inline-flex h-10 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                            ),
                                        ],
                                        [submitLabel]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const contactInput = (
    label: string,
    field: "name" | "tel" | "title" | "company",
    value: string,
    h: HtmlBuilder<Message>,
    isRequired = false,
    disabled = false
): Html => {
    return h.label(
        [h.Class("grid gap-2 text-sm font-medium text-foreground")],
        [
            h.span([], [label]),
            h.input([
                h.Type(field === "tel" ? "tel" : "text"),
                h.Value(value),
                h.Required(isRequired),
                h.Disabled(disabled),
                h.Placeholder(`Enter ${label.toLowerCase()}`),
                h.OnInput((nextValue) =>
                    UpdatedContactDraft({ field, value: nextValue })
                ),
                h.Class(inputClasses),
            ]),
        ]
    )
}

const contactEmailAddressInputs = (
    email_addresses: Model["contactDraft"]["email_addresses"],
    h: HtmlBuilder<Message>,
    single_address = false,
    disabled = false
): Html =>
    h.fieldset(
        [h.Class("grid gap-3")],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-3")],
                [
                    h.legend(
                        [h.Class("text-sm font-medium text-foreground")],
                        ["Email addresses"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(AddedContactEmailAddress()),
                            h.Disabled(single_address || disabled),
                            h.Class(
                                "inline-flex h-8 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-accent [box-shadow:var(--shadow-control)]"
                            ),
                        ],
                        ["Add email"]
                    ),
                ]
            ),
            ...email_addresses.map((email_address, index) =>
                h.div(
                    [
                        h.Class(
                            "grid gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background/40 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
                        ),
                    ],
                    [
                        h.label(
                            [h.Class("grid gap-2 text-sm")],
                            [
                                h.span(
                                    [h.Class("text-muted-foreground")],
                                    [`Email ${index + 1}`]
                                ),
                                h.input([
                                    h.Type("email"),
                                    h.Value(email_address.email),
                                    h.Disabled(disabled),
                                    h.Required(true),
                                    h.OnInput((value) =>
                                        UpdatedContactEmailAddress({
                                            index,
                                            value,
                                        })
                                    ),
                                    h.Class(inputClasses),
                                ]),
                            ]
                        ),
                        h.button(
                            [
                                h.Type("button"),
                                h.Disabled(single_address || disabled),
                                h.OnClick(
                                    ChangedPrimaryContactEmail({ index })
                                ),
                                h.Class(
                                    email_address.is_primary
                                        ? "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-3 text-xs font-medium text-primary-foreground [box-shadow:var(--shadow-primary)]"
                                        : "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground [box-shadow:var(--shadow-control)]"
                                ),
                            ],
                            [
                                email_address.is_primary
                                    ? "Primary"
                                    : "Make primary",
                            ]
                        ),
                        h.button(
                            [
                                h.Type("button"),
                                h.Disabled(
                                    single_address ||
                                        disabled ||
                                        email_addresses.length < 2
                                ),
                                h.OnClick(
                                    RemovedContactEmailAddress({ index })
                                ),
                                h.Class(
                                    "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-destructive/20 bg-destructive/10 px-3 text-xs font-medium text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-40 [box-shadow:var(--shadow-control)]"
                                ),
                            ],
                            ["Remove"]
                        ),
                    ]
                )
            ),
        ]
    )

export const make_view = (options: ViewOptions = {}) =>
    Foldkit.Submodel.defineView<Model, Message>(
        (model, h: HtmlBuilder<Message>): Html => {
            const filteredContacts = options.server_search
                ? model.contacts
                : Array.filter(
                      model.contacts,
                      (contact) =>
                          contact.name
                              .toLowerCase()
                              .includes(
                                  model.contactsSearch.trim().toLowerCase()
                              ) ||
                          contact.email
                              .toLowerCase()
                              .includes(
                                  model.contactsSearch.trim().toLowerCase()
                              ) ||
                          contact.email_addresses.some((email_address) =>
                              email_address.email
                                  .toLowerCase()
                                  .includes(
                                      model.contactsSearch.trim().toLowerCase()
                                  )
                          ) ||
                          contact.tel
                              .toLowerCase()
                              .includes(
                                  model.contactsSearch.trim().toLowerCase()
                              ) ||
                          contact.title
                              .toLowerCase()
                              .includes(
                                  model.contactsSearch.trim().toLowerCase()
                              ) ||
                          contact.company
                              .toLowerCase()
                              .includes(
                                  model.contactsSearch.trim().toLowerCase()
                              )
                  )

            return h.div(
                [
                    h.Class(
                        options.paginated
                            ? "min-h-0 bg-background text-foreground"
                            : "h-[calc(100vh-4.25rem)] overflow-hidden bg-background text-foreground"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "mx-auto flex h-full max-w-[1600px] flex-col gap-4 overflow-hidden p-4 lg:p-6"
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
                                                "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [],
                                                [
                                                    h.h1(
                                                        [
                                                            h.Class(
                                                                "text-3xl font-semibold tracking-tight"
                                                            ),
                                                        ],
                                                        ["Contacts"]
                                                    ),
                                                    h.p(
                                                        [
                                                            h.Class(
                                                                "mt-1 text-sm text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            "Browse, search, and edit contacts.",
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex flex-wrap gap-2"
                                                    ),
                                                ],
                                                [
                                                    h.button(
                                                        [
                                                            h.Type("button"),
                                                            h.Disabled(
                                                                options.can_write ===
                                                                    false
                                                            ),
                                                            h.Class(
                                                                "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                                            ),
                                                            h.OnClick(
                                                                ClickedCreateContact()
                                                            ),
                                                        ],
                                                        ["Add Contact"]
                                                    ),
                                                    options.can_import !== false
                                                        ? h.a(
                                                              [
                                                                  h.Href(
                                                                      csvHref()
                                                                  ),
                                                                  h.Class(
                                                                      "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                                                  ),
                                                              ],
                                                              ["Upload CSV"]
                                                          )
                                                        : h.button(
                                                              [
                                                                  h.Type(
                                                                      "button"
                                                                  ),
                                                                  h.Disabled(
                                                                      true
                                                                  ),
                                                                  h.Class(
                                                                      "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                                                  ),
                                                              ],
                                                              ["Upload CSV"]
                                                          ),
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-5 grid gap-3 md:max-w-xl"
                                            ),
                                        ],
                                        [
                                            h.label(
                                                [h.Class("sr-only")],
                                                ["Search contacts"]
                                            ),
                                            h.input([
                                                h.Type("search"),
                                                h.Value(model.contactsSearch),
                                                h.Placeholder(
                                                    options.paginated &&
                                                        !options.server_search
                                                        ? "Search this page"
                                                        : "Search contacts"
                                                ),
                                                h.AriaLabel("Search contacts"),
                                                ...(options.server_search
                                                    ? [h.Maxlength(255)]
                                                    : []),
                                                h.OnInput((value) =>
                                                    ContactsSearchChanged({
                                                        value,
                                                    })
                                                ),
                                                h.Class(inputClasses),
                                            ]),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)]"
                                    ),
                                ],
                                [
                                    h.section(
                                        [
                                            h.Class(
                                                "flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex items-center justify-between border-b-(length:--surface-border-width) border-border p-4"
                                                    ),
                                                ],
                                                [
                                                    h.h2(
                                                        [
                                                            h.Class(
                                                                "text-lg font-semibold"
                                                            ),
                                                        ],
                                                        ["All Contacts"]
                                                    ),
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "text-sm text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            `${filteredContacts.length} results${options.paginated ? " on this page" : ""}`,
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "min-h-0 flex-1 overflow-auto p-4"
                                                    ),
                                                ],
                                                [
                                                    filteredContacts.length ===
                                                    0
                                                        ? h.div(
                                                              [
                                                                  h.Class(
                                                                      "flex h-full items-center justify-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border p-8 text-sm text-muted-foreground"
                                                                  ),
                                                              ],
                                                              [
                                                                  "No contacts match your search.",
                                                              ]
                                                          )
                                                        : h.div(
                                                              [
                                                                  h.Class(
                                                                      "grid gap-3"
                                                                  ),
                                                              ],
                                                              filteredContacts.map(
                                                                  (contact) =>
                                                                      contactCardView(
                                                                          model,
                                                                          contact,
                                                                          h,
                                                                          options
                                                                      )
                                                              )
                                                          ),
                                                ]
                                            ),
                                        ]
                                    ),
                                    contactDetailView(model, h, options),
                                ]
                            ),
                        ]
                    ),
                    h.keyed("div")(
                        model.contactsDialog._tag,
                        [],
                        [contactFormView(model, h, options)]
                    ),
                ]
            )
        }
    )

export const view = make_view()

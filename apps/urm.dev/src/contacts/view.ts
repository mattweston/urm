import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    make_view,
    ContactsDialogClosed,
    ContactsDialogCreate,
    ContactsDialogEdit,
    ContactsDialogDelete,
    type ContactsModel,
} from "@urm/features/mail/contacts"
import { Message, type Model, page, domain, boot_id } from "./model.ts"
import { google_sign_in_href } from "./path.ts"

const input_class =
    "h-10 rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
const button_class =
    "inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50 [box-shadow:var(--shadow-control)]"
const writable_view = make_view({
    server_search: true,
    can_delete: true,
    can_import: true,
    paginated: true,
    limited_fields: false,
})
const readonly_view = make_view({
    server_search: true,
    can_write: false,
    can_delete: true,
    can_import: true,
    paginated: true,
    limited_fields: false,
})
const busy_view = make_view({
    server_search: true,
    can_write: false,
    can_delete: true,
    can_import: true,
    paginated: true,
    limited_fields: false,
    busy: true,
})

const make_session_view =
    (title: string, show_contacts = true) =>
    (model: Model, h: HtmlBuilder<Message>): Html => {
        if (model.connection_id !== boot_id)
            return h.div([h.Role("status")], ["Checking your session…"])
        const button = (label: string, message: Message, disabled = false) =>
            h.button(
                [
                    h.Type("button"),
                    h.Class(button_class),
                    h.Disabled(disabled),
                    h.OnClick(message),
                ],
                [label]
            )
        const status = h.div(
            [h.Class("px-4 lg:px-6")],
            [
                ...(model.error
                    ? [
                          h.p(
                              [
                                  h.Role("alert"),
                                  h.Class(
                                      "rounded-[var(--radius-surface)] border border-destructive p-3"
                                  ),
                              ],
                              [model.error]
                          ),
                      ]
                    : []),
                h.p(
                    [
                        h.Role("status"),
                        h.AriaLive("polite"),
                        h.Class("sr-only"),
                    ],
                    [model.busy ? "Loading…" : ""]
                ),
            ]
        )
        if (model.session === null)
            return h.section(
                [h.Class("p-4 md:p-8 space-y-4")],
                [
                    h.h1(
                        [h.Class("text-3xl font-semibold tracking-tight")],
                        [title]
                    ),
                    status,
                    model.logout_pending
                        ? button(
                              "Retry sign out",
                              Message.SignedOut(),
                              model.busy
                          )
                        : h.form(
                              [
                                  h.Id("contacts-sign-in"),
                                  h.AriaLabel("Sign in"),
                                  h.OnSubmit(Message.SubmittedLogin()),
                                  h.Class("grid max-w-md gap-4"),
                              ],
                              [
                                  h.p(
                                      [
                                          h.Class(
                                              "text-sm text-muted-foreground"
                                          ),
                                      ],
                                      ["Sign in to your account."]
                                  ),
                                  h.label(
                                      [
                                          h.For("account-email"),
                                          h.Class("grid gap-2"),
                                      ],
                                      [
                                          "Email",
                                          h.input([
                                              h.Id("account-email"),
                                              h.Name("email"),
                                              h.Type("email"),
                                              h.Autocomplete("username"),
                                              h.Required(true),
                                              h.Class(input_class),
                                          ]),
                                      ]
                                  ),
                                  h.label(
                                      [
                                          h.For("account-password"),
                                          h.Class("grid gap-2"),
                                      ],
                                      [
                                          "Password",
                                          h.input([
                                              h.Id("account-password"),
                                              h.Name("password"),
                                              h.Type("password"),
                                              h.Autocomplete(
                                                  "current-password"
                                              ),
                                              h.Required(true),
                                              h.Class(input_class),
                                          ]),
                                      ]
                                  ),
                                  h.button(
                                      [
                                          h.Type("submit"),
                                          h.Class(button_class),
                                          h.Disabled(model.busy),
                                      ],
                                      ["Sign in"]
                                  ),
                                  h.a(
                                      [
                                          h.Href(google_sign_in_href()),
                                          h.Class(
                                              "text-sm text-muted-foreground underline hover:text-foreground"
                                          ),
                                      ],
                                      ["Sign in with Google"]
                                  ),
                              ]
                          ),
                ]
            )
        if (!show_contacts)
            return h.section(
                [h.Class("p-4 md:p-8 space-y-4")],
                [
                    h.h1(
                        [h.Class("text-3xl font-semibold tracking-tight")],
                        [title]
                    ),
                    status,
                    h.p(
                        [h.Role("status")],
                        [
                            model.busy
                                ? "Checking domain access…"
                                : model.domain_id === ""
                                  ? `${title} is not available for this domain. Check that your account has access to the migrated domain.`
                                  : "Loading Media…",
                        ]
                    ),
                    button("Retry", Message.Refreshed(), model.busy),
                ]
            )
        const result = page(model)
        const records = result._tag === "Ready" ? result.value.items : []
        const can_write = domain(model)?.can_write === true
        // The original view receives a projection, never a second stored collection.
        const contacts_model: ContactsModel = {
            domain_id: model.domain_id,
            contactsLoaded: result._tag === "Ready",
            contactsSearch: model.search,
            selectedContactId: records.some(
                (contact) => contact.id === model.selected_id
            )
                ? model.selected_id
                : (records[0]?.id ?? ""),
            contactsDialog:
                model.deleting_id !== null
                    ? ContactsDialogDelete({ contactId: model.deleting_id })
                    : model.creating
                      ? ContactsDialogCreate()
                      : model.editing_id !== null
                        ? ContactsDialogEdit({ contactId: model.editing_id })
                        : ContactsDialogClosed(),
            contactDraft: model.draft,
            contacts: records.map((contact) => ({
                id: contact.id,
                name: contact.name,
                email: contact.email ?? "",
                email_addresses: contact.email_addresses,
                tel: contact.tel ?? "",
                title: contact.title ?? "",
                company: contact.company ?? "",
                updatedAt: contact.updated_at,
            })),
        }
        return h.div(
            [h.Class("relative min-h-full p-4 md:p-8")],
            [
                status,
                ...(model.domain_id === ""
                    ? [
                          h.p(
                              [h.Class("p-6")],
                              [
                                  "Contacts is not available for this domain. Check that it exists in PostgreSQL and that your Contacts account has access.",
                              ]
                          ),
                      ]
                    : [
                          ...(!can_write
                              ? [
                                    h.p(
                                        [
                                            h.Class(
                                                "px-6 pt-4 text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "You have read-only access to this domain.",
                                        ]
                                    ),
                                ]
                              : []),
                          h.submodel({
                              slotId: "contacts",
                              model: contacts_model,
                              view: model.busy
                                  ? busy_view
                                  : can_write
                                    ? writable_view
                                    : readonly_view,
                              toParentMessage: (message) =>
                                  Message.ContactInteraction({ message }),
                          }),
                          h.nav(
                              [
                                  h.AriaLabel("Contacts pages"),
                                  h.Class(
                                      "flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6"
                                  ),
                              ],
                              [
                                  button(
                                      "Refresh",
                                      Message.Refreshed(),
                                      model.busy
                                  ),
                                  h.div(
                                      [h.Class("flex items-center gap-3")],
                                      [
                                          button(
                                              "Previous",
                                              Message.PreviousPage(),
                                              model.busy ||
                                                  model.history.length === 0
                                          ),
                                          h.span(
                                              [],
                                              [
                                                  `Page ${model.history.length + 1}`,
                                              ]
                                          ),
                                          button(
                                              "Next",
                                              Message.NextPage(),
                                              model.busy ||
                                                  result._tag !== "Ready" ||
                                                  !result.value.hasNext
                                          ),
                                      ]
                                  ),
                              ]
                          ),
                      ]),
            ]
        )
    }

export const view = make_session_view("Contacts")
export const account_session_view = Submodel.defineView<Model, Message>(
    make_session_view("Sign in to URM", false)
)
export const members_session_view = Submodel.defineView<Model, Message>(
    make_session_view("Members", false)
)

export const embedded_view = Submodel.defineView<Model, Message>(view)

export const media_session_view = Submodel.defineView<Model, Message>(
    make_session_view("Media", false)
)

export const tags_session_view = Submodel.defineView<Model, Message>(
    make_session_view("Tags", false)
)

export const bookmarks_session_view = Submodel.defineView<Model, Message>(
    make_session_view("Bookmarks", false)
)

export const pages_session_view = Submodel.defineView<Model, Message>(
    make_session_view("Pages", false)
)
export const publishing_session_view = Submodel.defineView<Model, Message>(
    make_session_view("Publishing", false)
)

export const design_session_view = Submodel.defineView<Model, Message>(
    make_session_view("Design", false)
)

export const events_session_view = Submodel.defineView<Model, Message>(
    make_session_view("Events", false)
)
export const domains_session_view = Submodel.defineView<Model, Message>(
    make_session_view("Domains", false)
)

export const issues_session_view = Submodel.defineView<Model, Message>(
    make_session_view("Issues", false)
)

export const projects_session_view = Submodel.defineView<Model, Message>(
    make_session_view("Projects", false)
)

export const shop_session_view = Submodel.defineView<Model, Message>(
    make_session_view("Shop", false)
)

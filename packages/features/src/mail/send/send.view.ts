import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    transactionalEmailTemplatePreviews,
    productionEmailTemplatePreviewsForTheme,
    transactionalTemplateTestEmail,
} from "@urm/email/templates"
import { publication_email_theme } from "@urm/email/publication-theme"

import {
    SendRecipientsRequested,
    SelectedSendContactChanged,
    SelectedSendModeChanged,
    SelectedSendTemplateChanged,
    SubmittedSingleEmail,
    UpdatedSingleEmail,
    type Message,
} from "./send.message.ts"
import type { Model } from "./send.model.ts"

const control_classes =
    "min-h-12 w-full rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-3 py-2.5 text-base text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"

const mode_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.fieldset(
        [h.Disabled(model.sending), h.Class("grid gap-2")],
        [
            h.legend([h.Class("text-sm font-medium")], ["Message type"]),
            h.div(
                [h.Class("grid gap-2 sm:grid-cols-2")],
                [
                    {
                        id: "send-mode-one-off",
                        value: "one_off",
                        label: "One-off message",
                        description: "Write a subject and plain-text message.",
                    },
                    {
                        id: "send-mode-template",
                        value: "template",
                        label: "Template test",
                        description:
                            "Send an exact production template with safe sample data.",
                    },
                ].map((option) =>
                    h.label(
                        [
                            h.For(option.id),
                            h.Class(
                                [
                                    "flex min-h-12 cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border p-3 transition",
                                    model.mode === option.value
                                        ? "border-primary bg-primary/10"
                                        : "border-border bg-background hover:bg-accent",
                                ].join(" ")
                            ),
                        ],
                        [
                            h.input([
                                h.Id(option.id),
                                h.Type("radio"),
                                h.Name("message_type"),
                                h.Value(option.value),
                                h.Checked(model.mode === option.value),
                                h.OnInput(() =>
                                    SelectedSendModeChanged({
                                        mode:
                                            option.value === "template"
                                                ? "template"
                                                : "one_off",
                                    })
                                ),
                                h.Class("mt-1 accent-primary"),
                            ]),
                            h.span(
                                [h.Class("grid gap-1")],
                                [
                                    h.span(
                                        [h.Class("text-sm font-medium")],
                                        [option.label]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "text-xs font-normal leading-relaxed text-muted-foreground"
                                            ),
                                        ],
                                        [option.description]
                                    ),
                                ]
                            ),
                        ]
                    )
                )
            ),
        ]
    )

const one_off_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("grid gap-5")],
        [
            h.div(
                [h.Class("grid gap-2")],
                [
                    h.label(
                        [h.For("send-subject"), h.Class("text-sm font-medium")],
                        ["Subject"]
                    ),
                    h.input([
                        h.Id("send-subject"),
                        h.Type("text"),
                        h.Name("subject"),
                        h.Required(true),
                        h.Value(model.subject),
                        h.Disabled(model.sending),
                        h.Placeholder("A short subject"),
                        h.OnInput((value) =>
                            UpdatedSingleEmail({ field: "subject", value })
                        ),
                        h.Class(control_classes),
                    ]),
                ]
            ),
            h.div(
                [h.Class("grid gap-2")],
                [
                    h.label(
                        [h.For("send-message"), h.Class("text-sm font-medium")],
                        ["Message"]
                    ),
                    h.p(
                        [
                            h.Id("send-message-help"),
                            h.Class("text-xs text-muted-foreground"),
                        ],
                        ["This mode sends plain text."]
                    ),
                    h.textarea([
                        h.Id("send-message"),
                        h.Name("message"),
                        h.Required(true),
                        h.Value(model.bodyText),
                        h.Disabled(model.sending),
                        h.AriaDescribedBy("send-message-help"),
                        h.Placeholder("Write the message to send."),
                        h.OnInput((value) =>
                            UpdatedSingleEmail({ field: "bodyText", value })
                        ),
                        h.Class(`${control_classes} min-h-64 resize-y`),
                    ]),
                ]
            ),
        ]
    )

const template_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    const template = productionEmailTemplatePreviewsForTheme(
        publication_email_theme(model.publication_theme)
    ).find(({ id }) => id === model.selectedTemplateId)
    const sample =
        template === undefined || template.id === "newsletter_basic"
            ? template?.sample
            : transactionalTemplateTestEmail(
                  template.id,
                  "person@example.com",
                  publication_email_theme(model.publication_theme),
                  model.transactional_templates.find(
                      (state) => state.template_id === template.id
                  )?.active?.copy
              )

    return h.div(
        [h.Class("grid gap-5")],
        [
            h.div(
                [h.Class("grid gap-2")],
                [
                    h.label(
                        [
                            h.For("send-template"),
                            h.Class("text-sm font-medium"),
                        ],
                        ["Production template"]
                    ),
                    h.select(
                        [
                            h.Id("send-template"),
                            h.Name("template"),
                            h.Required(true),
                            h.Value(model.selectedTemplateId),
                            h.Disabled(model.sending),
                            h.OnInput((templateId) =>
                                SelectedSendTemplateChanged({ templateId })
                            ),
                            h.Class(control_classes),
                        ],
                        transactionalEmailTemplatePreviews.map((option) =>
                            h.option(
                                [h.Key(option.id), h.Value(option.id)],
                                [option.name]
                            )
                        )
                    ),
                    h.p(
                        [h.Class("text-xs text-muted-foreground")],
                        [
                            "The server renders this template with safe sample links. Template content cannot be edited in test mode.",
                        ]
                    ),
                ]
            ),
            template === undefined
                ? h.p(
                      [h.Role("alert"), h.Class("text-sm text-destructive")],
                      ["The selected production template is unavailable."]
                  )
                : h.section(
                      [h.Class("grid gap-3")],
                      [
                          h.h2([h.Class("text-sm font-semibold")], ["Preview"]),
                          h.div(
                              [
                                  h.Class(
                                      "rounded-[var(--radius-control)] border border-border bg-background p-3"
                                  ),
                              ],
                              [
                                  h.p(
                                      [
                                          h.Class(
                                              "text-xs font-medium uppercase tracking-wider text-muted-foreground"
                                          ),
                                      ],
                                      ["Subject"]
                                  ),
                                  h.p(
                                      [h.Class("mt-1 font-medium")],
                                      [sample?.subject ?? ""]
                                  ),
                              ]
                          ),
                          h.iframe(
                              [
                                  h.Srcdoc(sample?.html ?? ""),
                                  h.Sandbox(""),
                                  h.Title(`Preview of ${template.name}`),
                                  h.Class(
                                      "h-[28rem] w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-white"
                                  ),
                              ],
                              []
                          ),
                          h.details(
                              [
                                  h.Class(
                                      "rounded-[var(--radius-control)] border border-border bg-background p-3"
                                  ),
                              ],
                              [
                                  h.summary(
                                      [
                                          h.Class(
                                              "cursor-pointer text-sm font-medium"
                                          ),
                                      ],
                                      ["Plain-text version"]
                                  ),
                                  h.pre(
                                      [
                                          h.Class(
                                              "mt-3 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground"
                                          ),
                                      ],
                                      [sample?.text ?? ""]
                                  ),
                              ]
                          ),
                      ]
                  ),
        ]
    )
}

const send_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("mx-auto grid w-full max-w-4xl gap-6")],
        [
            h.header(
                [h.Class("space-y-2")],
                [
                    h.p(
                        [
                            h.Class(
                                "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                            ),
                        ],
                        ["Transactional mail"]
                    ),
                    h.h1(
                        [h.Class("text-3xl font-semibold tracking-tight")],
                        ["Send an email"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-sm text-muted-foreground")],
                        [
                            "Send a one-off message or test a production template from the configured mail.urm.dev sender.",
                        ]
                    ),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)] md:p-6"
                    ),
                ],
                [
                    model.loading_recipients
                        ? h.div(
                              [h.Class("text-sm text-muted-foreground")],
                              ["Loading contacts…"]
                          )
                        : model.recipients.length === 0
                          ? h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-dashed border-border p-5 text-sm text-muted-foreground"
                                    ),
                                ],
                                [
                                    model.error ??
                                        "Add a contact with an email address before composing a message.",
                                    ...(model.error !== null &&
                                    model.domain_id !== ""
                                        ? [
                                              h.button(
                                                  [
                                                      h.Type("button"),
                                                      h.OnClick(
                                                          SendRecipientsRequested(
                                                              {
                                                                  domain_id:
                                                                      model.domain_id,
                                                              }
                                                          )
                                                      ),
                                                      h.Class("ml-2 underline"),
                                                  ],
                                                  ["Retry"]
                                              ),
                                          ]
                                        : []),
                                ]
                            )
                          : h.form(
                                [
                                    h.Class("grid gap-5"),
                                    h.OnSubmit(SubmittedSingleEmail()),
                                ],
                                [
                                    mode_view(model, h),
                                    h.div(
                                        [h.Class("grid gap-2")],
                                        [
                                            h.label(
                                                [
                                                    h.For("send-recipient"),
                                                    h.Class(
                                                        "text-sm font-medium"
                                                    ),
                                                ],
                                                ["Recipient"]
                                            ),
                                            h.select(
                                                [
                                                    h.Id("send-recipient"),
                                                    h.Name("recipient"),
                                                    h.Required(true),
                                                    h.Value(
                                                        model.selectedContactId
                                                    ),
                                                    h.Disabled(model.sending),
                                                    h.OnInput((contactId) =>
                                                        SelectedSendContactChanged(
                                                            { contactId }
                                                        )
                                                    ),
                                                    h.Class(control_classes),
                                                ],
                                                model.recipients.map(
                                                    (recipient) =>
                                                        h.option(
                                                            [
                                                                h.Key(
                                                                    recipient.id
                                                                ),
                                                                h.Value(
                                                                    recipient.id
                                                                ),
                                                            ],
                                                            [
                                                                `${recipient.name} — ${recipient.email}`,
                                                            ]
                                                        )
                                                )
                                            ),
                                        ]
                                    ),
                                    model.mode === "template"
                                        ? template_view(model, h)
                                        : one_off_view(model, h),
                                    h.div(
                                        [
                                            h.Class(
                                                "flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"
                                            ),
                                        ],
                                        [
                                            ...(model.mode === "template"
                                                ? [
                                                      h.p(
                                                          [
                                                              h.Class(
                                                                  "max-w-md text-xs text-muted-foreground"
                                                              ),
                                                          ],
                                                          [
                                                              "Sample links lead to urm.dev and do not perform account actions.",
                                                          ]
                                                      ),
                                                  ]
                                                : []),
                                            h.button(
                                                [
                                                    h.Type("submit"),
                                                    h.Disabled(model.sending),
                                                    h.Class(
                                                        "ml-auto inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 [box-shadow:var(--shadow-primary)]"
                                                    ),
                                                ],
                                                [
                                                    model.sending
                                                        ? "Sending…"
                                                        : model.mode ===
                                                            "template"
                                                          ? "Send template test"
                                                          : "Send email",
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                    ...(model.notice === null
                        ? []
                        : [
                              h.p(
                                  [
                                      h.Class(
                                          "mt-4 rounded-[var(--radius-control)] border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
                                      ),
                                      h.Role("status"),
                                  ],
                                  [model.notice]
                              ),
                          ]),
                    ...(model.error === null
                        ? []
                        : [
                              h.p(
                                  [
                                      h.Class(
                                          "mt-4 rounded-[var(--radius-control)] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                                      ),
                                      h.Role("alert"),
                                  ],
                                  [model.error]
                              ),
                          ]),
                ]
            ),
        ]
    )

export const view = Submodel.defineView<Model, Message>(send_view)

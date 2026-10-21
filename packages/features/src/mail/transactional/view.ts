import {
    productionEmailTemplatePreviewsForTheme,
    transactionalTemplateTestEmail,
    type TransactionalEmailTemplateId,
} from "@urm/email/templates"
import {
    publication_email_theme,
    type EmailPublicationTheme,
} from "@urm/email/publication-theme"
import type { Html, HtmlBuilder } from "foldkit/html"
import { transactionalHref } from "../platform/route.ts"
import { transactional_history_view } from "./history.view.ts"
import {
    ChangedTransactionalCopy,
    ReloadTransactionalCopy,
    SaveTransactionalCopy,
    ActivateTransactionalCopy,
    ToggledTransactionalEditing,
    type Model,
    type Message as EditorMessage,
} from "./editor.ts"

const descriptions: Record<TransactionalEmailTemplateId, string> = {
    auth_email_verification:
        "Asks the recipient to confirm their email address.",
    auth_password_reset: "Provides a time-limited link to reset a password.",
    auth_password_changed:
        "Notifies the recipient that their password has changed.",
}

const link_classes =
    "inline-flex min-h-11 items-center text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"

const inline_classes =
    "block min-h-11 w-full min-w-0 rounded border border-transparent bg-transparent px-1 py-1 text-inherit hover:border-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--email-link)] disabled:cursor-not-allowed"

export const transactional_view = <Message>(
    template_id: TransactionalEmailTemplateId | null,
    h: HtmlBuilder<Message>,
    publication_theme: EmailPublicationTheme | null,
    model: Model,
    to_message: (message: EditorMessage) => Message
): Html => {
    const theme = publication_email_theme(publication_theme)
    const templates = productionEmailTemplatePreviewsForTheme(theme).filter(
        (template) => template.id !== "newsletter_basic"
    )
    const selected = templates.find((template) => template.id === template_id)
    const editor = model.editors.find(
        (editor) => editor.template_id === template_id
    )
    const state = model.states.find(
        (state) => state.template_id === template_id
    )
    const header = h.header(
        [h.Class("grid gap-2")],
        [
            h.h1(
                [h.Class("text-3xl font-semibold tracking-tight")],
                [selected?.name ?? "Transactional emails"]
            ),
            h.p(
                [h.Class("max-w-prose text-muted-foreground")],
                [
                    "Edit URM email copy in place. Security links, expiry notices, and warnings remain protected. WorkOS-hosted authentication emails are managed separately.",
                ]
            ),
        ]
    )

    if (selected === undefined || editor === undefined)
        return h.div(
            [h.Class("mx-auto grid max-w-5xl gap-6")],
            [
                header,
                h.ul(
                    [h.Role("list"), h.Class("grid gap-4")],
                    templates.flatMap((template) =>
                        template.id === "newsletter_basic"
                            ? []
                            : [
                                  h.li(
                                      [
                                          h.Key(template.id),
                                          h.Class(
                                              "grid gap-2 rounded-[var(--radius-surface)] border border-border bg-card p-5"
                                          ),
                                      ],
                                      [
                                          h.h2(
                                              [
                                                  h.Class(
                                                      "text-xl font-semibold"
                                                  ),
                                              ],
                                              [template.name]
                                          ),
                                          h.p(
                                              [
                                                  h.Class(
                                                      "text-muted-foreground"
                                                  ),
                                              ],
                                              [descriptions[template.id]]
                                          ),
                                          h.a(
                                              [
                                                  h.Href(
                                                      transactionalHref(
                                                          template.id
                                                      )
                                                  ),
                                                  h.Class(link_classes),
                                              ],
                                              [`Open ${template.name}`]
                                          ),
                                      ]
                                  ),
                              ]
                    )
                ),
            ]
        )

    const sample = transactionalTemplateTestEmail(
        editor.template_id,
        "person@example.com",
        theme,
        editor.copy
    )
    const disabled = !model.loaded || editor.busy
    const field = (
        name: "subject" | "heading" | "introduction",
        label: string
    ): Html => {
        const id = `transactional-${name}`
        const attributes = [
            h.Id(id),
            h.Name(name),
            h.Value(editor.copy[name]),
            h.Required(true),
            h.Disabled(disabled),
            h.OnInput((value: string) =>
                to_message(
                    ChangedTransactionalCopy({
                        template_id: editor.template_id,
                        field: name,
                        value,
                    })
                )
            ),
            h.Style({ fontFamily: "inherit", color: "inherit" }),
        ]
        return h.div(
            [h.Class("min-w-0")],
            [
                h.label([h.For(id), h.Class("sr-only")], [label]),
                name === "introduction"
                    ? h.textarea([
                          ...attributes,
                          h.Rows(3),
                          h.Class(
                              `${inline_classes} resize-y [field-sizing:content] min-h-[3lh] max-h-[24rem] text-base leading-normal`
                          ),
                      ])
                    : h.input([
                          ...attributes,
                          h.Type("text"),
                          h.Class(
                              `${inline_classes} ${name === "heading" ? "text-[30px] font-bold leading-[1.1]" : "text-base"}`
                          ),
                      ]),
            ]
        )
    }
    const protected_content =
        editor.template_id === "auth_password_changed"
            ? [
                  h.p(
                      [],
                      [
                          "If this was you, no action is needed. You can ",
                          h.span(
                              [
                                  h.Style({
                                      color: theme.link_color,
                                      textDecoration: "underline",
                                  }),
                              ],
                              ["sign in here"]
                          ),
                          ".",
                      ]
                  ),
                  h.p(
                      [],
                      [
                          "If you did not change your password, contact support immediately.",
                      ]
                  ),
              ]
            : [
                  h.p(
                      [],
                      [
                          h.span(
                              [
                                  h.Style({
                                      display: "inline-block",
                                      padding: "12px 22px",
                                      border: `2px solid ${theme.border_color}`,
                                      borderRadius: `${theme.button_border_radius}px`,
                                      color: theme.primary_text_color,
                                      background: theme.primary_color,
                                      fontWeight: "700",
                                  }),
                              ],
                              [
                                  editor.template_id === "auth_password_reset"
                                      ? "Reset password"
                                      : "Verify email address",
                              ]
                          ),
                      ]
                  ),
                  h.p(
                      [],
                      [
                          `This link expires in ${editor.template_id === "auth_password_reset" ? 30 : 1440} minutes.`,
                      ]
                  ),
                  h.p(
                      [h.Style({ color: theme.muted_text_color })],
                      ["If you did not request this email, you can ignore it."]
                  ),
              ]
    const canvas = h.section(
        [
            h.AriaLabel("Transactional email editing canvas"),
            h.Class("min-w-0 rounded p-3 sm:p-6"),
            h.Style({
                "--email-link": theme.link_color,
                colorScheme:
                    publication_theme?.site_theme.appearance === "dark"
                        ? "dark"
                        : "light",
                background: theme.background_color,
                color: theme.text_color,
                fontFamily: theme.font_family,
                lineHeight: "1.5",
            }),
        ],
        [
            h.div(
                [
                    h.Class(
                        "mx-auto mb-4 grid max-w-[560px] grid-cols-[auto_minmax(0,1fr)] items-center gap-3"
                    ),
                ],
                [h.span([], ["Subject:"]), field("subject", "Subject")]
            ),
            h.article(
                [
                    h.AriaLabel("Email message"),
                    h.Class(
                        "mx-auto grid w-full min-w-0 max-w-[560px] gap-4 p-4 sm:p-8"
                    ),
                    h.Style({
                        border: `2px solid ${theme.border_color}`,
                        borderRadius: `${theme.content_border_radius}px`,
                        background: theme.content_background_color,
                    }),
                ],
                [
                    h.p(
                        [
                            h.Style({
                                color: theme.muted_text_color,
                                fontSize: "12px",
                                fontWeight: "700",
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                            }),
                        ],
                        [theme.brand_name]
                    ),
                    field("heading", "Heading"),
                    field("introduction", "Introduction"),
                    ...protected_content,
                ]
            ),
        ]
    )

    return h.div(
        [h.Class("mx-auto grid max-w-5xl gap-6")],
        [
            header,
            h.a(
                [h.Href(transactionalHref()), h.Class(link_classes)],
                ["Back to transactional emails"]
            ),
            h.form(
                [
                    h.Class("grid gap-4"),
                    h.OnSubmit(
                        to_message(
                            SaveTransactionalCopy({
                                template_id: editor.template_id,
                            })
                        )
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap items-center justify-between gap-4"
                            ),
                        ],
                        [
                            h.p(
                                [
                                    h.Class("text-sm tabular-nums"),
                                    h.Role("status"),
                                ],
                                [
                                    model.loaded
                                        ? `Saved version: ${state?.latest?.version ?? "built-in"}. Active version: ${state?.active?.version ?? "built-in"}.`
                                        : "Loading saved versions…",
                                ]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Role("switch"),
                                    h.AriaChecked(editor.editing),
                                    h.AriaLabel("Edit transactional email"),
                                    h.Disabled(disabled),
                                    h.OnClick(
                                        to_message(
                                            ToggledTransactionalEditing({
                                                template_id: editor.template_id,
                                            })
                                        )
                                    ),
                                    h.Class(
                                        "inline-flex min-h-11 items-center gap-3 rounded px-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                    ),
                                ],
                                [
                                    h.span([], ["Edit"]),
                                    h.span(
                                        [
                                            h.AriaHidden(true),
                                            h.Class(
                                                editor.editing
                                                    ? "inline-flex h-6 w-11 items-center rounded-full bg-primary p-1"
                                                    : "inline-flex h-6 w-11 items-center rounded-full bg-input p-1"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        editor.editing
                                                            ? "size-4 translate-x-5 rounded-full bg-background"
                                                            : "size-4 rounded-full bg-background"
                                                    ),
                                                ],
                                                []
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            editor.editing
                                ? "Edit the subject and message in place. Turn off Edit to check the inbox preview. Security actions and notices are locked."
                                : "Inbox preview of the current draft. Turn on Edit to change the copy.",
                        ]
                    ),
                    ...(editor.editing
                        ? [canvas]
                        : [
                              h.section(
                                  [
                                      h.AriaLabel(
                                          "Transactional email preview"
                                      ),
                                      h.Class("grid gap-3"),
                                  ],
                                  [
                                      h.p([], [`Subject: ${sample.subject}`]),
                                      h.iframe(
                                          [
                                              h.Title(
                                                  `${selected.name} email preview`
                                              ),
                                              h.Srcdoc(sample.html ?? ""),
                                              h.Sandbox(""),
                                              h.Class(
                                                  "h-[36rem] w-full rounded border border-border bg-white"
                                              ),
                                          ],
                                          []
                                      ),
                                  ]
                              ),
                              h.details(
                                  [],
                                  [
                                      h.summary(
                                          [h.Class("cursor-pointer py-2")],
                                          ["Plain text"]
                                      ),
                                      h.pre(
                                          [
                                              h.Class(
                                                  "whitespace-pre-wrap break-words rounded border border-border bg-muted p-4 text-sm"
                                              ),
                                          ],
                                          [sample.text ?? ""]
                                      ),
                                  ]
                              ),
                          ]),
                    h.div(
                        [h.Class("flex flex-wrap gap-4")],
                        [
                            h.button(
                                [
                                    h.Type("submit"),
                                    h.Class(link_classes),
                                    h.Disabled(disabled),
                                ],
                                [editor.busy ? "Working…" : "Save new version"]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Class(link_classes),
                                    h.Disabled(disabled),
                                    h.OnClick(
                                        to_message(
                                            ReloadTransactionalCopy({
                                                template_id: editor.template_id,
                                            })
                                        )
                                    ),
                                ],
                                ["Discard edits / reload saved"]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Class(link_classes),
                                    h.Disabled(
                                        disabled ||
                                            editor.dirty ||
                                            editor.base_version === 0 ||
                                            state?.active?.version ===
                                                editor.base_version
                                    ),
                                    h.OnClick(
                                        to_message(
                                            ActivateTransactionalCopy({
                                                template_id: editor.template_id,
                                            })
                                        )
                                    ),
                                ],
                                ["Activate saved version"]
                            ),
                        ]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "Saving does not change outgoing emails. Activation applies the saved version to future URM template sends. Save any edits before activating.",
                        ]
                    ),
                    ...(editor.error === ""
                        ? []
                        : [h.p([h.Role("alert")], [editor.error])]),
                ]
            ),
            transactional_history_view(
                editor,
                state,
                model.loaded,
                h,
                to_message
            ),
        ]
    )
}

import { Match as M, Option, Schema as S, String } from "effect"
import { Command, Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

import {
    ChatAdmin,
    ChatMessage,
    type ChatAdmin as StoredChatAdmin,
} from "@urm/domain/chat"
type DomainId = string
import { IconSend } from "@urm/ui/foldkit/icons/view.ts"

export const Model = S.Struct({
    can_send: S.Boolean,
    status: S.String,
    messages: S.Array(ChatMessage),
    admins: S.Array(ChatAdmin),
    mentioned_admin_ids: S.Array(ChatAdmin.fields.user_id),
    draft: S.String,
    sending: S.Boolean,
    maybe_error: S.Option(S.String),
})
export type Model = typeof Model.Type

export const ReceivedChatMessages = taggedStruct("ReceivedChatMessages", {
    messages: S.Array(ChatMessage),
})
export const ReceivedMentionableAdmins = taggedStruct(
    "ReceivedMentionableAdmins",
    {
        admins: S.Array(ChatAdmin),
    }
)
export const ChangedChatDraft = taggedStruct("ChangedChatDraft", {
    value: S.String,
})
export const ChangedAdminMentionSelection = taggedStruct(
    "ChangedAdminMentionSelection",
    {
        value: S.String,
    }
)
export const ClickedTagUrmbot = taggedStruct("ClickedTagUrmbot")
export const SubmittedChatMessage = taggedStruct("SubmittedChatMessage")
export const SucceededSendChatMessage = taggedStruct("SucceededSendChatMessage")
export const FailedChat = taggedStruct("FailedChat", { details: S.String })

export const Message = S.Union([
    ReceivedChatMessages,
    ReceivedMentionableAdmins,
    ChangedChatDraft,
    ChangedAdminMentionSelection,
    ClickedTagUrmbot,
    SubmittedChatMessage,
    SucceededSendChatMessage,
    FailedChat,
])
export type Message = typeof Message.Type

type Commands = ReadonlyArray<Command.Command<Message>>
export type UpdateReturn = readonly [Model, Commands]

export const init = (): Model =>
    Model.make({
        can_send: false,
        status: "Loading chat",
        messages: [],
        admins: [],
        mentioned_admin_ids: [],
        draft: "",
        sending: false,
        maybe_error: Option.none(),
    })

const tag_urmbot = (draft: string): string =>
    /(^|\s)@urmbot\b/i.test(draft)
        ? draft
        : `${String.trimEnd(draft)}${String.isEmpty(String.trim(draft)) ? "" : " "}@urmbot `

const admin_mention = (admin: StoredChatAdmin): string => `@${admin.name}`

const draft_has_admin_mention = (
    draft: string,
    admin: StoredChatAdmin
): boolean => draft.includes(admin_mention(admin))

export const update = (
    model: Model,
    message: Message,
    active_domain_id: Option.Option<DomainId>
): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ReceivedChatMessages: ({ messages }) => [
                modifyFields(model, {
                    messages: () => messages,
                    maybe_error: () => Option.none(),
                }),
                [],
            ],
            ReceivedMentionableAdmins: ({ admins }) => [
                modifyFields(model, {
                    admins: () => admins,
                    mentioned_admin_ids: (ids) =>
                        ids.filter((id) =>
                            admins.some((admin) => admin.user_id === id)
                        ),
                }),
                [],
            ],
            ChangedChatDraft: ({ value }) => [
                modifyFields(model, {
                    draft: () => value,
                    mentioned_admin_ids: (ids) =>
                        ids.filter((id) => {
                            const admin = model.admins.find(
                                (item) => item.user_id === id
                            )
                            return (
                                admin !== undefined &&
                                draft_has_admin_mention(value, admin)
                            )
                        }),
                }),
                [],
            ],
            ChangedAdminMentionSelection: ({ value }) =>
                Option.match(
                    S.decodeUnknownOption(ChatAdmin.fields.user_id)(value),
                    {
                        onNone: () => [model, []],
                        onSome: (user_id) => {
                            const admin = model.admins.find(
                                (item) => item.user_id === user_id
                            )
                            if (admin === undefined) return [model, []]

                            return [
                                modifyFields(model, {
                                    draft: (draft) =>
                                        draft_has_admin_mention(draft, admin)
                                            ? draft
                                            : `${String.trimEnd(draft)}${String.isEmpty(String.trim(draft)) ? "" : " "}${admin_mention(admin)} `,
                                    mentioned_admin_ids: (ids) =>
                                        ids.includes(user_id)
                                            ? ids
                                            : [...ids, user_id],
                                }),
                                [],
                            ]
                        },
                    }
                ),
            ClickedTagUrmbot: () => [modifyFields(model, { draft: tag_urmbot }), []],
            SubmittedChatMessage: () => {
                const body = String.trim(model.draft)
                if (
                    Option.isNone(active_domain_id) ||
                    !model.can_send ||
                    model.sending ||
                    String.isEmpty(body) ||
                    body.length > 4_000
                ) {
                    return [model, []]
                }
                // The parent submodel owns sending; this only marks the draft
                // in flight so the parent can issue the command.
                return [
                    modifyFields(model, {
                        sending: () => true,
                        maybe_error: () => Option.none(),
                    }),
                    [],
                ]
            },
            SucceededSendChatMessage: () => [
                modifyFields(model, {
                    draft: () => "",
                    mentioned_admin_ids: () => [],
                    sending: () => false,
                    maybe_error: () => Option.none(),
                }),
                [],
            ],
            FailedChat: ({ details }) => [
                modifyFields(model, {
                    sending: () => false,
                    maybe_error: () => Option.some(details),
                }),
                [],
            ],
        })
    )

const message_time = (created_at: number): string =>
    new Date(created_at).toISOString().slice(11, 16)

const message_view = (message: ChatMessage, h: HtmlBuilder<Message>): Html => {
    const tagged_urmbot = message.mentions.includes("urmbot")
    return h.li(
        [h.Class("mx-auto w-full max-w-[28rem]")],
        [
            h.article(
                [h.Class("grid min-w-0 grid-cols-2 px-4")],
                [
                    h.header(
                        [
                            h.Class(
                                "col-span-2 flex min-w-0 items-baseline gap-2"
                            ),
                        ],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "min-w-0 truncate text-sm font-medium"
                                    ),
                                ],
                                [message.author_name]
                            ),
                            h.time(
                                [
                                    h.Attribute(
                                        "datetime",
                                        new Date(
                                            message.created_at
                                        ).toISOString()
                                    ),
                                    h.Class(
                                        "shrink-0 text-xs text-muted-foreground"
                                    ),
                                ],
                                [`${message_time(message.created_at)} UTC`]
                            ),
                        ]
                    ),
                    h.p(
                        [
                            h.Class(
                                "col-span-2 mt-2 w-fit max-w-full justify-self-start whitespace-pre-wrap break-words rounded-2xl rounded-bl-none border border-border bg-card px-5 py-4 leading-relaxed [box-shadow:var(--shadow-surface)]"
                            ),
                        ],
                        [message.body]
                    ),
                    ...(tagged_urmbot
                        ? [
                              h.p(
                                  [
                                      h.Class(
                                          "col-span-2 mt-2 inline-flex w-fit rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                                      ),
                                  ],
                                  ["URMbot tagged"]
                              ),
                          ]
                        : []),
                ]
            ),
        ]
    )
}

const chat_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.section(
        [
            h.Class(
                "grid h-[calc(100dvh-4rem)] min-h-0 w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-muted/40 text-foreground"
            ),
        ],
        [
            h.header(
                [
                    h.Class(
                        "relative z-10 grid min-h-[4.75rem] place-content-center gap-1 rounded-b-[2.5rem] bg-primary px-6 py-3 text-center text-primary-foreground [box-shadow:var(--shadow-primary)]"
                    ),
                ],
                [
                    h.h1(
                        [h.Class("text-lg font-medium tracking-tight")],
                        ["Admin chat"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "flex items-center justify-center gap-2 text-sm text-primary-foreground/85"
                            ),
                        ],
                        [
                            h.span([
                                h.Attribute("aria-hidden", "true"),
                                h.Class(
                                    model.can_send
                                        ? "inline-block size-2 rounded-full bg-emerald-300"
                                        : "inline-block size-2 rounded-full bg-current"
                                ),
                            ]),
                            model.status,
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "min-h-0 overflow-y-auto overscroll-contain px-2 py-6 [scrollbar-gutter:stable]"
                    ),
                ],
                [
                    Option.match(model.maybe_error, {
                        onNone: () => h.empty,
                        onSome: (error) =>
                            h.p(
                                [
                                    h.Role("alert"),
                                    h.Class(
                                        "mx-auto mb-4 max-w-[28rem] rounded-[var(--radius-surface)] border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                                    ),
                                ],
                                [error]
                            ),
                    }),
                    model.messages.length === 0
                        ? h.div(
                              [
                                  h.Class(
                                      "mx-auto grid min-h-full max-w-[28rem] place-content-center px-8 text-center text-sm text-muted-foreground"
                                  ),
                              ],
                              ["No messages yet. Start the admin conversation."]
                          )
                        : h.ol(
                              [
                                  h.AriaLabel("Admin chat messages"),
                                  h.Class("grid gap-6"),
                              ],
                              model.messages.map((message) =>
                                  message_view(message, h)
                              )
                          ),
                ]
            ),
            h.form(
                [
                    h.OnSubmit(SubmittedChatMessage()),
                    h.Class(
                        "relative z-10 m-2 flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-card/90 p-3 backdrop-blur-xl [box-shadow:var(--shadow-overlay)]"
                    ),
                ],
                [
                    h.label(
                        [h.For("admin-chat-message"), h.Class("sr-only")],
                        ["Message"]
                    ),
                    h.p(
                        [h.Id("admin-chat-help"), h.Class("sr-only")],
                        [
                            "Only workspace administrators can read or send messages. Tagging URMbot is recorded now; AI replies are the next implementation stage.",
                        ]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Disabled(!model.can_send || model.sending),
                            h.OnClick(ClickedTagUrmbot()),
                            h.Class(
                                "min-h-11 shrink-0 rounded-xl border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                            ),
                        ],
                        ["@urmbot"]
                    ),
                    ...(model.admins.length === 0
                        ? []
                        : [
                              h.select(
                                  [
                                      h.AriaLabel("Tag another administrator"),
                                      h.Value(""),
                                      h.Disabled(
                                          !model.can_send || model.sending
                                      ),
                                      h.OnChange((value) =>
                                          ChangedAdminMentionSelection({
                                              value,
                                          })
                                      ),
                                      h.Class(
                                          "min-h-11 max-w-40 shrink-0 rounded-xl border border-border bg-background px-3 text-sm font-medium text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                      ),
                                  ],
                                  [
                                      h.option(
                                          [h.Value(""), h.Disabled(true)],
                                          ["Tag admin…"]
                                      ),
                                      ...model.admins.map((admin) =>
                                          h.option(
                                              [h.Value(admin.user_id)],
                                              [admin.name]
                                          )
                                      ),
                                  ]
                              ),
                          ]),
                    h.input([
                        h.Id("admin-chat-message"),
                        h.Name("message"),
                        h.Type("text"),
                        h.Required(true),
                        h.Maxlength(4_000),
                        h.Disabled(!model.can_send || model.sending),
                        h.Placeholder("Write a message…"),
                        h.Attribute("aria-describedby", "admin-chat-help"),
                        h.Value(model.draft),
                        h.OnInput((value) => ChangedChatDraft({ value })),
                        h.Class(
                            "min-h-12 min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        ),
                    ]),
                    h.button(
                        [
                            h.Type("submit"),
                            h.AriaLabel(
                                model.sending
                                    ? "Sending message"
                                    : "Send message"
                            ),
                            h.Disabled(
                                !model.can_send ||
                                    model.sending ||
                                    String.isEmpty(String.trim(model.draft))
                            ),
                            h.Class(
                                "grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                            ),
                        ],
                        [IconSend({ class: "size-6" })]
                    ),
                ]
            ),
        ]
    )

export const view = Submodel.defineView<Model, Message>(chat_view)

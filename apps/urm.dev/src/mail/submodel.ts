import { Array, Effect, Option, Schema as S } from "effect"
import { Command, File, Navigation } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Url } from "foldkit/url"

import type {
    Contact as StoredContact,
    ContactEmailAddress as StoredEmailAddress,
    EmailDelivery as StoredEmailDelivery,
    EmailNewsletterDraft as StoredNewsletterDraft,
    EmailNewsletterSend as StoredNewsletterSend,
    EmailSubscriptionBundle as StoredSubscriptionBundle,
    Member as StoredMember,
} from "./compat-records.ts"
import * as Contacts from "@urm/features/mail/contacts"
import * as Members from "@urm/features/mail/members"
import * as MembersManage from "@urm/features/mail/members/manage"
import * as Newsletter from "@urm/features/mail/newsletter"
import * as Send from "@urm/features/mail/send"
import { ContactSummary, DomainContacts } from "@urm/contracts/contacts"
import { Data as ContactsData } from "../contacts/remote.ts"
import * as Sent from "@urm/features/mail/sent"
import * as Stats from "@urm/features/mail/stats"
import * as Subscriptions from "@urm/features/mail/subscriptions"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import { defineMessageUnion } from "foldkit/message"
import {
    SetSubscription,
    SubscriptionCatalog,
    SubscriptionSummary,
} from "@urm/contracts/mail"
import {
    ChangeTransactionalCopy,
    DeleteNewsletterDraft,
    NewsletterCatalog,
    NewsletterSummary,
    SaveNewsletterDraft,
    SaveNewsletterTemplate,
    SendNewsletter,
    SendTransactionalEmail,
    TransactionalCatalog,
    TransactionalSummary,
} from "@urm/contracts/mail"
import {
    SendTransactionalInput,
    TransactionalTemplateId as TransactionalTemplateIdSchema,
    TransactionalWriteError,
    transactional_catalog_id,
} from "@urm/domain/mail-transactional"
import {
    SaveNewsletterDraftInput,
    SendNewsletterInput,
    NewsletterWriteError,
    newsletter_catalog_id,
    type NewsletterDraft as StoredNewsletterDraft2,
    type NewsletterSend as StoredNewsletterSend2,
} from "@urm/domain/mail-newsletter"
import { SaveNewsletterTemplateInput } from "@urm/domain/mail-templates"
import {
    DEFAULT_LIST_KEY,
    subscription_catalog_id,
    subscription_list_key,
    type Subscription as StoredSubscription,
} from "@urm/domain/mail-subscriptions"
import { ContactsApi } from "../contacts/api.ts"
import {
    FailedUploadImage,
    ResolvedRichTextImageUrls,
    RichTextEditorMessage,
    UploadedImage,
} from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import * as Mail from "@urm/features/mail/submodel"
import * as Transactional from "@urm/features/mail/transactional"
import { type TransactionalTemplateState } from "@urm/email/transactional-content"
import * as Content from "@urm/features/content"
import type { LinkSuggestion } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import {
    ContentTemplateDescription,
    ContentTemplateName,
    ContentTemplateSource,
    ContentTemplateTags,
} from "@urm/domain/schemas/content-templates"

export const Model = Mail.Model
export type Model = Mail.ModelType
export const Message = Mail.Message
export type Message = Mail.MessageType
export const subscriptions = Mail.subscriptions
export const loaded_publication_email_theme = Mail.LoadedPublicationEmailTheme
export const loaded_transactional_templates = (
    states: ReadonlyArray<TransactionalTemplateState>
): Message =>
    Mail.GotTransactionalMessage({
        message: Transactional.LoadedTransactionalTemplates({ states }),
    })

type Commands = ReadonlyArray<Command.Command<Message, never, ContactsApi>>
export type UpdateReturn = readonly [Model, Commands]

const NavigateArgs = S.Struct({ href: S.String })
const LoadSubscriptionsArgs = S.Struct({ listKey: S.String })
const SetSubscriptionStatusArgs = S.Struct({
    contact_id: S.String,
    listKey: S.String,
    status: Subscriptions.EmailSubscriptionStatus,
})
const SaveNewsletterDraftArgs = S.Struct({
    draftId: S.NullOr(S.String),
    expected_updated_at: S.Number,
    draft: Newsletter.NewsletterDraft,
    template_source: S.NullOr(ContentTemplateSource),
})
const SaveNewsletterTemplateArgs = S.Struct({
    name: ContentTemplateName,
    description: ContentTemplateDescription,
    tags: ContentTemplateTags,
    subject: S.String,
    headline: S.String,
    body_text: S.String,
    cta_url: S.NullOr(S.String),
    cta_label: S.NullOr(S.String),
})
const DeleteNewsletterDraftArgs = S.Struct({ draftId: S.String })
const SendNewsletterTestArgs = S.Struct({
    draftId: S.String,
    email: S.String,
    name: S.String,
})
const SendNewsletterSubscribersArgs = S.Struct({ draftId: S.String })
const SendSingleEmailArgs = S.Struct({
    contactId: S.String,
    templateId: S.NullOr(S.String),
    subject: S.NullOr(S.String),
    bodyText: S.NullOr(S.String),
})
type ContactBundle = Readonly<{
    contact: StoredContact
    email_addresses: ReadonlyArray<StoredEmailAddress>
}>

const optional_text = (value: string): string | null => {
    const trimmed = value.trim()

    return trimmed === "" ? null : trimmed
}

const to_feature_contact = ({
    contact,
    email_addresses,
}: ContactBundle): Contacts.ContactType => {
    const primary_email =
        email_addresses.find(({ is_primary }) => is_primary)?.email ??
        email_addresses[0]?.email ??
        ""

    return {
        id: contact._id,
        name: contact.name,
        email: primary_email,
        email_addresses: email_addresses.map(({ _id, email, is_primary }) => ({
            id: _id,
            email,
            is_primary,
        })),
        tel: contact.tel ?? "",
        title: contact.title ?? "",
        company: contact.company ?? "",
        updatedAt: contact.updated_at,
    }
}

const to_feature_member = (member: StoredMember): Members.MemberType => ({
    id: member._id,
    first: member.first,
    last: member.last,
    twitter: member.twitter ?? "",
    avatar: member.avatar ?? "",
    notes: member.notes ?? "",
    updated_at: member.updated_at,
})

const SubscriptionsCache = Surface.application({
    Model: S.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
const SubscriptionsData = Remote.make({
    model: SubscriptionsCache.model.remote,
    entities: [SubscriptionCatalog, NewsletterCatalog, TransactionalCatalog],
    mutations: [
        SetSubscription,
        SaveNewsletterDraft,
        DeleteNewsletterDraft,
        SendNewsletter,
        ChangeTransactionalCopy,
        SendTransactionalEmail,
    ],
})
const send_contacts_page = (domain_id: string, after: string | null) =>
    ContactsData.query(
        DomainContacts,
        { domain_id, search: "" },
        {
            select: ContactSummary,
            first: 100,
            ...(after === null ? {} : { after }),
        }
    )

const LoadMailSendRecipients = Command.define("LoadMailSendRecipients", {
    args: { domain_id: S.String },
    messages: [Mail.Message],
    execute: ({ domain_id }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const recipients: Array<Send.SendRecipientType> = []
            let after: string | null = null
            for (;;) {
                const query = send_contacts_page(domain_id, after)
                const loaded = yield* ContactsData.prefetch(
                    { remote: Remote.initial },
                    query
                ).pipe(Effect.provide(api.remote(domain_id)))
                const page = query.read(loaded)
                if (page._tag !== "Ready")
                    return yield* Effect.fail(
                        new TransactionalWriteError({
                            message: "Contacts could not be loaded.",
                        })
                    )
                recipients.push(
                    ...page.value.items.flatMap(({ contact_id, name, email }) =>
                        email === null || email.trim() === ""
                            ? []
                            : [{ id: contact_id, name, email }]
                    )
                )
                const next = ContactsData.next(loaded, query)?.window.after
                if (next === undefined) break
                after = next
            }
            return Mail.GotSendMessage({
                message: Send.SendRecipientsLoaded({
                    domain_id,
                    recipients,
                }),
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Mail.GotSendMessage({
                        message: Send.SendRecipientsFailed({
                            domain_id,
                            error: transport_reason(error),
                        }),
                    })
                )
            )
        ),
})
const subscription_query = (domain_id: string, list_key: string) =>
    SubscriptionsData.get(
        SubscriptionSummary,
        subscription_catalog_id(domain_id, list_key)
    )
const from_stored_subscription = (
    subscription: StoredSubscription
): Subscriptions.EmailSubscriptionType => ({
    contact_id: subscription.contact_id,
    name: subscription.name,
    email: subscription.email,
    list_key: subscription.list_key,
    status: subscription.status,
    ...(subscription.source === null ? {} : { source: subscription.source }),
    ...(subscription.subscribed_at === null
        ? {}
        : { subscribed_at: subscription.subscribed_at }),
    ...(subscription.unsubscribed_at === null
        ? {}
        : { unsubscribed_at: subscription.unsubscribed_at }),
})
const subscriptions_loaded = (
    subscriptions: ReadonlyArray<StoredSubscription>
): Message =>
    Mail.GotSubscriptionsMessage({
        message: Subscriptions.SubscriptionsLoaded({
            subscriptions: subscriptions.map(from_stored_subscription),
        }),
    })
// The server's own message says whether this was access, an unknown workspace
// or an unavailable list; a fixed string here would hide all three.
const transport_reason = (error: unknown): string =>
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message !== ""
        ? error.message
        : "Subscribers are unavailable."

const subscriptions_failed = (action: "load" | "set", error: string): Message =>
    Mail.GotSubscriptionsMessage({
        message: Subscriptions.SubscriptionsActionFailed({ action, error }),
    })
const LoadMailSubscriptions = Command.define("LoadMailSubscriptions", {
    args: { domain_id: S.String, list_key: S.String },
    messages: [Mail.Message],
    execute: ({ domain_id, list_key }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const query = subscription_query(domain_id, list_key)
            const result = yield* SubscriptionsData.prefetch(
                { remote: Remote.initial },
                query
            ).pipe(Effect.provide(api.remote(domain_id)))
            const catalog = query.read(result)
            return catalog._tag === "Ready" && catalog.value !== undefined
                ? subscriptions_loaded(catalog.value.subscriptions)
                : subscriptions_failed(
                      "load",
                      "Subscribers could not be loaded."
                  )
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    subscriptions_failed("load", transport_reason(error))
                )
            )
        ),
})
const SetMailSubscriptionStatus = Command.define("SetMailSubscriptionStatus", {
    args: {
        domain_id: S.String,
        contact_id: S.String,
        list_key: S.String,
        status: S.Literals(["subscribed", "unsubscribed"]),
    },
    messages: [Mail.Message],
    execute: ({ domain_id, contact_id, list_key, status }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const result = yield* Remote.mutate(
                SetSubscription,
                {
                    domain_id,
                    subscription: { contact_id, list_key, status },
                },
                `${domain_id}/${list_key}/${contact_id}/${status}`
            ).pipe(Effect.provide(api.remote(domain_id)))
            return subscriptions_loaded(result.output.subscriptions)
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    subscriptions_failed("set", transport_reason(error))
                )
            )
        ),
})

const SaveMailNewsletterTemplate = Command.define(
    "SaveMailNewsletterTemplate",
    {
        args: {
            domain_id: S.String,
            template: SaveNewsletterTemplateInput,
        },
        messages: [Mail.Message],
        execute: ({ domain_id, template }) =>
            Effect.gen(function* () {
                const api = yield* ContactsApi
                yield* Remote.mutate(
                    SaveNewsletterTemplate,
                    { domain_id, template },
                    `${domain_id}/${template.id}/${template.expected_revision}`
                ).pipe(Effect.provide(api.remote(domain_id)))
                return Mail.GotNewsletterMessage({
                    message: Newsletter.NewsletterTemplateSaved(),
                })
            }).pipe(
                Effect.catch((error) =>
                    Effect.succeed(
                        Mail.GotNewsletterMessage({
                            message: Newsletter.NewsletterTemplateSaveFailed({
                                error: transport_reason(error),
                            }),
                        })
                    )
                )
            ),
    }
)

const newsletter_query = (domain_id: string, list_key: string) =>
    SubscriptionsData.get(
        NewsletterSummary,
        newsletter_catalog_id(domain_id, subscription_list_key(list_key))
    )
const from_stored_draft = (
    draft: StoredNewsletterDraft2
): Newsletter.SavedNewsletterDraftType => ({
    id: draft.id,
    name: draft.name,
    subject: draft.subject,
    headline: draft.headline,
    body_text: draft.body_text,
    cta_url: draft.cta_url ?? "",
    cta_label: draft.cta_label ?? "",
    list_key: draft.list_key,
    template_source: draft.template_source,
    updated_at: draft.updated_at,
})
const from_stored_send = (
    send: StoredNewsletterSend2
): Newsletter.NewsletterSendSummaryType => ({
    id: send.id,
    audience: send.audience,
    status: send.status,
    approved_contact_count: send.approved_contact_count,
    accepted_count: send.accepted_count,
    queued_count: send.queued_count,
    sent_count: send.sent_count,
    failed_count: send.failed_count,
    skipped_count: send.skipped_count,
    authoring_template_source: send.authoring_template_source,
    delivery_template_source: send.delivery_template_source,
    created_at: send.created_at,
    completed_at: send.completed_at,
})
const newsletter_failed = (
    action: "load" | "save" | "delete" | "recipients" | "sends",
    error: unknown
): Message =>
    Mail.GotNewsletterMessage({
        message: Newsletter.NewsletterDraftActionFailed({
            action,
            error: transport_reason(error),
        }),
    })

// One command per slice of the catalog, mirroring the three reactive queries
// the retained shell used. A Command yields a single message, so drafts, sends
// and recipients cannot be delivered from one fetch.
const read_newsletter = (domain_id: string, list_key: string) =>
    Effect.gen(function* () {
        const api = yield* ContactsApi
        const query = newsletter_query(domain_id, list_key)
        const result = yield* SubscriptionsData.prefetch(
            { remote: Remote.initial },
            query
        ).pipe(Effect.provide(api.remote(domain_id)))
        const catalog = query.read(result)
        if (catalog._tag !== "Ready" || catalog.value === undefined)
            return yield* Effect.fail(
                new NewsletterWriteError({
                    message: "Newsletters could not be loaded.",
                })
            )
        return catalog.value
    })

const LoadMailNewsletterDrafts = Command.define("LoadMailNewsletterDrafts", {
    args: { domain_id: S.String, list_key: S.String },
    messages: [Mail.Message],
    execute: ({ domain_id, list_key }) =>
        read_newsletter(domain_id, list_key).pipe(
            Effect.map((catalog) =>
                Mail.GotNewsletterMessage({
                    message: Newsletter.NewsletterDraftsLoaded({
                        drafts: catalog.drafts.map(from_stored_draft),
                    }),
                })
            ),
            Effect.catch((error) =>
                Effect.succeed(newsletter_failed("load", error))
            )
        ),
})
const LoadMailNewsletterSends = Command.define("LoadMailNewsletterSends", {
    args: { domain_id: S.String, list_key: S.String },
    messages: [Mail.Message],
    execute: ({ domain_id, list_key }) =>
        read_newsletter(domain_id, list_key).pipe(
            Effect.map((catalog) =>
                Mail.GotNewsletterMessage({
                    message: Newsletter.NewsletterSendsLoaded({
                        sends: catalog.sends.map(from_stored_send),
                    }),
                })
            ),
            Effect.catch((error) =>
                Effect.succeed(newsletter_failed("sends", error))
            )
        ),
})
const LoadMailNewsletterRecipients = Command.define(
    "LoadMailNewsletterRecipients",
    {
        args: { domain_id: S.String, list_key: S.String },
        messages: [Mail.Message],
        execute: ({ domain_id, list_key }) =>
            read_newsletter(domain_id, list_key).pipe(
                Effect.map((catalog) =>
                    Mail.GotNewsletterMessage({
                        message: Newsletter.NewsletterRecipientsLoaded({
                            recipients: catalog.recipients.map((recipient) => ({
                                contact_id: recipient.contact_id,
                                name: recipient.name,
                                email: recipient.email,
                            })),
                        }),
                    })
                ),
                Effect.catch((error) =>
                    Effect.succeed(newsletter_failed("recipients", error))
                )
            ),
    }
)

const SaveMailNewsletterDraft = Command.define("SaveMailNewsletterDraft", {
    args: { domain_id: S.String, draft: SaveNewsletterDraftInput },
    messages: [Mail.Message],
    execute: ({ domain_id, draft }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const result = yield* Remote.mutate(
                SaveNewsletterDraft,
                { domain_id, draft },
                `${domain_id}/${draft.id}/${draft.expected_updated_at}`
            ).pipe(Effect.provide(api.remote(domain_id)))
            const saved = result.output.drafts.find(
                (one) => one.id === draft.id
            )
            return saved === undefined
                ? newsletter_failed(
                      "save",
                      new NewsletterWriteError({
                          message: "The draft was not saved.",
                      })
                  )
                : Mail.GotNewsletterMessage({
                      message: Newsletter.NewsletterDraftSaved({
                          draft: from_stored_draft(saved),
                      }),
                  })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(newsletter_failed("save", error))
            )
        ),
})
const DeleteMailNewsletterDraft = Command.define("DeleteMailNewsletterDraft", {
    args: { domain_id: S.String, draft_id: S.String },
    messages: [Mail.Message],
    execute: ({ domain_id, draft_id }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const result = yield* Remote.mutate(
                DeleteNewsletterDraft,
                { domain_id, draft_id },
                `${domain_id}/${draft_id}/delete`
            ).pipe(Effect.provide(api.remote(domain_id)))
            return Mail.GotNewsletterMessage({
                message: Newsletter.NewsletterDraftsLoaded({
                    drafts: result.output.drafts.map(from_stored_draft),
                }),
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(newsletter_failed("delete", error))
            )
        ),
})
const SendMailNewsletter = Command.define("SendMailNewsletter", {
    args: {
        domain_id: S.String,
        send: SendNewsletterInput,
    },
    messages: [Mail.Message],
    execute: ({ domain_id, send }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const result = yield* Remote.mutate(
                SendNewsletter,
                { domain_id, send },
                `${domain_id}/${send.request_id}`
            ).pipe(Effect.provide(api.remote(domain_id)))
            return Mail.GotNewsletterMessage({
                message: Newsletter.NewsletterSendsLoaded({
                    sends: result.output.sends.map(from_stored_send),
                }),
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(newsletter_failed("sends", error))
            )
        ),
})

const transactional_query = (
    domain_id: string,
    template_id: string | null,
    before_version: number | null
) =>
    SubscriptionsData.get(
        TransactionalSummary,
        `${transactional_catalog_id(domain_id)}${
            template_id === null
                ? ""
                : `/${template_id}/${before_version === null ? "" : before_version}`
        }`
    )
const read_transactional = (
    domain_id: string,
    template_id: string | null,
    before_version: number | null
) =>
    Effect.gen(function* () {
        const api = yield* ContactsApi
        const query = transactional_query(
            domain_id,
            template_id,
            before_version
        )
        const result = yield* SubscriptionsData.prefetch(
            { remote: Remote.initial },
            query
        ).pipe(Effect.provide(api.remote(domain_id)))
        const catalog = query.read(result)
        if (catalog._tag !== "Ready" || catalog.value === undefined)
            return yield* Effect.fail(
                new TransactionalWriteError({
                    message: "Transactional templates could not be loaded.",
                })
            )
        return catalog.value
    })

const LoadMailTransactionalTemplates = Command.define(
    "LoadMailTransactionalTemplates",
    {
        args: { domain_id: S.String },
        messages: [Mail.Message],
        execute: ({ domain_id }) =>
            read_transactional(domain_id, null, null).pipe(
                Effect.map((catalog) =>
                    loaded_transactional_templates(catalog.templates)
                ),
                Effect.catch((error) =>
                    Effect.succeed(
                        Mail.GotTransactionalMessage({
                            message: Transactional.FailedTransactionalCopy({
                                domain_id,
                                template_id: "auth_email_verification",
                                error: transport_reason(error),
                            }),
                        })
                    )
                )
            ),
    }
)
const LoadMailTransactionalDeliveries = Command.define(
    "LoadMailTransactionalDeliveries",
    {
        args: { domain_id: S.String },
        messages: [Mail.Message],
        execute: ({ domain_id }) =>
            read_transactional(domain_id, null, null).pipe(
                Effect.map((catalog) =>
                    Mail.GotSentMessage({
                        message: Sent.SentDeliveriesLoaded({
                            deliveries: catalog.deliveries.map((delivery) => ({
                                id: delivery.id,
                                contactId: delivery.contact_id,
                                subject: delivery.subject,
                                isTest: delivery.is_test,
                                status: delivery.status,
                                providerStatus: delivery.provider_status,
                                recipientDomain: delivery.to_domain,
                                errorMessage: delivery.error_message,
                                createdAt: delivery.created_at,
                                sentAt: delivery.sent_at,
                            })),
                        }),
                    })
                ),
                Effect.catch((error) =>
                    Effect.succeed(
                        failed_transactional_deliveries(transport_reason(error))
                    )
                )
            ),
    }
)
const LoadMailTransactionalHistory = Command.define(
    "LoadMailTransactionalHistory",
    {
        args: Transactional.HistoryArgs.fields,
        messages: [Mail.Message],
        execute: (args) =>
            read_transactional(
                args.domain_id,
                args.template_id,
                args.before_version
            ).pipe(
                Effect.map((catalog) =>
                    Mail.GotTransactionalMessage({
                        message: Transactional.LoadedTransactionalHistory({
                            ...args,
                            page: {
                                versions: catalog.history,
                                next_before_version:
                                    catalog.next_before_version,
                            },
                        }),
                    })
                ),
                Effect.catch((error) =>
                    Effect.succeed(
                        Mail.GotTransactionalMessage({
                            message: Transactional.FailedTransactionalHistory({
                                ...args,
                                error: transport_reason(error),
                            }),
                        })
                    )
                )
            ),
    }
)
const ChangeMailTransactionalCopy = Command.define(
    "ChangeMailTransactionalCopy",
    {
        args: Transactional.PersistArgs.fields,
        messages: [Mail.Message],
        execute: (args) =>
            Effect.gen(function* () {
                const api = yield* ContactsApi
                // The feature uses 0 for "no version yet"; the contract is
                // explicit about absence.
                const result = yield* Remote.mutate(
                    ChangeTransactionalCopy,
                    {
                        domain_id: args.domain_id,
                        operation: {
                            template_id: args.template_id,
                            operation: args.operation,
                            expected_version:
                                args.expected_version === 0
                                    ? null
                                    : args.expected_version,
                            expected_active_version:
                                args.expected_active_version === 0
                                    ? null
                                    : args.expected_active_version,
                            source_version:
                                args.source_version === 0
                                    ? null
                                    : args.source_version,
                            copy:
                                args.operation === "save"
                                    ? {
                                          subject: args.copy.subject.trim(),
                                          heading: args.copy.heading.trim(),
                                          introduction:
                                              args.copy.introduction.trim(),
                                      }
                                    : null,
                        },
                    },
                    `${args.domain_id}/${args.template_id}/${args.operation}/${args.expected_version}`
                ).pipe(Effect.provide(api.remote(args.domain_id)))
                const state = result.output.templates.find(
                    (one) => one.template_id === args.template_id
                )
                return state === undefined
                    ? Mail.GotTransactionalMessage({
                          message: Transactional.FailedTransactionalCopy({
                              domain_id: args.domain_id,
                              template_id: args.template_id,
                              error: "The template was not returned.",
                          }),
                      })
                    : Mail.GotTransactionalMessage({
                          message: Transactional.CompletedTransactionalCopy({
                              domain_id: args.domain_id,
                              state,
                          }),
                      })
            }).pipe(
                Effect.catch((error) =>
                    Effect.succeed(
                        Mail.GotTransactionalMessage({
                            message: Transactional.FailedTransactionalCopy({
                                domain_id: args.domain_id,
                                template_id: args.template_id,
                                error: transport_reason(error),
                            }),
                        })
                    )
                )
            ),
    }
)

const SendMailTransactional = Command.define("SendMailTransactional", {
    args: { domain_id: S.String, send: SendTransactionalInput },
    messages: [Mail.Message],
    execute: ({ domain_id, send }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const result = yield* Remote.mutate(
                SendTransactionalEmail,
                { domain_id, send },
                `${domain_id}/${send.request_id}`
            ).pipe(Effect.provide(api.remote(domain_id)))
            return Mail.GotSendMessage({
                message: Send.SingleEmailSent({ status: result.output.status }),
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Mail.GotSendMessage({
                        message: Send.SingleEmailFailed({
                            error: transport_reason(error),
                        }),
                    })
                )
            )
        ),
})

const LoadMailStats = Command.define("LoadMailStats", {
    args: { domain_id: S.String },
    messages: [Mail.Message],
    execute: ({ domain_id }) =>
        read_transactional(domain_id, null, null).pipe(
            Effect.map((catalog) =>
                Mail.GotStatsMessage({
                    message: Stats.MailStatsLoaded({
                        deliveries: catalog.deliveries.map((delivery) => ({
                            id: delivery.id,
                            purpose: delivery.purpose,
                            isTest: delivery.is_test,
                            status: delivery.status,
                            createdAt: delivery.created_at,
                        })),
                        observedAt: Date.now(),
                    }),
                })
            ),
            Effect.catch((error) =>
                Effect.succeed(failed_mail_stats(transport_reason(error)))
            )
        ),
})

/**
 * The shell issues these when the account session resolves a workspace; the
 * feature has no load command for them, as they were shell-level queries.
 */
export const load_transactional_commands = (workspace_id: string): Commands =>
    workspace_id === ""
        ? []
        : [
              LoadMailTransactionalTemplates({ domain_id: workspace_id }),
              LoadMailTransactionalDeliveries({ domain_id: workspace_id }),
              LoadMailStats({ domain_id: workspace_id }),
          ]

const mail_rich_text_message = (
    message: typeof RichTextEditorMessage.Type
): Message =>
    Mail.GotNewsletterMessage({
        message: Newsletter.GotNewsletterRichTextEditorMessage({ message }),
    })

const UploadMailRichTextImage = Command.define("UploadMailRichTextImage", {
    args: { domain_id: S.String, file: File.File },
    messages: [Mail.Message],
    execute: ({ domain_id, file }) =>
        Effect.gen(function* () {
            const api = yield* ContactsApi
            const src = yield* api.upload_image(domain_id, file, "Mail")
            return mail_rich_text_message(
                UploadedImage({
                    src,
                    alt: file.name || "Image",
                    resolved_src: src,
                })
            )
        }).pipe(
            Effect.catch(() =>
                Effect.succeed(
                    mail_rich_text_message(
                        FailedUploadImage({
                            error: "The image could not be uploaded. Check access and try again.",
                        })
                    )
                )
            )
        ),
})
const ResolveMailRichTextImages = Command.define("ResolveMailRichTextImages", {
    args: { urls: S.Array(S.String) },
    messages: [Mail.Message],
    execute: ({ urls }) =>
        Effect.succeed(
            mail_rich_text_message(
                ResolvedRichTextImageUrls({
                    images: urls.map((url) => ({ stored_url: url, url })),
                })
            )
        ),
})
const RejectMailRichTextUpload = Command.define("RejectMailRichTextUpload", {
    args: { reason: S.String },
    messages: [Mail.Message],
    execute: ({ reason }) =>
        Effect.succeed(
            mail_rich_text_message(FailedUploadImage({ error: reason }))
        ),
})

/**
 * Newsletter images upload to the private account path and render in the
 * editor from that same-origin URL. Sending publishes them to public objects
 * and rewrites the body, so recipients — who hold no session — still see them.
 */
const translate_mail_rich_text_command = (
    domain_id: string,
    command: Command.Command<Message>
): Commands | null => {
    if (
        command.name !== "UploadRichTextImage" &&
        command.name !== "ResolveRichTextImageUrls"
    )
        return null
    if (domain_id === "")
        return command.name === "UploadRichTextImage"
            ? [
                  RejectMailRichTextUpload({
                      reason: "Select a workspace before uploading an image.",
                  }),
              ]
            : []
    if (command.name === "UploadRichTextImage")
        return S.is(S.Struct({ file: File.File }))(command.args)
            ? [UploadMailRichTextImage({ domain_id, file: command.args.file })]
            : []
    return S.is(S.Struct({ urls: S.Array(S.String) }))(command.args)
        ? [ResolveMailRichTextImages({ urls: command.args.urls })]
        : []
}

const to_feature_subscription = (
    bundle: StoredSubscriptionBundle
): Subscriptions.EmailSubscriptionType => {
    const primary_email =
        bundle.email_addresses.find(({ is_primary }) => is_primary)?.email ??
        bundle.email_addresses[0]?.email ??
        ""

    return {
        contact_id: bundle.contact._id,
        name: bundle.contact.name,
        email: primary_email,
        list_key: bundle.subscription.list_key,
        status: bundle.subscription.status,
        ...(bundle.subscription.source === undefined
            ? {}
            : { source: bundle.subscription.source }),
        ...(bundle.subscription.subscribed_at === undefined
            ? {}
            : { subscribed_at: bundle.subscription.subscribed_at }),
        ...(bundle.subscription.unsubscribed_at === undefined
            ? {}
            : { unsubscribed_at: bundle.subscription.unsubscribed_at }),
    }
}

const to_feature_newsletter_draft = (
    draft: StoredNewsletterDraft
): Newsletter.SavedNewsletterDraftType => ({
    id: draft._id,
    name: draft.name,
    subject: draft.subject,
    headline: draft.headline,
    body_text: draft.body_text,
    cta_url: draft.cta_url ?? "",
    cta_label: draft.cta_label ?? "",
    list_key: draft.list_key,
    template_source: draft.template_source ?? null,
    updated_at: draft.updated_at,
})

const to_feature_newsletter_send = (
    send: StoredNewsletterSend
): Newsletter.NewsletterSendSummaryType => ({
    id: send._id,
    audience: send.audience ?? "subscribers",
    status: send.status,
    approved_contact_count: send.approved_contact_count,
    accepted_count: send.accepted_count,
    queued_count: send.queued_count,
    sent_count: send.sent_count,
    failed_count: send.failed_count,
    skipped_count: send.skipped_count,
    authoring_template_source: send.authoring_template_source ?? null,
    delivery_template_source: send.delivery_template_source ?? null,
    created_at: send.created_at,
    completed_at: send.completed_at ?? null,
})

const to_feature_transactional_delivery = (
    delivery: StoredEmailDelivery
): Sent.SentDeliveryType => ({
    id: delivery._id,
    contactId: delivery.contact_id ?? null,
    subject: delivery.subject,
    isTest: delivery.is_test ?? false,
    status: delivery.status,
    providerStatus: delivery.provider_status ?? null,
    recipientDomain: delivery.to_domain ?? null,
    errorMessage: delivery.error_message ?? null,
    createdAt: delivery.created_at,
    sentAt: delivery.sent_at ?? null,
})

const to_feature_stats_delivery = (
    delivery: StoredEmailDelivery
): Stats.StatsDeliveryType => ({
    id: delivery._id,
    purpose: delivery.purpose,
    isTest: delivery.is_test ?? false,
    status: delivery.status,
    createdAt: delivery.created_at,
})

const NavigateDesktopMail = Command.define("NavigateDesktopMail", {
    args: { href: S.String },
    messages: [Mail.Message],
    execute: ({ href }) =>
        Navigation.pushUrl(href).pipe(
            Effect.as(Mail.CompletedNavigateInternal())
        ),
})

const desktop_href = (href: string): string =>
    href.startsWith("/mail") ? href.replace(/\/$/, "") : href

/**
 * Subscriptions read and write PostgreSQL through Remote, scoped by the
 * workspace id the shell already holds.
 */
const translate_subscription_command = (
    domain_id: string,
    command: Command.Command<Message>
): Commands | null => {
    if (
        command.name !== "LoadSubscriptions" &&
        command.name !== "SetSubscriptionStatus" &&
        command.name !== "SaveNewsletterTemplate" &&
        command.name !== "LoadNewsletterDrafts" &&
        command.name !== "LoadNewsletterSends" &&
        command.name !== "LoadNewsletterRecipients" &&
        command.name !== "SaveNewsletterDraft" &&
        command.name !== "DeleteNewsletterDraft" &&
        command.name !== "SendNewsletterTest" &&
        command.name !== "SendNewsletterSubscribers" &&
        command.name !== "LoadTransactionalHistory" &&
        command.name !== "PersistTransactionalCopy" &&
        command.name !== "SendSingleEmail"
    )
        return null
    // Without a workspace the request is dropped.
    if (domain_id === "") return []
    if (command.name === "LoadNewsletterDrafts")
        return [
            LoadMailNewsletterDrafts({
                domain_id,
                list_key: DEFAULT_LIST_KEY,
            }),
        ]
    if (command.name === "LoadNewsletterSends")
        return [
            LoadMailNewsletterSends({ domain_id, list_key: DEFAULT_LIST_KEY }),
        ]
    if (command.name === "LoadNewsletterRecipients")
        return Option.match(
            S.decodeUnknownOption(S.Struct({ listKey: S.String }))(
                command.args
            ),
            {
                onNone: () => [
                    LoadMailNewsletterRecipients({
                        domain_id,
                        list_key: DEFAULT_LIST_KEY,
                    }),
                ],
                onSome: ({ listKey }) => [
                    LoadMailNewsletterRecipients({
                        domain_id,
                        list_key: subscription_list_key(listKey),
                    }),
                ],
            }
        )
    if (command.name === "SaveNewsletterDraft")
        return Option.match(
            S.decodeUnknownOption(SaveNewsletterDraftArgs)(command.args),
            {
                onNone: () => [],
                onSome: ({
                    draftId,
                    draft,
                    template_source,
                    expected_updated_at,
                }) => [
                    SaveMailNewsletterDraft({
                        domain_id,
                        draft: {
                            id: draftId ?? crypto.randomUUID(),
                            name: draft.name.trim(),
                            subject: draft.subject,
                            headline: draft.headline,
                            body_text: draft.body_text,
                            cta_url: optional_text(draft.cta_url) ?? null,
                            cta_label: optional_text(draft.cta_label) ?? null,
                            list_key: subscription_list_key(draft.list_key),
                            template_source,
                            expected_updated_at:
                                draftId === null ? 0 : expected_updated_at,
                        },
                    }),
                ],
            }
        )
    if (command.name === "DeleteNewsletterDraft")
        return Option.match(
            S.decodeUnknownOption(DeleteNewsletterDraftArgs)(command.args),
            {
                onNone: () => [],
                onSome: ({ draftId }) => [
                    DeleteMailNewsletterDraft({
                        domain_id,
                        draft_id: draftId,
                    }),
                ],
            }
        )
    if (command.name === "SendNewsletterTest")
        return Option.match(
            S.decodeUnknownOption(SendNewsletterTestArgs)(command.args),
            {
                onNone: () => [],
                onSome: ({ draftId, email, name }) => [
                    SendMailNewsletter({
                        domain_id,
                        send: {
                            draft_id: draftId,
                            request_id: crypto.randomUUID(),
                            audience: "test",
                            test_email: email,
                            test_name: name,
                        },
                    }),
                ],
            }
        )
    if (command.name === "SendNewsletterSubscribers")
        return Option.match(
            S.decodeUnknownOption(SendNewsletterSubscribersArgs)(command.args),
            {
                onNone: () => [],
                onSome: ({ draftId }) => [
                    SendMailNewsletter({
                        domain_id,
                        send: {
                            draft_id: draftId,
                            request_id: crypto.randomUUID(),
                            audience: "subscribers",
                            test_email: null,
                            test_name: null,
                        },
                    }),
                ],
            }
        )
    if (command.name === "LoadTransactionalHistory")
        return Option.match(
            S.decodeUnknownOption(Transactional.HistoryArgs)(command.args),
            {
                onNone: () => [],
                onSome: (args) => [
                    LoadMailTransactionalHistory({
                        ...args,
                        domain_id,
                    }),
                ],
            }
        )
    if (command.name === "PersistTransactionalCopy")
        return Option.match(
            S.decodeUnknownOption(Transactional.PersistArgs)(command.args),
            {
                onNone: () => [],
                onSome: (args) => [
                    ChangeMailTransactionalCopy({ ...args, domain_id }),
                ],
            }
        )
    if (command.name === "SendSingleEmail")
        return Option.match(
            S.decodeUnknownOption(SendSingleEmailArgs)(command.args),
            {
                onNone: () => [],
                onSome: ({ contactId, templateId, subject, bodyText }) => [
                    SendMailTransactional({
                        domain_id,
                        send: {
                            contact_id: contactId,
                            request_id: crypto.randomUUID(),
                            template_id: S.is(TransactionalTemplateIdSchema)(
                                templateId
                            )
                                ? templateId
                                : null,
                            subject,
                            body_text: bodyText,
                        },
                    }),
                ],
            }
        )
    if (command.name === "SaveNewsletterTemplate")
        return Option.match(
            S.decodeUnknownOption(SaveNewsletterTemplateArgs)(command.args),
            {
                onNone: () => [],
                onSome: (args) => [
                    SaveMailNewsletterTemplate({
                        domain_id,
                        template: {
                            // A new template each time, as the retained form did:
                            // the gallery saves copies rather than revising.
                            id: crypto.randomUUID(),
                            expected_revision: 0,
                            ...args,
                            tags: [...args.tags],
                        },
                    }),
                ],
            }
        )
    if (command.name === "LoadSubscriptions")
        return [
            LoadMailSubscriptions({
                domain_id,
                list_key: Option.match(
                    S.decodeUnknownOption(LoadSubscriptionsArgs)(command.args),
                    {
                        onNone: () => DEFAULT_LIST_KEY,
                        onSome: ({ listKey }) => subscription_list_key(listKey),
                    }
                ),
            }),
        ]
    return Option.match(
        S.decodeUnknownOption(SetSubscriptionStatusArgs)(command.args),
        {
            onNone: () => [],
            onSome: ({ contact_id, listKey, status }) =>
                // Suppression belongs to delivery handling, never to this form.
                status === "suppressed"
                    ? []
                    : [
                          SetMailSubscriptionStatus({
                              domain_id,
                              contact_id,
                              list_key: subscription_list_key(listKey),
                              status,
                          }),
                      ],
        }
    )
}

const translate_command = (command: Command.Command<Message>): Commands => {
    // Subscriptions, newsletter drafts, sends and templates are all served by
    // translate_subscription_command, which runs before this translation.
    // The contacts and members routes use their PostgreSQL-backed models in
    // main.ts; commands from the retained Mail submodel have no executor here.
    if (
        command.name === "CreateContact" ||
        command.name === "UpdateContact" ||
        command.name === "DeleteContact" ||
        command.name === "LoadMembers" ||
        command.name === "CreateMember" ||
        command.name === "UpdateMember" ||
        command.name === "DeleteMember" ||
        command.name === "UploadAvatar"
    )
        return []

    if (command.name !== "NavigateInternal") return [command]

    return Option.match(S.decodeUnknownOption(NavigateArgs)(command.args), {
        onNone: () => [],
        onSome: ({ href }) => [
            NavigateDesktopMail({ href: desktop_href(href) }),
        ],
    })
}

const supported_path = (pathname: string): string =>
    pathname === "/mail" ||
    pathname === "/mail/" ||
    pathname === "/mail/dashboard" ||
    pathname === "/mail/dashboard/" ||
    pathname === "/mail/contacts" ||
    pathname === "/mail/contacts/" ||
    pathname === "/mail/send" ||
    pathname === "/mail/send/" ||
    pathname === "/mail/sent" ||
    pathname === "/mail/sent/" ||
    pathname === "/mail/stats" ||
    pathname === "/mail/stats/" ||
    pathname === "/mail/members" ||
    pathname === "/mail/members/" ||
    pathname === "/mail/members/manage" ||
    pathname === "/mail/members/manage/" ||
    pathname === "/mail/newsletter" ||
    pathname === "/mail/newsletter/" ||
    pathname === "/mail/transactional" ||
    pathname.startsWith("/mail/transactional/") ||
    pathname === "/mail/subscriptions" ||
    pathname === "/mail/subscriptions/" ||
    pathname === "/mail/templates" ||
    pathname === "/mail/templates/"
        ? pathname
        : `/mail/unavailable${pathname.slice("/mail".length)}`

export const init = (pathname: string): Model =>
    Mail.init(supported_path(pathname))[0]

const is_subscriptions_path = (pathname: string): boolean =>
    pathname === "/mail/subscriptions" || pathname === "/mail/subscriptions/"

export const sync_content_location = (
    model: Model,
    pathname: string,
    search: string,
    preserve_existing = false
): Model => {
    const is_new = Content.is_content_creation_path(pathname, "email")
    const draft_id = Content.content_email_draft_id_for_path(pathname)
    if (!is_new && draft_id === null) return model
    if (
        preserve_existing &&
        draft_id !== null &&
        model.newsletter.selectedDraftId === draft_id &&
        model.newsletter.base_draft !== null
    )
        return model
    const template = is_new
        ? Newsletter.newsletter_authoring_template_for_search(search)
        : null

    return {
        ...model,
        newsletter: Newsletter.open_content_draft(
            model.newsletter,
            is_new ? null : draft_id,
            is_new || Content.is_content_edit_requested(search),
            template?.template_id ?? "email.newsletter_blank",
            template?.create()
        ),
    }
}

export const update = (
    model: Model,
    message: Message,
    /** The account session's PostgreSQL workspace id. */
    workspace_id = ""
): UpdateReturn => {
    const [next_model, commands] = Mail.update(model, message)
    const send_recipient_commands =
        message._tag === "GotSendMessage" &&
        message.message._tag === "SendRecipientsRequested" &&
        workspace_id !== "" &&
        message.message.domain_id === workspace_id
            ? [LoadMailSendRecipients({ domain_id: workspace_id })]
            : []
    const sent_refresh_commands =
        message._tag === "GotSendMessage" &&
        message.message._tag === "SingleEmailSent" &&
        workspace_id !== ""
            ? [LoadMailTransactionalDeliveries({ domain_id: workspace_id })]
            : []
    return [
        next_model,
        [
            ...send_recipient_commands,
            ...sent_refresh_commands,
            ...Array.flatMap(
                commands,
                (command) =>
                    translate_mail_rich_text_command(workspace_id, command) ??
                    translate_subscription_command(workspace_id, command) ??
                    translate_command(command)
            ),
        ],
    ]
}

export const request_send_recipients = (
    model: Model,
    workspace_id: string
): UpdateReturn =>
    update(
        model,
        Mail.GotSendMessage({
            message: Send.SendRecipientsRequested({ domain_id: workspace_id }),
        }),
        workspace_id
    )

export const changed_url = (
    model: Model,
    url: Url,
    pathname: string,
    workspace_id = ""
): UpdateReturn => {
    const [changed_model, commands] = update(
        model,
        Mail.ChangedUrl({
            url: { ...url, pathname: supported_path(pathname) },
        }),
        workspace_id
    )
    // Entering the subscriber list asks for its catalog. The legacy route was fed
    // by a reactive subscription, so the feature's own load command was
    // discarded; on PostgreSQL the route entry is the trigger.
    // Entering always reloads: the feature's own init leaves `loading` set with
    // no request in flight, so it cannot be used to tell entry from progress.
    const [loaded_model, load_commands] = is_subscriptions_path(pathname)
        ? (() => {
              const [subscriptions, subscription_commands] = Subscriptions.load(
                  changed_model.subscriptions
              )
              return [
                  { ...changed_model, subscriptions },
                  Array.flatMap(
                      Command.mapMessages(subscription_commands, (message) =>
                          Mail.GotSubscriptionsMessage({ message })
                      ),
                      (command) =>
                          translate_subscription_command(
                              workspace_id,
                              command
                          ) ?? []
                  ),
              ] as const
          })()
        : ([changed_model, []] as const)
    const [ready_model, send_commands] =
        pathname.replace(/\/$/, "") === "/mail/send"
            ? request_send_recipients(loaded_model, workspace_id)
            : ([loaded_model, []] as const)
    const page_commands =
        workspace_id === ""
            ? []
            : pathname.replace(/\/$/, "") === "/mail/sent"
              ? [LoadMailTransactionalDeliveries({ domain_id: workspace_id })]
              : pathname.replace(/\/$/, "") === "/mail/stats"
                ? [LoadMailStats({ domain_id: workspace_id })]
                : []
    return pathname.replace(/\/$/, "") === "/mail/newsletter"
        ? [
              {
                  ...ready_model,
                  newsletter: Newsletter.close_content_authoring(
                      ready_model.newsletter
                  ),
              },
              [
                  ...commands,
                  ...load_commands,
                  ...send_commands,
                  ...page_commands,
              ],
          ]
        : [
              ready_model,
              [
                  ...commands,
                  ...load_commands,
                  ...send_commands,
                  ...page_commands,
              ],
          ]
}

export const view = Mail.view

export const content_authoring_view = <ParentMessage>(
    model: Model,
    link_suggestions: ReadonlyArray<LinkSuggestion>,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>,
    media_images: ReadonlyArray<
        Readonly<{ src: string; url: string; alt: string }>
    > = [],
    preview_origin = ""
): Html =>
    h.submodel({
        slotId: "content-email-authoring",
        model: model.newsletter,
        view: Newsletter.authoring_view,
        viewInputs: { link_suggestions, media_images, preview_origin },
        toParentMessage: (message) =>
            to_parent_message(Mail.GotNewsletterMessage({ message })),
    })

export const loaded_contacts = (snapshot: {
    readonly contacts: ReadonlyArray<StoredContact>
    readonly email_addresses: ReadonlyArray<StoredEmailAddress>
}): Message =>
    Mail.GotContactsMessage({
        message: Contacts.ContactsLoaded({
            contacts: snapshot.contacts.map((contact) =>
                to_feature_contact({
                    contact,
                    email_addresses: snapshot.email_addresses.filter(
                        (email_address) =>
                            email_address.contact_id === contact._id
                    ),
                })
            ),
        }),
    })

export const loaded_members = (members: ReadonlyArray<StoredMember>): Message =>
    Mail.GotMembersMessage({
        message: Members.MembersLoaded({
            members: members.map(to_feature_member),
        }),
    })

export const loaded_subscriptions = (
    subscriptions: ReadonlyArray<StoredSubscriptionBundle>
): Message =>
    Mail.GotSubscriptionsMessage({
        message: Subscriptions.SubscriptionsLoaded({
            subscriptions: subscriptions.map(to_feature_subscription),
        }),
    })

export const loaded_newsletter_drafts = (
    drafts: ReadonlyArray<StoredNewsletterDraft>
): Message =>
    Mail.GotNewsletterMessage({
        message: Newsletter.NewsletterDraftsLoaded({
            drafts: drafts.map(to_feature_newsletter_draft),
        }),
    })

export const loaded_newsletter_recipients = (
    recipients: ReadonlyArray<StoredSubscriptionBundle>
): Message =>
    Mail.GotNewsletterMessage({
        message: Newsletter.NewsletterRecipientsLoaded({
            recipients: recipients.map((bundle) => {
                const subscription = to_feature_subscription(bundle)

                return {
                    contact_id: subscription.contact_id,
                    name: subscription.name,
                    email: subscription.email,
                }
            }),
        }),
    })

export const loaded_newsletter_sends = (
    sends: ReadonlyArray<StoredNewsletterSend>
): Message =>
    Mail.GotNewsletterMessage({
        message: Newsletter.NewsletterSendsLoaded({
            sends: sends.map(to_feature_newsletter_send),
        }),
    })

export const loaded_transactional_deliveries = (
    deliveries: ReadonlyArray<StoredEmailDelivery>
): Message =>
    Mail.GotSentMessage({
        message: Sent.SentDeliveriesLoaded({
            deliveries: deliveries.map(to_feature_transactional_delivery),
        }),
    })

export const failed_transactional_deliveries = (error: unknown): Message =>
    Mail.GotSentMessage({
        message: Sent.SentDeliveriesFailed({
            error: globalThis.String(error),
        }),
    })

export const loaded_mail_stats = (
    deliveries: ReadonlyArray<StoredEmailDelivery>
): Message =>
    Mail.GotStatsMessage({
        message: Stats.MailStatsLoaded({
            deliveries: deliveries.map(to_feature_stats_delivery),
            observedAt: Date.now(),
        }),
    })

export const failed_mail_stats = (error: unknown): Message =>
    Mail.GotStatsMessage({
        message: Stats.MailStatsFailed({
            error: globalThis.String(error),
        }),
    })

export const with_domain = (
    model: Model,
    maybe_domain_id: Option.Option<string>
): Model => {
    const domain_id = Option.getOrElse(maybe_domain_id, () => "")

    if (model.contacts.domain_id === domain_id) return model

    const [members] = Members.init()
    const [membersManage] = MembersManage.initDeferred()
    const [subscriptions] = Subscriptions.initDeferred()
    const [newsletter] = Newsletter.initDeferred()
    const [send] = Send.init()
    const [sent] = Sent.init()
    const [stats] = Stats.init()

    return {
        ...model,
        transactional: Transactional.init(domain_id),
        contacts: {
            ...model.contacts,
            domain_id,
            contacts: [],
            contactsLoaded: false,
            selectedContactId: "",
        },
        members,
        membersManage,
        subscriptions,
        newsletter,
        send,
        sent,
        stats,
    }
}

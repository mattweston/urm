import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"
import {
    SetSubscriptionInput,
    Subscription,
    SubscriptionCatalogRecord,
} from "@urm/domain/mail-subscriptions"
import {
    NewsletterTemplate,
    NewsletterTemplateCatalogRecord,
    SaveNewsletterTemplateInput,
} from "@urm/domain/mail-templates"
import {
    SendTransactionalInput,
    TransactionalCatalogRecord,
    TransactionalOperationInput,
    TransactionalTemplateState,
} from "@urm/domain/mail-transactional"
import {
    NewsletterCatalogRecord,
    NewsletterDraft,
    NewsletterSend,
    PublicationEmailThemeRecord,
    SaveNewsletterDraftInput,
    SendNewsletterInput,
} from "@urm/domain/mail-newsletter"

export const SubscriptionCatalog = Entity.make(
    "SubscriptionCatalog",
    SubscriptionCatalogRecord
)
export const PublicationEmailTheme = Entity.make(
    "PublicationEmailTheme",
    PublicationEmailThemeRecord
)
export const PublicationEmailThemeQuery = Query.make(
    "PublicationEmailThemeQuery",
    {
        Input: { domain_id: Schema.String },
        Result: PublicationEmailTheme,
    }
)
export const SubscriptionSummary = SubscriptionCatalog.select({
    id: true,
    list_key: true,
    subscriptions: true,
})
export const SetSubscription = Mutation.make("SetSubscription", {
    Input: {
        domain_id: Schema.String,
        subscription: SetSubscriptionInput,
    },
    // The catalog rides the output as well as the entity patch, so a caller
    // that keeps no Remote cache still applies one round trip.
    Output: {
        contact_id: Schema.String,
        list_key: Schema.String,
        subscriptions: Schema.Array(Subscription),
    },
})

export const NewsletterTemplateCatalog = Entity.make(
    "NewsletterTemplateCatalog",
    NewsletterTemplateCatalogRecord
)
export const NewsletterTemplateSummary = NewsletterTemplateCatalog.select({
    id: true,
    templates: true,
})
export const SaveNewsletterTemplate = Mutation.make("SaveNewsletterTemplate", {
    Input: {
        domain_id: Schema.String,
        template: SaveNewsletterTemplateInput,
    },
    // The catalog rides the output as well as the entity patch, for the same
    // reason as SetSubscription: the Mail adapter keeps no Remote cache.
    Output: {
        id: Schema.String,
        templates: Schema.Array(NewsletterTemplate),
    },
})

export const NewsletterCatalog = Entity.make(
    "NewsletterCatalog",
    NewsletterCatalogRecord
)
export const NewsletterSummary = NewsletterCatalog.select({
    id: true,
    list_key: true,
    drafts: true,
    sends: true,
    recipients: true,
})
export const SaveNewsletterDraft = Mutation.make("SaveNewsletterDraft", {
    Input: {
        domain_id: Schema.String,
        draft: SaveNewsletterDraftInput,
    },
    Output: {
        id: Schema.String,
        drafts: Schema.Array(NewsletterDraft),
    },
})
export const DeleteNewsletterDraft = Mutation.make("DeleteNewsletterDraft", {
    Input: {
        domain_id: Schema.String,
        draft_id: Schema.String,
    },
    Output: {
        id: Schema.String,
        drafts: Schema.Array(NewsletterDraft),
    },
})
export const SendNewsletter = Mutation.make("SendNewsletter", {
    Input: {
        domain_id: Schema.String,
        send: SendNewsletterInput,
    },
    Output: {
        id: Schema.String,
        sends: Schema.Array(NewsletterSend),
    },
})

export const TransactionalCatalog = Entity.make(
    "TransactionalCatalog",
    TransactionalCatalogRecord
)
export const TransactionalSummary = TransactionalCatalog.select({
    id: true,
    templates: true,
    history: true,
    history_template_id: true,
    next_before_version: true,
    deliveries: true,
})
export const ChangeTransactionalCopy = Mutation.make(
    "ChangeTransactionalCopy",
    {
        Input: {
            domain_id: Schema.String,
            operation: TransactionalOperationInput,
        },
        Output: {
            template_id: Schema.String,
            templates: Schema.Array(TransactionalTemplateState),
        },
    }
)
export const SendTransactionalEmail = Mutation.make("SendTransactionalEmail", {
    Input: {
        domain_id: Schema.String,
        send: SendTransactionalInput,
    },
    Output: { id: Schema.String, status: Schema.String },
})

export const MailRemote = Remote.define({
    entities: [
        SubscriptionCatalog,
        PublicationEmailTheme,
        NewsletterTemplateCatalog,
        NewsletterCatalog,
        TransactionalCatalog,
    ],
    queries: [PublicationEmailThemeQuery],
    mutations: [
        SetSubscription,
        SaveNewsletterTemplate,
        SaveNewsletterDraft,
        DeleteNewsletterDraft,
        SendNewsletter,
        ChangeTransactionalCopy,
        SendTransactionalEmail,
    ],
})
export const SubscriptionsRemote = MailRemote

export {
    DatabaseError,
    AuthorizationError,
    EmailSubscription,
    EmailSubscriptionStatus,
    ListEmailSubscriptionsRequest,
    ListEmailSubscriptionsResponse,
    SetEmailSubscriptionRequest,
    SendSmallNewsletterRequest,
    SendSmallNewsletterResponse,
    ValidationError,
    type EmailSubscription as EmailSubscriptionType,
    EmailSubscriptionStatus as EmailSubscriptionStatusType,
    type ListEmailSubscriptionsRequest as ListEmailSubscriptionsRequestType,
    type ListEmailSubscriptionsResponse as ListEmailSubscriptionsResponseType,
    type SetEmailSubscriptionRequest as SetEmailSubscriptionRequestType,
    type SendSmallNewsletterRequest as SendSmallNewsletterRequestType,
    type SendSmallNewsletterResponse as SendSmallNewsletterResponseType,
} from "@urm/domain/schemas/email"

export {
    MailNewsletterSendRpc,
    MailSubscriptionsListRpc,
    MailSubscriptionsSetRpc,
    MailRpcs,
} from "./routes.ts"

export {
    SubscriptionCatalog,
    SubscriptionSummary,
    PublicationEmailTheme,
    PublicationEmailThemeQuery,
    SetSubscription,
    SubscriptionsRemote,
    MailRemote,
    NewsletterTemplateCatalog,
    NewsletterTemplateSummary,
    SaveNewsletterTemplate,
    NewsletterCatalog,
    NewsletterSummary,
    SaveNewsletterDraft,
    DeleteNewsletterDraft,
    SendNewsletter,
    TransactionalCatalog,
    TransactionalSummary,
    ChangeTransactionalCopy,
    SendTransactionalEmail,
} from "./remote.ts"

export { PublicationEmailThemeRecord } from "@urm/domain/mail-newsletter"

export {
    EmailSql,
    EmailSqlLive,
    EmailPersistenceError,
    type EmailSqlService,
} from "./postgres/sql.ts"
export {
    DeliveryPersistence,
    DeliveryPersistenceLive,
    createEmailDelivery,
    markEmailDeliverySent,
    markEmailDeliveryFailed,
    markEmailDeliverySkipped,
    type EmailDeliveryPurpose,
} from "./postgres/deliveries.ts"
export {
    EmailPrincipal,
    NewsletterDispatchError,
    NewsletterSendInput,
    sendNewsletter,
    dispatchNewsletterSend,
    dispatchPendingNewsletterSends,
    consumeUnsubscribeToken,
    requireEmailAccess,
} from "./postgres/newsletter.ts"
export {
    EMAIL_DELIVERY_RECOVERY_AGE_MS,
    recoverStaleEmailDeliveries,
} from "./postgres/recovery.ts"
export {
    recordCloudflareDeliveryEvent,
    reconcileCloudflareDeliveryEvents,
    type CloudflareDeliveryEvent,
} from "./postgres/provider-events.ts"
export { pollCloudflareEmailEvents } from "./cloudflare-events.ts"

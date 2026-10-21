/**
 * # Email Schema
 */

export {
    email_type,
    email_status,
    email_deliveries,
    email_subscriptions,
    email_newsletter_sends,
    email_notifications,
    email_unsubscribe_tokens,
    type EmailDelivery,
    type EmailNewsletterSend,
    type EmailNotification,
    type EmailSubscription,
    type NewEmailDelivery,
    type NewEmailNewsletterSend,
    type NewEmailNotification,
    type NewEmailSubscription,
    type EmailUnsubscribeToken,
    type NewEmailUnsubscribeToken,
} from "./email-notifications.ts"

export {
    platform_newsletter_subscriber_status,
    platform_newsletter_token_purpose,
    platform_newsletter_subscribers,
    platform_newsletter_tokens,
    platform_newsletter_sends,
    type PlatformNewsletterSubscriber,
    type NewPlatformNewsletterSubscriber,
    type PlatformNewsletterToken,
    type NewPlatformNewsletterToken,
    type PlatformNewsletterSend,
    type NewPlatformNewsletterSend,
} from "./platform-newsletter.ts"

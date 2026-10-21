/**
 * # Mail HTTP Group
 *
 * Not a group — five email-template types and a comment describing the
 * HttpApiGroup meant to replace them. Nothing imports any of it; the live mail
 * contract is the RPC group in src/mail/routes.ts.
 *
 * EmailTemplateData is the load-bearing piece: it keys template names to their
 * data shapes, so SendEmailOptions<"welcome"> requires exactly WelcomeEmailData.
 */

// an HttpApiGroup with the send endpoint, importing WelcomeEmailData, SendEmailOptions etc. from @urm/domain. The sendEmail fetch function from your current file gets dropped entirely since Effect's HTTP client handles that from the contract definition.
// # Email Client
//  Email client for sending emails from the client side

// ## Types

export interface WelcomeEmailData {
    username: string
    verifyUrl: string
}

export interface NotificationEmailData {
    username: string
    message: string
    actionUrl?: string
    actionText?: string
}

export type EmailTemplateData = {
    welcome: WelcomeEmailData
    notification: NotificationEmailData
}

export type EmailTemplateName = keyof EmailTemplateData

export interface SendEmailOptions<T extends EmailTemplateName> {
    to: string | string[]
    subject: string
    templateName: T
    data: EmailTemplateData[T]
}

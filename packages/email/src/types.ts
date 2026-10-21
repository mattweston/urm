export type EmailAddress =
    | string
    | Readonly<{
          address: string
          name?: string
      }>

export type EmailRecipients = EmailAddress | ReadonlyArray<EmailAddress>

export type EmailAttachmentDisposition = "attachment" | "inline"

export type EmailAttachment = Readonly<{
    filename: string
    content: Uint8Array | ArrayBuffer | string
    type: string
    disposition: EmailAttachmentDisposition
    content_id?: string
}>

export type EmailSendInput = Readonly<{
    to: EmailRecipients
    cc?: EmailRecipients
    bcc?: EmailRecipients
    from?: EmailAddress
    reply_to?: EmailAddress
    subject: string
    text: string
    html?: string
    attachments?: ReadonlyArray<EmailAttachment>
    unsubscribe_url?: string
}>

export type EmailSendSkippedReason = "disabled" | "missing_config"

export type EmailSendResult =
    | Readonly<{
          status: "skipped"
          reason: EmailSendSkippedReason
      }>
    | Readonly<{
          status: "sent"
          message_id?: string
          delivered: ReadonlyArray<string>
          queued: ReadonlyArray<string>
          permanent_bounces: ReadonlyArray<string>
      }>

export type EmailFetch = (url: string, init: RequestInit) => Promise<Response>

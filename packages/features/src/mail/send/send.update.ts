import { Array, Match as M, Option } from "effect"
import { Command } from "foldkit"
import { transactionalEmailTemplatePreviews } from "@urm/email/templates"

import type { ContactType } from "../contacts/index.ts"
import { SendSingleEmail } from "./send.command.ts"
import type { Message } from "./send.message.ts"
import type { Model, SendRecipient } from "./send.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [
    {
        domain_id: "",
        loading_recipients: false,
        publication_theme: null,
        transactional_templates: [],
        recipients: [],
        mode: "one_off",
        selectedContactId: "",
        selectedTemplateId: "auth_email_verification",
        subject: "",
        bodyText: "",
        sending: false,
        notice: null,
        error: null,
    },
    [],
]

export const reflectContacts = (
    model: Model,
    contacts: ReadonlyArray<ContactType>
): Model => {
    const recipients: ReadonlyArray<SendRecipient> = contacts
        .filter(({ email }) => email.trim() !== "")
        .map(({ id, name, email }) => ({ id, name, email }))
    const selected = Array.findFirst(
        recipients,
        ({ id }) => id === model.selectedContactId
    )

    return {
        ...model,
        recipients,
        selectedContactId: Option.match(selected, {
            onNone: () =>
                Option.match(Array.head(recipients), {
                    onNone: () => "",
                    onSome: ({ id }) => id,
                }),
            onSome: ({ id }) => id,
        }),
    }
}

export const reflectRecipients = (
    model: Model,
    recipients: ReadonlyArray<SendRecipient>
): Model => {
    const selected = recipients.find(({ id }) => id === model.selectedContactId)
    return {
        ...model,
        recipients: [...recipients],
        selectedContactId: selected?.id ?? recipients[0]?.id ?? "",
    }
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            SendRecipientsRequested: ({ domain_id }) => [
                {
                    ...model,
                    domain_id,
                    loading_recipients: domain_id !== "",
                    recipients: [],
                    selectedContactId: "",
                    error: null,
                },
                [],
            ],
            SendRecipientsLoaded: ({ domain_id, recipients }) => [
                domain_id === model.domain_id
                    ? {
                          ...model,
                          ...reflectRecipients(model, recipients),
                          loading_recipients: false,
                          error: null,
                      }
                    : model,
                [],
            ],
            SendRecipientsFailed: ({ domain_id, error }) => [
                domain_id === model.domain_id
                    ? { ...model, loading_recipients: false, error }
                    : model,
                [],
            ],
            SelectedSendContactChanged: ({ contactId }) => [
                {
                    ...model,
                    selectedContactId: contactId,
                    notice: null,
                    error: null,
                },
                [],
            ],
            SelectedSendModeChanged: ({ mode }) => [
                { ...model, mode, notice: null, error: null },
                [],
            ],
            SelectedSendTemplateChanged: ({ templateId }) => [
                {
                    ...model,
                    selectedTemplateId: templateId,
                    notice: null,
                    error: null,
                },
                [],
            ],
            UpdatedSingleEmail: ({ field, value }) => [
                {
                    ...model,
                    [field]: value,
                    notice: null,
                    error: null,
                },
                [],
            ],
            SubmittedSingleEmail: () => {
                const subject = model.subject.trim()
                const bodyText = model.bodyText.trim()
                const selected_template =
                    transactionalEmailTemplatePreviews.find(
                        ({ id }) => id === model.selectedTemplateId
                    )

                if (
                    model.selectedContactId === "" ||
                    (model.mode === "one_off" &&
                        (subject === "" || bodyText === "")) ||
                    (model.mode === "template" &&
                        selected_template === undefined)
                ) {
                    return [
                        {
                            ...model,
                            error:
                                model.mode === "template"
                                    ? "Choose a contact and production template."
                                    : "Choose a contact and complete the subject and message.",
                            notice: null,
                        },
                        [],
                    ]
                }

                return [
                    {
                        ...model,
                        sending: true,
                        notice: null,
                        error: null,
                    },
                    [
                        SendSingleEmail({
                            contactId: model.selectedContactId,
                            templateId:
                                model.mode === "template"
                                    ? model.selectedTemplateId
                                    : null,
                            subject: model.mode === "one_off" ? subject : null,
                            bodyText:
                                model.mode === "one_off" ? bodyText : null,
                        }),
                    ],
                ]
            },
            SingleEmailSent: ({ status }) => [
                {
                    ...model,
                    subject: "",
                    bodyText: "",
                    sending: false,
                    notice: `Email ${status}.`,
                    error: null,
                },
                [],
            ],
            SingleEmailFailed: ({ error }) => [
                {
                    ...model,
                    sending: false,
                    notice: null,
                    error,
                },
                [],
            ],
        })
    )

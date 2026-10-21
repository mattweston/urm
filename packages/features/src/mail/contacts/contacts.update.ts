import { Array, Match as M, Option } from "effect"
import { Command } from "foldkit"
import type { Model } from "./contacts.model.ts"
import type { Contact } from "./contacts.data.ts"
import { blankContactDraft, contactDraftFromContact } from "./contacts.data.ts"
import type { Message } from "./contacts.message.ts"
import {
    ContactsDialogClosed,
    ContactsDialogCreate,
    ContactsDialogDelete,
    ContactsDialogEdit,
} from "./contacts.model.ts"
import {
    CreateContact,
    DeleteContact,
    LoadContacts,
    UpdateContact,
} from "./contacts.command.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const isBlank = (value: string) => value.trim().length === 0

const hasValidEmailAddresses = (model: Model): boolean =>
    model.contactDraft.email_addresses.length > 0 &&
    model.contactDraft.email_addresses.every(({ email }) => !isBlank(email)) &&
    model.contactDraft.email_addresses.filter(({ is_primary }) => is_primary)
        .length === 1

const mergeContacts = (
    currentContacts: ReadonlyArray<Contact>,
    incomingContacts: ReadonlyArray<Contact>
) => {
    const currentIds = new Set(Array.map(currentContacts, ({ id }) => id))

    return [
        ...currentContacts,
        ...Array.filter(incomingContacts, ({ id }) => !currentIds.has(id)),
    ]
}

// Guard on domain_id: module.ts constructs this with "", and firing the load
// unscoped would request every tenant's contacts.
export const init = (domain_id: string): UpdateReturn => [
    {
        domain_id,
        contacts: [],
        contactsLoaded: false,
        contactsSearch: "",
        selectedContactId: "",
        contactsDialog: ContactsDialogClosed(),
        contactDraft: blankContactDraft(),
    },
    domain_id === "" ? [] : [LoadContacts({ domain_id })],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            ContactsSearchChanged: ({ value }) => [
                {
                    ...model,
                    contactsSearch: value,
                },
                [],
            ],
            UpdatedContactDraft: ({ field, value }) => [
                {
                    ...model,
                    contactDraft: {
                        ...model.contactDraft,
                        [field]: value,
                    },
                },
                [],
            ],
            AddedContactEmailAddress: () => [
                {
                    ...model,
                    contactDraft: {
                        ...model.contactDraft,
                        email_addresses: [
                            ...model.contactDraft.email_addresses,
                            {
                                email: "",
                                is_primary:
                                    model.contactDraft.email_addresses
                                        .length === 0,
                            },
                        ],
                    },
                },
                [],
            ],
            RemovedContactEmailAddress: ({ index }) => {
                if (model.contactDraft.email_addresses.length < 2) {
                    return [model, []]
                }

                const email_addresses = model.contactDraft.email_addresses
                    .filter((_, current_index) => current_index !== index)
                    .map((email_address, current_index, remaining) => ({
                        ...email_address,
                        is_primary:
                            remaining.some(({ is_primary }) => is_primary) ||
                            current_index !== 0
                                ? email_address.is_primary
                                : true,
                    }))

                return [
                    {
                        ...model,
                        contactDraft: {
                            ...model.contactDraft,
                            email_addresses,
                        },
                    },
                    [],
                ]
            },
            UpdatedContactEmailAddress: ({ index, value }) => [
                {
                    ...model,
                    contactDraft: {
                        ...model.contactDraft,
                        email_addresses: model.contactDraft.email_addresses.map(
                            (email_address, current_index) =>
                                current_index === index
                                    ? { ...email_address, email: value }
                                    : email_address
                        ),
                    },
                },
                [],
            ],
            ChangedPrimaryContactEmail: ({ index }) => [
                {
                    ...model,
                    contactDraft: {
                        ...model.contactDraft,
                        email_addresses: model.contactDraft.email_addresses.map(
                            (email_address, current_index) => ({
                                ...email_address,
                                is_primary: current_index === index,
                            })
                        ),
                    },
                },
                [],
            ],
            SelectedContactChanged: ({ contactId }) => [
                {
                    ...model,
                    selectedContactId: contactId,
                },
                [],
            ],
            ClickedCreateContact: () => [
                {
                    ...model,
                    contactsDialog: ContactsDialogCreate(),
                    contactDraft: blankContactDraft(),
                },
                [],
            ],
            ClickedEditContact: ({ contactId }) => {
                const maybeContact = Array.findFirst(
                    model.contacts,
                    ({ id }) => id === contactId
                )

                return [
                    {
                        ...model,
                        selectedContactId: contactId,
                        contactsDialog: ContactsDialogEdit({ contactId }),
                        contactDraft: Option.match(maybeContact, {
                            onNone: () => blankContactDraft(),
                            onSome: (contact) =>
                                contactDraftFromContact(contact),
                        }),
                    },
                    [],
                ]
            },
            ClickedDeleteContact: ({ contactId }) => [
                {
                    ...model,
                    selectedContactId: contactId,
                    contactsDialog: ContactsDialogDelete({ contactId }),
                },
                [],
            ],
            ClosedContactDialog: () => [
                {
                    ...model,
                    contactsDialog: ContactsDialogClosed(),
                    contactDraft: blankContactDraft(),
                },
                [],
            ],
            SubmittedContactForm: () =>
                M.value(model.contactsDialog).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        ContactsDialogClosed: () => [model, []],
                        ContactsDialogCreate: () => {
                            if (
                                isBlank(model.contactDraft.name) ||
                                !hasValidEmailAddresses(model)
                            ) {
                                return [model, []]
                            }

                            return [
                                model,
                                [
                                    CreateContact({
                                        domain_id: model.domain_id,
                                        draft: model.contactDraft,
                                    }),
                                ],
                            ]
                        },
                        ContactsDialogEdit: ({ contactId }) => {
                            if (
                                isBlank(model.contactDraft.name) ||
                                !hasValidEmailAddresses(model)
                            ) {
                                return [model, []]
                            }

                            return [
                                model,
                                [
                                    UpdateContact({
                                        domain_id: model.domain_id,
                                        contactId,
                                        draft: model.contactDraft,
                                    }),
                                ],
                            ]
                        },
                        ContactsDialogDelete: ({ contactId }) => [
                            model,
                            [
                                DeleteContact({
                                    domain_id: model.domain_id,
                                    contactId,
                                }),
                            ],
                        ],
                    })
                ),
            ConfirmedDeleteContact: () =>
                M.value(model.contactsDialog).pipe(
                    withUpdateReturn,
                    M.tagsExhaustive({
                        ContactsDialogClosed: () => [model, []],
                        ContactsDialogCreate: () => [model, []],
                        ContactsDialogEdit: () => [model, []],
                        ContactsDialogDelete: ({ contactId }) => [
                            model,
                            [
                                DeleteContact({
                                    domain_id: model.domain_id,
                                    contactId,
                                }),
                            ],
                        ],
                    })
                ),
            ContactsLoaded: ({ contacts }) => {
                const nextContacts = model.contactsLoaded
                    ? mergeContacts(model.contacts, contacts)
                    : contacts
                const maybeSelectedContact = Array.findFirst(
                    nextContacts,
                    ({ id }) => id === model.selectedContactId
                )

                return [
                    {
                        ...model,
                        contacts: nextContacts,
                        contactsLoaded: true,
                        selectedContactId: Option.match(maybeSelectedContact, {
                            onNone: () =>
                                Option.match(Array.head(nextContacts), {
                                    onNone: () => "",
                                    onSome: ({ id }) => id,
                                }),
                            onSome: ({ id }) => id,
                        }),
                    },
                    [],
                ]
            },
            ContactCreated: ({ contact }) => [
                {
                    ...model,
                    contacts: mergeContacts(model.contacts, [contact]),
                    contactsLoaded: true,
                    selectedContactId: contact.id,
                    contactsDialog: ContactsDialogClosed(),
                    contactDraft: blankContactDraft(),
                },
                [],
            ],
            ContactUpdated: ({ contact }) => [
                {
                    ...model,
                    contacts: Array.map(model.contacts, (currentContact) =>
                        currentContact.id === contact.id
                            ? contact
                            : currentContact
                    ),
                    contactsLoaded: true,
                    selectedContactId: contact.id,
                    contactsDialog: ContactsDialogClosed(),
                    contactDraft: blankContactDraft(),
                },
                [],
            ],
            ContactDeleted: ({ contactId }) => {
                const updatedContacts = Array.filter(
                    model.contacts,
                    (contact) => contact.id !== contactId
                )
                const maybeNextSelectedContact = Array.head(updatedContacts)

                return [
                    {
                        ...model,
                        contacts: updatedContacts,
                        contactsLoaded: true,
                        selectedContactId: Option.match(
                            maybeNextSelectedContact,
                            {
                                onNone: () => "",
                                onSome: ({ id }) => id,
                            }
                        ),
                        contactsDialog: ContactsDialogClosed(),
                        contactDraft: blankContactDraft(),
                    },
                    [],
                ]
            },
            ContactsActionFailed: () => [model, []],
        })
    )

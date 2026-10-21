import { Array, Match as M } from "effect"
import { Command } from "foldkit"
import type { EmailSubscriptionStatus as EmailSubscriptionStatusType } from "@urm/domain/schemas/email"
import type { ContactType } from "../contacts/index.ts"
import type { Model } from "./subscriptions.model.ts"
import type { Message } from "./subscriptions.message.ts"
import {
    LoadSubscriptions,
    SetSubscriptionStatus,
} from "./subscriptions.command.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const normalizedListKey = (listKey: string): string => {
    const normalized = listKey.trim()

    return normalized.length === 0 ? "newsletter" : normalized
}

const replaceSubscription = (
    subscriptions: Model["subscriptions"],
    incoming: Model["subscriptions"][number]
) => {
    const exists = Array.some(
        subscriptions,
        ({ contact_id }) => contact_id === incoming.contact_id
    )

    return exists
        ? Array.map(subscriptions, (subscription) =>
              subscription.contact_id === incoming.contact_id
                  ? incoming
                  : subscription
          )
        : [incoming, ...subscriptions]
}

const selectable_contact_id = (
    contacts: Model["availableContacts"],
    subscriptions: Model["subscriptions"],
    current_contact_id: string
): string => {
    const eligible_contacts = contacts.filter(
        (contact) =>
            !subscriptions.some(({ contact_id }) => contact_id === contact.id)
    )

    return eligible_contacts.some(({ id }) => id === current_contact_id)
        ? current_contact_id
        : (eligible_contacts[0]?.id ?? "")
}

export const reflectContacts = (
    model: Model,
    contacts: ReadonlyArray<ContactType>
): Model => {
    const availableContacts = contacts.flatMap(
        (contact): ReadonlyArray<Model["availableContacts"][number]> =>
            contact.email.trim().length === 0
                ? []
                : [
                      {
                          id: contact.id,
                          name: contact.name,
                          email: contact.email,
                      },
                  ]
    )

    return {
        ...model,
        availableContacts,
        selectedContactId: selectable_contact_id(
            availableContacts,
            model.subscriptions,
            model.selectedContactId
        ),
    }
}

export const initDeferred = (): UpdateReturn => [
    {
        listKey: "newsletter",
        activeListKey: "newsletter",
        subscriptions: [],
        availableContacts: [],
        selectedContactId: "",
        loading: false,
        savingContactId: null,
        error: null,
        notice: null,
    },
    [],
]

export const load = (model: Model): UpdateReturn => [
    {
        ...model,
        loading: true,
        error: null,
        notice: null,
    },
    [LoadSubscriptions({ listKey: normalizedListKey(model.listKey) })],
]

export const init = (): UpdateReturn => {
    const [model] = initDeferred()

    return [
        {
            ...model,
            loading: true,
        },
        [LoadSubscriptions({ listKey: "newsletter" })],
    ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedSubscriptionsListKey: ({ value }) => [
                {
                    ...model,
                    listKey: value,
                    notice: null,
                },
                [],
            ],
            SubmittedSubscriptionsListKey: () => [
                {
                    ...model,
                    listKey: normalizedListKey(model.listKey),
                    activeListKey: normalizedListKey(model.listKey),
                    loading: true,
                    error: null,
                    notice: null,
                },
                [
                    LoadSubscriptions({
                        listKey: normalizedListKey(model.listKey),
                    }),
                ],
            ],
            SelectedSubscriptionContactChanged: ({ value }) => [
                {
                    ...model,
                    selectedContactId: value,
                    error: null,
                    notice: null,
                },
                [],
            ],
            SubmittedSubscriptionContact: () =>
                model.selectedContactId === ""
                    ? [
                          {
                              ...model,
                              error: "Choose a contact to subscribe",
                              notice: null,
                          },
                          [],
                      ]
                    : [
                          {
                              ...model,
                              savingContactId: model.selectedContactId,
                              error: null,
                              notice: null,
                          },
                          [
                              SetSubscriptionStatus({
                                  contact_id: model.selectedContactId,
                                  listKey: model.activeListKey,
                                  status: "subscribed",
                              }),
                          ],
                      ],
            SubscriptionsLoaded: ({ subscriptions }) => [
                {
                    ...model,
                    subscriptions: [...subscriptions],
                    selectedContactId: selectable_contact_id(
                        model.availableContacts,
                        subscriptions,
                        model.selectedContactId
                    ),
                    loading: false,
                    error: null,
                    notice: `${subscriptions.length} subscriptions loaded`,
                },
                [],
            ],
            SubscriptionStatusChanged: ({
                contact_id,
                status,
            }: {
                contact_id: string
                status: EmailSubscriptionStatusType
            }) => [
                {
                    ...model,
                    savingContactId: contact_id,
                    error: null,
                    notice: null,
                },
                [
                    SetSubscriptionStatus({
                        contact_id,
                        listKey: model.activeListKey,
                        status,
                    }),
                ],
            ],
            SubscriptionUpdated: ({ subscription }) => {
                const subscriptions = replaceSubscription(
                    model.subscriptions,
                    subscription
                )

                return [
                    {
                        ...model,
                        subscriptions,
                        savingContactId: null,
                        selectedContactId: selectable_contact_id(
                            model.availableContacts,
                            subscriptions,
                            model.selectedContactId
                        ),
                        error: null,
                        notice: `${subscription.email} marked ${subscription.status}`,
                    },
                    [],
                ]
            },
            SubscriptionsActionFailed: ({ error }) => [
                {
                    ...model,
                    loading: false,
                    savingContactId: null,
                    error,
                },
                [],
            ],
        })
    )

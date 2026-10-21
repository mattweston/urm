import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { Match as M, Option } from "effect"
import { modifyFields } from "foldkit/struct"
import type { Message } from "./share-document.message.ts"
import { GotPermissionListboxMessage } from "./share-document.message.ts"
import type { Model } from "./share-document.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()
const Listbox = Ui.Listbox.create<string>()

const mapPermissionListboxCommands = (
    index: number,
    commands: ReadonlyArray<Command.Command<Ui.Listbox.Message>>
) =>
    Command.mapMessages(commands, (message) =>
        GotPermissionListboxMessage({ personIndexId: index, message })
    )

const initialPeople = [
    {
        id: "olivia",
        name: "Olivia Martin",
        email: "m@example.com",
        avatarSrc: "/avatars/03.svg",
        avatarFallback: "OM",
        permission: "Can edit",
    },
    {
        id: "isabella",
        name: "Isabella Nguyen",
        email: "b@example.com",
        avatarSrc: "/avatars/05.svg",
        avatarFallback: "IN",
        permission: "Can view",
    },
    {
        id: "sofia",
        name: "Sofia Davis",
        email: "p@example.com",
        avatarSrc: "/avatars/01.svg",
        avatarFallback: "SD",
        permission: "Can view",
    },
] as const

export const init = (): UpdateReturn => {
    const initializedPeople = initialPeople.map((person) => {
        const listbox = Ui.Listbox.init({ id: `share-document-${person.id}` })
        const { model: nextListbox, commands = [] } = Listbox.selectItem(
            listbox,
            person.permission
        )

        return {
            ...person,
            permissionListbox: nextListbox,
            commands,
        }
    })

    return [
        {
            link: "http://example.com/link/to/document",
            people: initializedPeople.map(
                ({ commands: _, ...person }) => person
            ),
        },
        initializedPeople.flatMap((person, index) =>
            mapPermissionListboxCommands(index, person.commands)
        ),
    ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedPermission: ({ index, value }) => {
                const maybePerson = model.people[index]

                if (maybePerson === undefined) {
                    return [model, []]
                }

                const { model: nextPermissionListbox, commands = [] } =
                    Listbox.selectItem(maybePerson.permissionListbox, value)

                return [
                    modifyFields(model, {
                        people: () =>
                            model.people.map((person, personIndex) =>
                                personIndex === index
                                    ? {
                                          ...person,
                                          permission: value,
                                          permissionListbox:
                                              nextPermissionListbox,
                                      }
                                    : person
                            ),
                    }),
                    mapPermissionListboxCommands(index, commands),
                ]
            },
            GotPermissionListboxMessage: ({
                personIndexId: index,
                message,
            }) => {
                const maybePerson = model.people[index]

                if (maybePerson === undefined) {
                    return [model, []]
                }

                const {
                    model: nextPermissionListbox,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = Listbox.update(maybePerson.permissionListbox, message)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const nextPermission = Option.match(maybeOutMessage, {
                    onNone: () => maybePerson.permission,
                    onSome: ({ value }) => value,
                })

                return [
                    modifyFields(model, {
                        people: () =>
                            model.people.map((person, personIndex) =>
                                personIndex === index
                                    ? {
                                          ...person,
                                          permission: nextPermission,
                                          permissionListbox:
                                              nextPermissionListbox,
                                      }
                                    : person
                            ),
                    }),
                    mapPermissionListboxCommands(index, commands),
                ]
            },
        })
    )

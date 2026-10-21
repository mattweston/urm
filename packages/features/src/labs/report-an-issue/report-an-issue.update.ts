import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { Match as M, Option } from "effect"
import { modifyFields } from "foldkit/struct"
import type { Message } from "./report-an-issue.message.ts"
import {
    GotAreaListboxMessage,
    GotSecurityLevelListboxMessage,
} from "./report-an-issue.message.ts"
import { type Model } from "./report-an-issue.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()
const Listbox = Ui.Listbox.create<string>()

const mapAreaListboxCommands = (
    commands: ReadonlyArray<Command.Command<Ui.Listbox.Message>>
) =>
    Command.mapMessages(commands, (message) =>
        GotAreaListboxMessage({ message })
    )

const mapSecurityLevelListboxCommands = (
    commands: ReadonlyArray<Command.Command<Ui.Listbox.Message>>
) =>
    Command.mapMessages(commands, (message) =>
        GotSecurityLevelListboxMessage({ message })
    )

export const init = (): UpdateReturn => {
    const areaListbox = Ui.Listbox.init({ id: "report-issue-area" })
    const { model: nextAreaListbox, commands: areaCommands = [] } =
        Listbox.selectItem(areaListbox, "Billing")
    const securityLevelListbox = Ui.Listbox.init({
        id: "report-issue-security-level",
    })
    const {
        model: nextSecurityLevelListbox,
        commands: securityLevelCommands = [],
    } = Listbox.selectItem(securityLevelListbox, "Level 2")

    return [
        {
            areaListbox: nextAreaListbox,
            securityLevelListbox: nextSecurityLevelListbox,
            area: "Billing",
            securityLevel: "Level 2",
            subject: "",
            description: "",
        },
        [
            ...mapAreaListboxCommands(areaCommands),
            ...mapSecurityLevelListboxCommands(securityLevelCommands),
        ],
    ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            UpdatedArea: ({ value }) => {
                const { model: nextAreaListbox, commands: areaCommands = [] } =
                    Listbox.selectItem(model.areaListbox, value)

                return [
                    modifyFields(model, {
                        area: () => value,
                        areaListbox: () => nextAreaListbox,
                    }),
                    mapAreaListboxCommands(areaCommands),
                ]
            },
            UpdatedSecurityLevel: ({ value }) => {
                const {
                    model: nextSecurityLevelListbox,
                    commands: securityLevelCommands = [],
                } = Listbox.selectItem(model.securityLevelListbox, value)

                return [
                    modifyFields(model, {
                        securityLevel: () => value,
                        securityLevelListbox: () => nextSecurityLevelListbox,
                    }),
                    mapSecurityLevelListboxCommands(securityLevelCommands),
                ]
            },
            UpdatedSubject: ({ value }) => [
                modifyFields(model, {
                    subject: () => value,
                }),
                [],
            ],
            UpdatedDescription: ({ value }) => [
                modifyFields(model, {
                    description: () => value,
                }),
                [],
            ],
            GotAreaListboxMessage: ({ message }) => {
                const {
                    model: nextAreaListbox,
                    commands: areaCommands = [],
                    outMessage: maybeOutMessage_value,
                } = Listbox.update(model.areaListbox, message)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const nextArea = Option.match(maybeOutMessage, {
                    onNone: () => model.area,
                    onSome: ({ value }) => value,
                })

                return [
                    modifyFields(model, {
                        area: () => nextArea,
                        areaListbox: () => nextAreaListbox,
                    }),
                    mapAreaListboxCommands(areaCommands),
                ]
            },
            GotSecurityLevelListboxMessage: ({ message }) => {
                const {
                    model: nextSecurityLevelListbox,
                    commands: securityLevelCommands = [],
                    outMessage: maybeOutMessage_value,
                } = Listbox.update(model.securityLevelListbox, message)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const nextSecurityLevel = Option.match(maybeOutMessage, {
                    onNone: () => model.securityLevel,
                    onSome: ({ value }) => value,
                })

                return [
                    modifyFields(model, {
                        securityLevel: () => nextSecurityLevel,
                        securityLevelListbox: () => nextSecurityLevelListbox,
                    }),
                    mapSecurityLevelListboxCommands(securityLevelCommands),
                ]
            },
        })
    )

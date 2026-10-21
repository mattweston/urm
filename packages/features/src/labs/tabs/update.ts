import { Effect, Match as M, Option } from "effect"
import { Command } from "foldkit"
import * as Ui from "@foldkit/ui"
import { evo } from "foldkit/struct"

import {
    GotHorizontalTabsMessage,
    GotVerticalTabsMessage,
    type Message,
} from "./message.ts"
import type { Model, TabValue } from "./model.ts"

const Tabs = Ui.Tabs.create<TabValue>()

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [
    {
        horizontalTabs: Ui.Tabs.init({ id: "labs-tabs-horizontal" }),
        horizontalValue: "Foldkit",
        verticalTabs: Ui.Tabs.init({ id: "labs-tabs-vertical" }),
        verticalValue: "Foldkit",
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotHorizontalTabsMessage: ({ message }) => {
                const {
                    model: horizontalTabs,
                    commands = [],
                    outMessage: maybeOut_value,
                } = Tabs.update(model.horizontalTabs, message)
                const maybeOut = Option.fromUndefinedOr(maybeOut_value)

                return [
                    evo(model, {
                        horizontalTabs: () => horizontalTabs,
                        horizontalValue: () =>
                            Option.match(maybeOut, {
                                onNone: () => model.horizontalValue,
                                onSome: ({ value }) => value,
                            }),
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotHorizontalTabsMessage({ message })
                            )
                        )
                    ),
                ]
            },
            GotVerticalTabsMessage: ({ message }) => {
                const {
                    model: verticalTabs,
                    commands = [],
                    outMessage: maybeOut_value,
                } = Tabs.update(model.verticalTabs, message)
                const maybeOut = Option.fromUndefinedOr(maybeOut_value)

                return [
                    evo(model, {
                        verticalTabs: () => verticalTabs,
                        verticalValue: () =>
                            Option.match(maybeOut, {
                                onNone: () => model.verticalValue,
                                onSome: ({ value }) => value,
                            }),
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotVerticalTabsMessage({ message })
                            )
                        )
                    ),
                ]
            },
        })
    )

import * as Ui from "@foldkit/ui"
import { Array, Effect, Match as M, Option } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import type { City } from "./city.ts"
import {
    GotBasicMessage,
    GotMultiMessage,
    GotNullableMessage,
    GotSelectOnFocusMessage,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"

const Combobox = Ui.Combobox.create<City>()
const MultiCombobox = Ui.Combobox.Multi.create<City>()

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const selectedValue = (
    current: Option.Option<City>,
    maybeOutMessage: Option.Option<Ui.Combobox.OutMessage<City>>
): Option.Option<City> =>
    M.value(maybeOutMessage).pipe(
        M.tag("Some", ({ value }) =>
            M.value(value).pipe(
                M.tag("Selected", ({ value: selected }) =>
                    Option.some(selected)
                ),
                M.tag("ClearedSelection", () => Option.none<City>()),
                M.orElse(() => current)
            )
        ),
        M.orElse(() => current)
    )

const mapCommands = (
    commands: ReadonlyArray<Command.Command<Ui.Combobox.Message>>,
    wrap: (message: Ui.Combobox.Message) => Message
) => commands.map(Command.mapEffect(Effect.map(wrap)))

export const init = (): UpdateReturn => [
    {
        basic: Ui.Combobox.init({ id: "labs-combobox-basic" }),
        maybeBasicValue: Option.none(),
        nullable: Ui.Combobox.init({
            id: "labs-combobox-nullable",
            nullable: true,
        }),
        maybeNullableValue: Option.none(),
        selectOnFocus: Ui.Combobox.init({
            id: "labs-combobox-select-on-focus",
            selectInputOnFocus: true,
        }),
        maybeSelectOnFocusValue: Option.none(),
        multi: Ui.Combobox.Multi.init({ id: "labs-combobox-multi" }),
        multiValues: [],
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotBasicMessage: ({ message: childMessage }) => {
                const {
                    model: basic,
                    commands = [],
                    outMessage: outMessage_value,
                } = Combobox.update(model.basic, childMessage)
                const outMessage = Option.fromUndefinedOr(outMessage_value)

                return [
                    evo(model, {
                        basic: () => basic,
                        maybeBasicValue: () =>
                            selectedValue(model.maybeBasicValue, outMessage),
                    }),
                    mapCommands(commands, (message) =>
                        GotBasicMessage({ message })
                    ),
                ]
            },
            GotNullableMessage: ({ message: childMessage }) => {
                const {
                    model: nullable,
                    commands = [],
                    outMessage: outMessage_value,
                } = Combobox.update(model.nullable, childMessage)
                const outMessage = Option.fromUndefinedOr(outMessage_value)

                return [
                    evo(model, {
                        nullable: () => nullable,
                        maybeNullableValue: () =>
                            selectedValue(model.maybeNullableValue, outMessage),
                    }),
                    mapCommands(commands, (message) =>
                        GotNullableMessage({ message })
                    ),
                ]
            },
            GotSelectOnFocusMessage: ({ message: childMessage }) => {
                const {
                    model: selectOnFocus,
                    commands = [],
                    outMessage: outMessage_value,
                } = Combobox.update(model.selectOnFocus, childMessage)
                const outMessage = Option.fromUndefinedOr(outMessage_value)

                return [
                    evo(model, {
                        selectOnFocus: () => selectOnFocus,
                        maybeSelectOnFocusValue: () =>
                            selectedValue(
                                model.maybeSelectOnFocusValue,
                                outMessage
                            ),
                    }),
                    mapCommands(commands, (message) =>
                        GotSelectOnFocusMessage({ message })
                    ),
                ]
            },
            GotMultiMessage: ({ message: childMessage }) => {
                const {
                    model: multi,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = MultiCombobox.update(model.multi, childMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const multiValues = M.value(maybeOutMessage).pipe(
                    M.tag("Some", ({ value }) =>
                        M.value(value).pipe(
                            M.tag("Selected", ({ value: selected }) =>
                                Array.contains(model.multiValues, selected)
                                    ? Array.filter(
                                          model.multiValues,
                                          (value) => value !== selected
                                      )
                                    : Array.append(model.multiValues, selected)
                            ),
                            M.tag("ClearedSelection", () => []),
                            M.orElse(() => model.multiValues)
                        )
                    ),
                    M.orElse(() => model.multiValues)
                )
                return [
                    evo(model, {
                        multi: () => multi,
                        multiValues: () => multiValues,
                    }),
                    mapCommands(commands, (message) =>
                        GotMultiMessage({ message })
                    ),
                ]
            },
        })
    )

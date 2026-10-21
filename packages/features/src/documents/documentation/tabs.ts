import { Effect, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"
import * as Ui from "@foldkit/ui"

export const Model = S.Struct({
    tabs: Ui.Tabs.Model,
    selected_value: S.String,
})
export type Model = typeof Model.Type

export const GotTabsMessage = taggedStruct("GotTabsMessage", {
    message: Ui.Tabs.Message,
})

export const Message = S.Union([GotTabsMessage])
export type Message = typeof Message.Type

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const Tabs = Ui.Tabs.create<string>()

export const init = (): UpdateReturn => [
    {
        tabs: Ui.Tabs.init({ id: "documentation-tabs" }),
        selected_value: "",
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn => {
    const {
        model: tabs,
        commands = [],
        outMessage: maybe_out_value,
    } = Tabs.update(model.tabs, message.message)
    const maybe_out = Option.fromUndefinedOr(maybe_out_value)

    return [
        evo(model, {
            tabs: () => tabs,
            selected_value: () =>
                Option.match(maybe_out, {
                    onNone: () => model.selected_value,
                    onSome: ({ value }) => value,
                }),
        }),
        commands.map(
            Command.mapEffect(
                Effect.map((child_message) =>
                    GotTabsMessage({ message: child_message })
                )
            )
        ),
    ]
}

export const view = <ParentMessage>(
    model: Model,
    labels: ReadonlyArray<string>,
    panels: ReadonlyArray<Html>,
    aria_label: string,
    to_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const selected_value = labels.includes(model.selected_value)
        ? model.selected_value
        : (labels[0] ?? "")

    return h.submodel({
        slotId: model.tabs.id,
        model: model.tabs,
        view: Tabs.view,
        viewInputs: {
            selectedValue: selected_value,
            tabs: labels,
            ariaLabel: aria_label,
            orientation: "Horizontal",
            toView: (render) =>
                h.div(
                    [h.Class("documentation-tabs")],
                    [
                        h.div(
                            [
                                ...render.tablist,
                                h.Class("documentation-tab-list"),
                            ],
                            render.tabs.map((tab) =>
                                h.button(
                                    [...tab.tab, h.Class("documentation-tab")],
                                    [tab.value]
                                )
                            )
                        ),
                        ...render.tabs.map((tab, index) =>
                            tab.isActive
                                ? h.div(
                                      [
                                          ...tab.panel,
                                          h.Class("documentation-tab-panel"),
                                      ],
                                      [panels[index] ?? h.empty]
                                  )
                                : h.empty
                        ),
                    ]
                ),
        },
        toParentMessage: (message) => to_message(GotTabsMessage({ message })),
    })
}

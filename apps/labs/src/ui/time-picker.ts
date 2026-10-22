import { Match as M, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import * as TimePicker from "@urm/ui/foldkit/time-picker.ts"

export const Model = S.Struct({
    picker: TimePicker.Model,
})
export type Model = typeof Model.Type

export const GotTimePickerMessage = taggedStruct("GotTimePickerMessage", {
    message: TimePicker.Message,
})
export const ClickedClearTime = taggedStruct("ClickedClearTime")
export const Message = S.Union([GotTimePickerMessage, ClickedClearTime])
export type Message = typeof Message.Type

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [
    {
        picker: TimePicker.init({
            id: "labs-ui-time-picker",
            value: "09:30",
        }),
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotTimePickerMessage: ({ message }) => [
                {
                    ...model,
                    picker: TimePicker.update(model.picker, message),
                },
                [],
            ],
            ClickedClearTime: () => [
                { ...model, picker: TimePicker.clear(model.picker) },
                [],
            ],
        })
    )

const button_class =
    "inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)] [box-shadow:var(--shadow-control)]"

export const view = <ParentMessage>(
    model: Model,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const normalized_value = Option.match(TimePicker.value(model.picker), {
        onNone: () => "Incomplete",
        onSome: (value) => value,
    })

    return h.div(
        [h.Class("grid max-w-2xl gap-6")],
        [
            h.p(
                [h.Class("max-w-prose text-sm text-muted-foreground")],
                [
                    "Enter an exact 24-hour time or use the counter controls. Hours move by one; minutes move by five and carry across hour boundaries.",
                ]
            ),
            h.div(
                [
                    h.Class(
                        "grid gap-5 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.submodel({
                        slotId: model.picker.id,
                        model: model.picker,
                        view: TimePicker.view,
                        viewInputs: {
                            label: "Appointment time",
                            described_by: "labs-ui-time-picker-hint",
                        },
                        toParentMessage: (message) =>
                            to_parent_message(
                                GotTimePickerMessage({ message })
                            ),
                    }),
                    h.p(
                        [
                            h.Id("labs-ui-time-picker-hint"),
                            h.Class("text-sm text-muted-foreground"),
                        ],
                        ["Both fields are required for a complete time."]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap items-center gap-3")],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(
                                        to_parent_message(ClickedClearTime())
                                    ),
                                    h.Class(button_class),
                                ],
                                ["Clear"]
                            ),
                            h.output(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-control)] bg-muted px-3 py-2 font-mono text-sm tabular-nums text-foreground"
                                    ),
                                ],
                                [`Value: ${normalized_value}`]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

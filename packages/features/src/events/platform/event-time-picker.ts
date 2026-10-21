import { Option } from "effect"
import * as Ui from "@foldkit/ui"
import type { AnchorConfig } from "@foldkit/ui/anchor"
import { childAttributes } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"

const TIME_SLOT_MINUTES = 15

export const TimeListbox: ReturnType<typeof Ui.Listbox.create<string>> =
    Ui.Listbox.create<string>()

const timeOptions = (value: string): ReadonlyArray<string> => {
    const slots: Array<string> = []

    for (let hour = 0; hour < 24; hour += 1) {
        for (let minute = 0; minute < 60; minute += TIME_SLOT_MINUTES) {
            slots.push(
                `${globalThis.String(hour).padStart(2, "0")}:${globalThis.String(minute).padStart(2, "0")}`
            )
        }
    }

    if (value.length > 0 && !slots.includes(value)) {
        return [value, ...slots]
    }

    return slots
}

const itemClassName =
    "px-3 py-2 text-sm cursor-pointer hover:bg-accent data-[active]:bg-accent data-[active]:text-accent-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const itemsClassName =
    "z-10 w-(--button-width) rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card [box-shadow:var(--shadow-overlay)] overflow-hidden py-1 max-h-64 overflow-y-auto outline-none"

const buttonClassName =
    "inline-flex items-center justify-between gap-2 w-full px-4 py-2 text-base font-normal cursor-pointer transition rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background text-foreground hover:bg-accent select-none focus:outline-none focus:ring-2 focus:ring-ring [box-shadow:var(--shadow-control)]"

const backdropClassName = "fixed inset-0"

const wrapperClassName = "relative w-full"

const anchor: AnchorConfig = { placement: "bottom-start", gap: 4, padding: 8 }

export const blankTimeListbox = (id: string): Ui.Listbox.Model =>
    Ui.Listbox.init({ id })

export const timeListboxFromValue = (
    id: string,
    value: string
): Ui.Listbox.Model => {
    const listbox = Ui.Listbox.init({ id })

    if (value.length === 0) {
        return listbox
    }

    return TimeListbox.selectItem(listbox, value).model
}

export const timeListboxView = <ParentMessage>(
    config: Readonly<{
        model: Ui.Listbox.Model
        label: string
        value: string
        placeholder: string
        toParentMessage: (message: Ui.Listbox.Message) => ParentMessage
    }>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("space-y-1")],
        [
            h.label(
                [h.Class("block text-sm font-medium text-foreground")],
                [config.label]
            ),
            h.submodel({
                slotId: config.model.id,
                model: config.model,
                view: TimeListbox.view,
                viewInputs: {
                    ariaLabel: config.label,
                    maybeSelectedValue:
                        config.value.length === 0
                            ? Option.none()
                            : Option.some(config.value),
                    anchor,
                    items: timeOptions(config.value),
                    itemToConfig: (time, { isActive, isSelected }) => ({
                        className: `${itemClassName}${isActive ? " bg-accent" : ""}${isSelected ? " font-semibold text-primary" : ""}`,
                        content: h.div(
                            [h.Class("flex items-center gap-2 w-full")],
                            [
                                h.span(
                                    [
                                        h.Class(
                                            `w-4 text-primary ${isSelected ? "visible" : "invisible"}`
                                        ),
                                    ],
                                    ["✓"]
                                ),
                                h.span([], [time]),
                            ]
                        ),
                    }),
                    buttonContent: h.div(
                        [
                            h.Class(
                                "flex w-full items-center justify-between gap-2"
                            ),
                        ],
                        [
                            h.span(
                                [
                                    h.Class(
                                        config.value.length > 0
                                            ? "text-foreground"
                                            : "text-muted-foreground"
                                    ),
                                ],
                                [
                                    config.value.length > 0
                                        ? config.value
                                        : config.placeholder,
                                ]
                            ),
                            h.span(
                                [h.Class("text-muted-foreground shrink-0")],
                                ["▾"]
                            ),
                        ]
                    ),
                    buttonClassName,
                    itemsClassName,
                    backdropClassName,
                    attributes: childAttributes([h.Class(wrapperClassName)]),
                },
                toParentMessage: config.toParentMessage,
            }),
        ]
    )
}

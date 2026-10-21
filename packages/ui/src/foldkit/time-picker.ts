import * as Ui from "@foldkit/ui"
import { Match as M, Option, Schema as S } from "effect"
import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

/** State for a segmented 24-hour time picker. */
export const Model = S.Struct({
    id: S.String,
    hour: S.String,
    minute: S.String,
})
/** The segmented time picker Model. */
export type Model = typeof Model.Type

/** Replaces the hour draft. */
export const ChangedHour = taggedStruct("ChangedHour", { value: S.String })
/** Replaces the minute draft. */
export const ChangedMinute = taggedStruct("ChangedMinute", { value: S.String })
/** Moves the hour by one step. */
export const SteppedHour = taggedStruct("SteppedHour", { amount: S.Number })
/** Moves the minute by five minutes and carries across hour boundaries. */
export const SteppedMinute = taggedStruct("SteppedMinute", { amount: S.Number })

/** All Messages handled by the segmented time picker. */
export const Message = S.Union([
    ChangedHour,
    ChangedMinute,
    SteppedHour,
    SteppedMinute,
])
/** A segmented time picker Message. */
export type Message = typeof Message.Type

/** Configuration used to create a segmented time picker. */
export type InitConfig = Readonly<{
    id: string
    value?: string
}>

const parts_from_value = (
    time: string
): Readonly<{ hour: string; minute: string }> => {
    const match = /^(\d{2}):(\d{2})$/.exec(time)
    if (match === null) return { hour: "", minute: "" }
    const hour = match[1]
    const minute = match[2]
    if (hour === undefined || minute === undefined)
        return { hour: "", minute: "" }
    return { hour, minute }
}

/** Creates a segmented time picker from an optional `HH:mm` value. */
export const init = ({ id, value = "" }: InitConfig): Model => ({
    id,
    ...parts_from_value(value),
})

/** Replaces the picker draft from an `HH:mm` value. */
export const set_value = (model: Model, time: string): Model => ({
    ...model,
    ...parts_from_value(time),
})

/** Clears both time segments. */
export const clear = (model: Model): Model => ({
    ...model,
    hour: "",
    minute: "",
})

const bounded_integer = (
    text: string,
    minimum: number,
    maximum: number
): Option.Option<number> => {
    if (!/^\d{1,2}$/.test(text)) return Option.none()
    const value = Number(text)
    return Number.isInteger(value) && value >= minimum && value <= maximum
        ? Option.some(value)
        : Option.none()
}

const normalized_hour = (model: Model): number =>
    Option.getOrElse(bounded_integer(model.hour, 0, 23), () => 0)

const normalized_minute = (model: Model): number =>
    Option.getOrElse(bounded_integer(model.minute, 0, 59), () => 0)

const clock_parts = (
    minutes_since_midnight: number
): Readonly<{ hour: string; minute: string }> => {
    const day_minutes = 24 * 60
    const normalized =
        ((minutes_since_midnight % day_minutes) + day_minutes) % day_minutes
    return {
        hour: String(Math.floor(normalized / 60)).padStart(2, "0"),
        minute: String(normalized % 60).padStart(2, "0"),
    }
}

/** Returns the complete picker value in 24-hour `HH:mm` form. */
export const value = (model: Model): Option.Option<string> =>
    Option.all({
        hour: bounded_integer(model.hour, 0, 23),
        minute: bounded_integer(model.minute, 0, 59),
    }).pipe(
        Option.map(
            ({ hour, minute }) =>
                `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
        )
    )

/** Reports whether neither time segment has been entered. */
export const is_empty = (model: Model): boolean =>
    model.hour === "" && model.minute === ""

/** Applies one segmented time picker Message. */
export const update = (model: Model, message: Message): Model =>
    M.value(message).pipe(
        M.tagsExhaustive({
            ChangedHour: ({ value }) =>
                modifyFields(model, { hour: () => value.slice(0, 2) }),
            ChangedMinute: ({ value }) =>
                modifyFields(model, { minute: () => value.slice(0, 2) }),
            SteppedHour: ({ amount }) => ({
                ...model,
                ...clock_parts(
                    (normalized_hour(model) + amount) * 60 +
                        normalized_minute(model)
                ),
            }),
            SteppedMinute: ({ amount }) => ({
                ...model,
                ...clock_parts(
                    normalized_hour(model) * 60 +
                        normalized_minute(model) +
                        amount
                ),
            }),
        })
    )

/** Per-render inputs for the segmented time picker. */
export type ViewInputs = Readonly<{
    label: string
    is_disabled?: boolean
    described_by?: string
}>

const input_class =
    "min-h-12 w-16 border-x-(length:--field-border-width) border-input bg-background px-1 text-center text-base tabular-nums text-foreground outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
const step_button_class =
    "inline-flex min-h-12 w-10 items-center justify-center bg-background text-lg font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:z-10 focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"

const segment_view = (
    config: Readonly<{
        id: string
        label: string
        description: string
        value: string
        maximum: string
        placeholder: string
        is_disabled: boolean
        is_invalid: boolean
        step: number
        on_input: (value: string) => Message
        on_step: (amount: number) => Message
    }>,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("grid gap-1")],
        [
            h.span(
                [h.Class("text-xs font-medium text-muted-foreground")],
                [config.label]
            ),
            h.div(
                [
                    h.Class(
                        "flex overflow-hidden rounded-[var(--radius-control)] border-(length:--field-border-width) border-input [box-shadow:var(--shadow-control)]"
                    ),
                ],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Disabled(config.is_disabled),
                            h.AriaLabel(
                                `Decrease ${config.label.toLowerCase()}`
                            ),
                            h.OnClick(config.on_step(-config.step)),
                            h.Class(step_button_class),
                        ],
                        ["−"]
                    ),
                    Ui.Input.view(
                        {
                            id: config.id,
                            type: "number",
                            value: config.value,
                            isDisabled: config.is_disabled,
                            isInvalid: config.is_invalid,
                            onInput: config.on_input,
                            placeholder: config.placeholder,
                            toView: (attributes) =>
                                h.div(
                                    [],
                                    [
                                        h.label(
                                            [
                                                ...attributes.label,
                                                h.Class("sr-only"),
                                            ],
                                            [config.label]
                                        ),
                                        h.input([
                                            ...attributes.input,
                                            h.Min("0"),
                                            h.Max(config.maximum),
                                            h.Step(String(config.step)),
                                            h.InputMode("numeric"),
                                            h.Class(input_class),
                                        ]),
                                        h.span(
                                            [
                                                ...attributes.description,
                                                h.Class("sr-only"),
                                            ],
                                            [config.description]
                                        ),
                                    ]
                                ),
                        },
                        h
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Disabled(config.is_disabled),
                            h.AriaLabel(
                                `Increase ${config.label.toLowerCase()}`
                            ),
                            h.OnClick(config.on_step(config.step)),
                            h.Class(step_button_class),
                        ],
                        ["+"]
                    ),
                ]
            ),
        ]
    )

/** Renders bounded hour and minute steppers as one accessible time picker. */
export const view = Submodel.defineView<Model, Message, ViewInputs>(
    (model, inputs, h): Html => {
        const disabled = inputs.is_disabled ?? false
        const hour = bounded_integer(model.hour, 0, 23)
        const minute = bounded_integer(model.minute, 0, 59)

        return h.fieldset(
            [
                ...(disabled ? [h.Disabled(true)] : []),
                ...(inputs.described_by === undefined
                    ? []
                    : [h.AriaDescribedBy(inputs.described_by)]),
                h.Class("space-y-1"),
            ],
            [
                h.legend(
                    [h.Class("text-sm font-medium text-foreground")],
                    [inputs.label]
                ),
                h.div(
                    [h.Class("flex flex-wrap items-end gap-2")],
                    [
                        segment_view(
                            {
                                id: `${model.id}-hour`,
                                label: "Hour",
                                description: "Enter an hour from 0 to 23.",
                                value: model.hour,
                                maximum: "23",
                                placeholder: "HH",
                                is_disabled: disabled,
                                is_invalid:
                                    model.hour !== "" && Option.isNone(hour),
                                step: 1,
                                on_input: (value) => ChangedHour({ value }),
                                on_step: (amount) => SteppedHour({ amount }),
                            },
                            h
                        ),
                        h.span(
                            [
                                h.Attribute("aria-hidden", "true"),
                                h.Class(
                                    "min-h-12 content-center pb-0.5 text-xl font-semibold text-muted-foreground"
                                ),
                            ],
                            [":"]
                        ),
                        segment_view(
                            {
                                id: `${model.id}-minute`,
                                label: "Minute",
                                description: "Enter minutes from 0 to 59.",
                                value: model.minute,
                                maximum: "59",
                                placeholder: "MM",
                                is_disabled: disabled,
                                is_invalid:
                                    model.minute !== "" &&
                                    Option.isNone(minute),
                                step: 5,
                                on_input: (value) => ChangedMinute({ value }),
                                on_step: (amount) => SteppedMinute({ amount }),
                            },
                            h
                        ),
                        h.span(
                            [
                                h.Class(
                                    "min-h-12 content-center pb-0.5 text-xs font-medium text-muted-foreground"
                                ),
                            ],
                            ["24-hour"]
                        ),
                    ]
                ),
            ]
        )
    }
)

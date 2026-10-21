import { Option } from "effect"
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"

export type RadioGroupOption<Value extends string, Message> = Readonly<{
    value: Value
    index: number
    isSelected: boolean
    option: ReadonlyArray<Attribute<Message>>
    label: ReadonlyArray<Attribute<Message>>
    description: ReadonlyArray<Attribute<Message>>
}>

export type RadioGroupRender<Value extends string, Message> = Readonly<{
    group: ReadonlyArray<Attribute<Message>>
    options: ReadonlyArray<RadioGroupOption<Value, Message>>
}>

type RadioGroupConfig<Value extends string, Message> = Readonly<{
    id: string
    selectedValue: Option.Option<Value>
    options: ReadonlyArray<Value>
    onSelect: (value: Value) => Message
    ariaLabel: string
    toView: (render: RadioGroupRender<Value, Message>) => Html
    orientation?: "Horizontal" | "Vertical"
}>

const option_id = (id: string, index: number): string => `${id}-option-${index}`

const label_id = (id: string, index: number): string =>
    `${id}-option-${index}-label`

const description_id = (id: string, index: number): string =>
    `${id}-option-${index}-description`

const selected_index = <Value extends string>(
    options: ReadonlyArray<Value>,
    selected_value: Option.Option<Value>
): number =>
    Option.match(selected_value, {
        onNone: () => -1,
        onSome: (value) => options.indexOf(value),
    })

const next_index = (
    key: string,
    current_index: number,
    option_count: number,
    orientation: "Horizontal" | "Vertical"
): number | undefined => {
    if (option_count === 0) {
        return undefined
    }

    const is_next_key =
        key === (orientation === "Horizontal" ? "ArrowRight" : "ArrowDown")
    const is_previous_key =
        key === (orientation === "Horizontal" ? "ArrowLeft" : "ArrowUp")

    if (is_next_key) {
        return (current_index + 1) % option_count
    }

    if (is_previous_key) {
        return (current_index - 1 + option_count) % option_count
    }

    if (key === "Home" || key === "PageUp") {
        return 0
    }

    if (key === "End" || key === "PageDown") {
        return option_count - 1
    }

    if (key === " ") {
        return current_index
    }

    return undefined
}

export const radioGroupView = <Value extends string, Message>(
    config: RadioGroupConfig<Value, Message>,
    h: HtmlBuilder<Message>
): Html => {
    const orientation = config.orientation ?? "Vertical"
    const current_selected_index = selected_index(
        config.options,
        config.selectedValue
    )
    const focused_index =
        current_selected_index === -1 ? 0 : current_selected_index

    const options = config.options.map((value, index) => {
        const is_selected = index === current_selected_index
        const is_focused = index === focused_index
        const id = option_id(config.id, index)

        return {
            value,
            index,
            isSelected: is_selected,
            option: [
                h.Id(id),
                h.Role("radio"),
                h.AriaChecked(is_selected),
                h.AriaLabelledBy(label_id(config.id, index)),
                h.AriaDescribedBy(description_id(config.id, index)),
                h.Tabindex(is_focused ? 0 : -1),
                ...(is_selected ? [h.DataAttribute("checked", "")] : []),
                ...(is_focused ? [h.DataAttribute("active", "")] : []),
                h.OnClick(config.onSelect(value), {
                    focusSelector: `#${CSS.escape(id)}`,
                }),
                h.OnKeyDownFocus((key) => {
                    const next = next_index(
                        key,
                        index,
                        config.options.length,
                        orientation
                    )

                    if (next === undefined) {
                        return Option.none()
                    }

                    const next_value = config.options[next]

                    if (next_value === undefined) {
                        return Option.none()
                    }

                    return Option.some({
                        focusSelector: `#${CSS.escape(option_id(config.id, next))}`,
                        message: config.onSelect(next_value),
                    })
                }),
            ],
            label: [h.Id(label_id(config.id, index))],
            description: [h.Id(description_id(config.id, index))],
        }
    })

    return config.toView({
        group: [
            h.Role("radiogroup"),
            h.AriaOrientation(orientation.toLowerCase()),
            h.AriaLabel(config.ariaLabel),
        ],
        options,
    })
}

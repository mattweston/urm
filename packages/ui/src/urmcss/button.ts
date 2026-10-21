import * as Headless from "@foldkit/ui/button"
import type { Html, HtmlBuilder } from "foldkit/html"

export type ButtonProps<Message> = Readonly<{
    children: ReadonlyArray<Html | string>
    onClick?: Message
    variant?: "primary" | "secondary" | "outline" | "quiet" | "danger"
    size?: "small" | "standard" | "large"
    disabled?: boolean
}> &
    (
        | Readonly<{ icon_only: true; label: string }>
        | Readonly<{ icon_only?: false; label?: string }>
    )

export const Button = <Message>(
    props: ButtonProps<Message>,
    h: HtmlBuilder<Message>
): Html =>
    Headless.view(
        {
            ...(props.onClick !== undefined ? { onClick: props.onClick } : {}),
            isDisabled: props.disabled ?? false,
            toView: ({ button }) =>
                h.button(
                    [
                        ...button,
                        h.DataAttribute("variant", props.variant ?? "primary"),
                        h.DataAttribute("size", props.size ?? "standard"),
                        ...(props.icon_only
                            ? [h.DataAttribute("content", "icon")]
                            : []),
                        ...(props.label ? [h.AriaLabel(props.label)] : []),
                    ],
                    props.children
                ),
        },
        h
    )

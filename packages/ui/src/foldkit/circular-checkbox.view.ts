import type { Html, HtmlBuilder } from "foldkit/html"

type Config<Message> = Readonly<{
    isChecked: boolean
    label: string
    onToggle: Message
}>

const checkmark = <Message>(h: HtmlBuilder<Message>): Html =>
    h.svg(
        [
            h.Xmlns("http://www.w3.org/2000/svg"),
            h.ViewBox("0 0 24 24"),
            h.Fill("none"),
            h.Stroke("currentColor"),
            h.StrokeWidth("3"),
            h.StrokeLinecap("round"),
            h.StrokeLinejoin("round"),
            h.Class("h-full w-full text-white"),
        ],
        [h.path([h.D("M5 13l4 4L19 7")])]
    )

/**
 * A model-controlled circular checkbox. The caller owns the checked state and
 * message; this component owns only the shared control markup and semantics.
 */
export const CircularCheckbox = <Message>(
    config: Config<Message>,
    h: HtmlBuilder<Message>
): Html =>
    h.button(
        [
            h.Type("button"),
            h.Role("checkbox"),
            h.AriaChecked(config.isChecked),
            h.AriaLabel(config.label),
            h.Class(
                config.isChecked
                    ? "group h-5 w-5 shrink-0 rounded-full border-2 border-primary bg-primary transition-all"
                    : "group h-5 w-5 shrink-0 rounded-full border-2 border-border bg-transparent transition-all hover:border-muted-foreground"
            ),
            h.OnClick(config.onToggle),
        ],
        config.isChecked ? [checkmark(h)] : []
    )

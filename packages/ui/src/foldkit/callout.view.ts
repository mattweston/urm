import { inertHtml as h, type Html } from "foldkit/html"

export type CalloutTone = "Note" | "Tip" | "Warning" | "Danger"
export type CalloutProps = Readonly<{
    tone?: CalloutTone
    title?: string
    class?: string
    children?: ReadonlyArray<Html | string>
}>

const tone_class_name = {
    Note: "documentation-callout-note",
    Tip: "documentation-callout-tip",
    Warning: "documentation-callout-warning",
    Danger: "documentation-callout-danger",
}

const tone_data_value = {
    Note: "note",
    Tip: "tip",
    Warning: "warning",
    Danger: "danger",
}

export const Callout = ({
    tone = "Note",
    title,
    children = [],
    class: class_name = "",
}: CalloutProps): Html =>
    h.aside(
        [
            h.Class(
                `documentation-callout ${tone_class_name[tone]} ${class_name}`
            ),
            h.DataAttribute("callout", ""),
            h.DataAttribute("callout-type", tone_data_value[tone]),
        ],
        [
            h.p(
                [
                    h.Class("documentation-callout-title"),
                    h.DataAttribute("callout-title", ""),
                ],
                [title ?? tone]
            ),
            h.div(
                [
                    h.Class("documentation-callout-body"),
                    h.DataAttribute("callout-body", ""),
                ],
                children
            ),
        ]
    )

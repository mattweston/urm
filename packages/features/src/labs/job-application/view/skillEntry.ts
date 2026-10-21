import clsx from "clsx"
import { Option } from "effect"
import { type Html, type HtmlBuilder } from "foldkit/html"

import * as ProficiencyLevel from "../domain/proficiencyLevel.ts"
import * as Entry from "../step/skills/entry.ts"
import { inputField } from "./field.ts"
import { radioGroupView } from "../../_shared/radio-group/controlled.ts"

export const skillEntryView = <ParentMessage>(
    model: Entry.Model,
    toParentMessage: (message: Entry.Message) => ParentMessage,
    onRemove: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const nameView = inputField<ParentMessage>(
        {
            id: `${model.id}-name`,
            label: "Skill",
            field: model.name,
            onInput: (value) => toParentMessage(Entry.UpdatedName({ value })),
            placeholder: "e.g. TypeScript, React, Effect-TS",
        },
        h
    )

    const proficiencyView = radioGroupView(
        {
            id: `${model.id}-proficiency`,
            selectedValue: Option.some(model.proficiency),
            onSelect: (value) =>
                toParentMessage(Entry.SelectedProficiency({ value })),
            options: ProficiencyLevel.all,
            ariaLabel: "Proficiency level",
            orientation: "Horizontal",
            toView: (render) =>
                h.div(
                    [...render.group, h.Class("inline-flex flex-wrap gap-2")],
                    render.options.map((option) =>
                        h.label(
                            [
                                ...option.option,
                                h.Class(
                                    clsx(
                                        "cursor-pointer rounded-full border-(length:--control-outline-border-width) border-border px-3 py-1 text-sm transition select-none [box-shadow:var(--shadow-control)]",
                                        option.isSelected
                                            ? "border-primary bg-accent text-accent-foreground"
                                            : "border-border text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground"
                                    )
                                ),
                            ],
                            [
                                h.span(
                                    [...option.label, h.Class("font-medium")],
                                    [option.value]
                                ),
                            ]
                        )
                    )
                ),
        },
        h
    )

    return h.keyed("div")(
        model.id,
        [h.Class("py-6 space-y-4 first:pt-0")],
        [
            nameView,
            h.div(
                [h.Class("space-y-2")],
                [
                    h.span(
                        [h.Class("block text-sm font-medium text-foreground")],
                        ["Proficiency"]
                    ),
                    proficiencyView,
                ]
            ),
            h.div(
                [h.Class("flex justify-end")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(onRemove),
                            h.Class(
                                "text-sm text-muted-foreground hover:text-destructive transition cursor-pointer"
                            ),
                        ],
                        ["Remove skill"]
                    ),
                ]
            ),
        ]
    )
}

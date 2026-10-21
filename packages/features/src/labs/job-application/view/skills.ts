import { type Html, type HtmlBuilder } from "foldkit/html"

import * as Skills from "../step/skills/skills.ts"
import { skillEntryView } from "./skillEntry.ts"

export const skillsView = <ParentMessage>(
    model: Skills.Model,
    toParentMessage: (message: Skills.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("space-y-6")],
        [
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                ["Add your technical and professional skills."]
            ),
            h.div(
                [h.Class("divide-y divide-border")],
                model.entries.map((entry) =>
                    skillEntryView<ParentMessage>(
                        entry,
                        (message) =>
                            toParentMessage(
                                Skills.GotEntryMessage({
                                    entryId: entry.id,
                                    message,
                                })
                            ),
                        toParentMessage(
                            Skills.RemovedEntry({ entryId: entry.id })
                        ),
                        h
                    )
                )
            ),
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(toParentMessage(Skills.ClickedAddEntry())),
                    h.Class(
                        "w-full rounded-[var(--radius-control)] border-2 border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition cursor-pointer"
                    ),
                ],
                ["+ Add Skill"]
            ),
        ]
    )
}

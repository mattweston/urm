import { type Html, type HtmlBuilder } from "foldkit/html"

import * as Education from "../step/education/education.ts"
import { educationEntryView } from "./educationEntry.ts"

export const educationView = <ParentMessage>(
    model: Education.Model,
    toParentMessage: (message: Education.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("space-y-6")],
        [
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                ["Add your educational background."]
            ),
            h.div(
                [h.Class("divide-y divide-border")],
                model.entries.map((entry) =>
                    educationEntryView<ParentMessage>(
                        entry,
                        model.today,
                        (message) =>
                            toParentMessage(
                                Education.GotEntryMessage({
                                    entryId: entry.id,
                                    message,
                                })
                            ),
                        toParentMessage(
                            Education.RemovedEntry({ entryId: entry.id })
                        ),
                        h
                    )
                )
            ),
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(toParentMessage(Education.ClickedAddEntry())),
                    h.Class(
                        "w-full rounded-[var(--radius-control)] border-2 border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition cursor-pointer"
                    ),
                ],
                ["+ Add Education"]
            ),
        ]
    )
}

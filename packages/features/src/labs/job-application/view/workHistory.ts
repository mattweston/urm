import { type Html, type HtmlBuilder } from "foldkit/html"

import * as WorkHistory from "../step/workHistory/workHistory.ts"
import { workEntryView } from "./workEntry.ts"

export const workHistoryView = <ParentMessage>(
    model: WorkHistory.Model,
    toParentMessage: (message: WorkHistory.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("space-y-6")],
        [
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Add your relevant work experience, starting with the most recent.",
                ]
            ),
            h.div(
                [h.Class("divide-y divide-border")],
                model.entries.map((entry) =>
                    workEntryView<ParentMessage>(
                        entry,
                        (message) =>
                            toParentMessage(
                                WorkHistory.GotEntryMessage({
                                    entryId: entry.id,
                                    message,
                                })
                            ),
                        toParentMessage(
                            WorkHistory.RemovedEntry({ entryId: entry.id })
                        ),
                        h
                    )
                )
            ),
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(toParentMessage(WorkHistory.ClickedAddEntry())),
                    h.Class(
                        "w-full rounded-[var(--radius-control)] border-2 border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition cursor-pointer"
                    ),
                ],
                ["+ Add Position"]
            ),
        ]
    )
}

import { type Html, inertHtml } from "foldkit/html"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "./card.view.ts"
import { Separator } from "./separator.view.ts"

type ShareDocumentProps = Readonly<{
    linkField: Html
    copyButton: Html
    peopleRows: ReadonlyArray<Html>
}>

export const ShareDocument = (props: ShareDocumentProps): Html => {
    const h = inertHtml

    return Card({
        children: [
            CardHeader({
                children: [
                    CardTitle({ children: ["Share this document"] }),
                    CardDescription({
                        children: [
                            "Anyone with the link can view this document.",
                        ],
                    }),
                ],
            }),
            CardContent({
                children: [
                    h.div(
                        [h.Class("flex flex-wrap items-start gap-2")],
                        [
                            h.div(
                                [h.Class("min-w-0 flex-1 basis-48")],
                                [props.linkField]
                            ),
                            props.copyButton,
                        ]
                    ),
                    Separator({ class: "my-4" }),
                    h.div(
                        [h.Class("space-y-4")],
                        [
                            h.h4(
                                [h.Class("text-sm font-medium")],
                                ["People with access"]
                            ),
                            h.div([h.Class("grid gap-6")], props.peopleRows),
                        ]
                    ),
                ],
            }),
        ],
    })
}

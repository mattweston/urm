import { type Html, inertHtml } from "foldkit/html"
import { Button } from "./button/button.view.ts"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "./card.view.ts"

type ReportAnIssueProps = Readonly<{
    areaField: Html
    securityLevelField: Html
    subjectField: Html
    descriptionField: Html
}>

const h = inertHtml

export const ReportAnIssue = (props: ReportAnIssueProps): Html =>
    Card({
        children: [
            CardHeader({
                children: [
                    CardTitle({ children: ["Report an issue"] }),
                    CardDescription({
                        children: ["What area are you having problems with?"],
                    }),
                ],
            }),
            CardContent({
                class: "grid gap-6",
                children: [
                    h.div(
                        [
                            h.Class(
                                "grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4"
                            ),
                        ],
                        [props.areaField, props.securityLevelField]
                    ),
                    props.subjectField,
                    props.descriptionField,
                ],
            }),
            CardFooter({
                class: "flex-wrap justify-between gap-2",
                children: [
                    Button({ variant: "ghost", children: ["Cancel"] }, h),
                    Button({ children: ["Submit"] }, h),
                ],
            }),
        ],
    })

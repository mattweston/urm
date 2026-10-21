import { type Html, type HtmlBuilder } from "foldkit/html"
import { IconBrandGithub, IconBrandGoogle } from "./icons/view.ts"
import { Button } from "./button/button.view.ts"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "./card.view.ts"
import { Grid } from "./grid.view.ts"

type RegisterProps<ParentMessage> = Readonly<{
    onSubmit: ParentMessage
    isSubmitting: boolean
    emailField: Html
    passwordField: Html
    backHref: string
    backLabel: string
}>

export const Register = <ParentMessage>(
    props: RegisterProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("mx-auto grid max-w-md gap-6 px-4")],
        [
            h.form(
                [h.OnSubmit(props.onSubmit)],
                [
                    Card({
                        children: [
                            CardHeader({
                                class: "space-y-1",
                                children: [
                                    CardTitle({
                                        class: "text-2xl",
                                        children: ["Create an account"],
                                    }),
                                    CardDescription({
                                        children: [
                                            "Enter your email below to create your account",
                                        ],
                                    }),
                                ],
                            }),
                            CardContent({
                                class: "grid gap-4",
                                children: [
                                    Grid({
                                        class: "grid grid-cols-2 gap-6",
                                        children: [
                                            Button(
                                                {
                                                    variant: "outline",
                                                    type: "button",
                                                    disabled:
                                                        props.isSubmitting,
                                                    children: [
                                                        IconBrandGithub({
                                                            class: "mr-2 size-4",
                                                        }),
                                                        "Github",
                                                    ],
                                                },
                                                h
                                            ),
                                            Button(
                                                {
                                                    variant: "outline",
                                                    type: "button",
                                                    disabled:
                                                        props.isSubmitting,
                                                    children: [
                                                        IconBrandGoogle({
                                                            class: "mr-2 size-4",
                                                        }),
                                                        "Google",
                                                    ],
                                                },
                                                h
                                            ),
                                        ],
                                    }),
                                    h.div(
                                        [h.Class("relative")],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "absolute inset-0 flex items-center"
                                                    ),
                                                ],
                                                [
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                "w-full border-t-(length:--surface-border-width) border-border"
                                                            ),
                                                        ],
                                                        []
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "relative flex justify-center text-xs uppercase"
                                                    ),
                                                ],
                                                [
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                "bg-background px-2 text-muted-foreground"
                                                            ),
                                                        ],
                                                        ["Or continue with"]
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                    props.emailField,
                                    props.passwordField,
                                ],
                            }),
                            CardFooter({
                                children: [
                                    Button(
                                        {
                                            type: "submit",
                                            disabled: props.isSubmitting,
                                            class: "w-full",
                                            children: [
                                                props.isSubmitting
                                                    ? "Creating account..."
                                                    : "Create account",
                                            ],
                                        },
                                        h
                                    ),
                                ],
                            }),
                        ],
                    }),
                    h.div(
                        [h.Class("text-center text-sm text-muted-foreground")],
                        [
                            "Already have an account? ",
                            h.a(
                                [
                                    h.Href(props.backHref),
                                    h.Class(
                                        "font-medium text-primary hover:underline"
                                    ),
                                ],
                                [props.backLabel]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

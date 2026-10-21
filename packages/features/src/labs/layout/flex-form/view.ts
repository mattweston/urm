import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    SubmittedForm,
    UpdatedEmail,
    UpdatedName,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"

// One custom property feeds both the gap between fields and the margin around
// them, so the rhythm is set in a single place. `gap-(--gap)` is the Tailwind
// v4 spelling of `gap-[var(--gap)]`.
const formClassName =
    "[--gap:0.5rem] flex max-w-2xl flex-wrap gap-(--gap) m-(--gap) *:mt-4"

// grow lets a field take the leftover width; min-w-40 is the floor it will not
// go below, which is what makes the row break instead of squeezing
const fieldClassName =
    "flex grow items-center min-w-40 rounded border-2 border-solid border-border bg-muted"

const labelClassName = "min-w-[5ch] px-2 text-sm font-medium text-foreground"

const inputClassName =
    "grow m-0 border-0 bg-transparent p-2 text-foreground outline-none placeholder:text-muted-foreground"

const buttonClassName =
    "grow min-w-40 rounded border-2 border-solid border-primary bg-primary p-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"

const descriptionClassName = "text-sm text-muted-foreground"

const field = <ParentMessage>(
    config: Readonly<{
        id: string
        label: string
        type: string
        value: string
        placeholder: string
        onInput: (value: string) => ParentMessage
    }>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Input.view(
        {
            id: config.id,
            type: config.type,
            value: config.value,
            placeholder: config.placeholder,
            onInput: config.onInput,
            toView: (attributes) =>
                h.div(
                    [h.Class(fieldClassName)],
                    [
                        h.label(
                            [...attributes.label, h.Class(labelClassName)],
                            [config.label]
                        ),
                        h.input([...attributes.input, h.Class(inputClassName)]),
                    ]
                ),
        },
        h
    )

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("mx-auto w-full max-w-5xl px-6 py-10")],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Flex Form"]
            ),

            h.p(
                [h.Class(`${descriptionClassName} max-w-2xl`)],
                [
                    "Every child of the form grows to fill the row and refuses to go below 10rem. Narrow the window and the row breaks rather than squeezing the fields, so the same markup reads as a row on a desktop and a stack on a phone -- no breakpoints involved.",
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Demo"]
            ),
            h.form(
                [
                    h.Id("flex-form-demo"),
                    h.Class(formClassName),
                    h.OnSubmit(toParentMessage(SubmittedForm())),
                ],
                [
                    field(
                        {
                            id: "flex-form-name",
                            label: "Name",
                            type: "text",
                            value: model.name,
                            placeholder: "Ada Lovelace",
                            onInput: (value) =>
                                toParentMessage(UpdatedName({ value })),
                        },
                        h
                    ),
                    field(
                        {
                            id: "flex-form-email",
                            label: "Email",
                            type: "email",
                            value: model.email,
                            placeholder: "ada@example.com",
                            onInput: (value) =>
                                toParentMessage(UpdatedEmail({ value })),
                        },
                        h
                    ),
                    h.button(
                        [h.Type("submit"), h.Class(buttonClassName)],
                        ["Submit"]
                    ),
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Last submission"]
            ),
            model.submitted === null
                ? h.p([h.Class(descriptionClassName)], ["Nothing submitted."])
                : h.dl(
                      [h.Class("grid max-w-2xl grid-cols-[6rem_1fr] gap-x-4")],
                      [
                          h.dt(
                              [h.Class("text-sm text-muted-foreground")],
                              ["Name"]
                          ),
                          h.dd(
                              [h.Class("text-sm text-foreground")],
                              [model.submitted.name || "(empty)"]
                          ),
                          h.dt(
                              [h.Class("text-sm text-muted-foreground")],
                              ["Email"]
                          ),
                          h.dd(
                              [h.Class("text-sm text-foreground")],
                              [model.submitted.email || "(empty)"]
                          ),
                      ]
                  ),
        ]
    )

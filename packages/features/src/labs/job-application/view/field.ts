import clsx from "clsx"
import { Match as M } from "effect"
import * as Ui from "@foldkit/ui"
import { type Field } from "foldkit/fieldValidation"
import { type Html, type HtmlBuilder } from "foldkit/html"

const borderClass = (field: Field<string>): string =>
    M.value(field).pipe(
        M.tagsExhaustive({
            NotValidated: () => "border-border",
            Validating: () => "border-primary/50",
            Valid: () => "border-primary",
            Invalid: () => "border-destructive",
        })
    )

export const inputField = <ParentMessage>(
    config: Readonly<{
        id: string
        label: string
        field: Field<string>
        onInput: (value: string) => ParentMessage
        type?: string
        placeholder?: string
    }>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return Ui.Input.view(
        {
            id: config.id,
            value: config.field.value,
            onInput: config.onInput,
            isInvalid: config.field._tag === "Invalid",
            ...(config.type !== undefined && { type: config.type }),
            ...(config.placeholder !== undefined && {
                placeholder: config.placeholder,
            }),
            toView: (attributes) =>
                h.keyed("div")(
                    config.id,
                    [h.Class("space-y-1")],
                    [
                        h.div(
                            [h.Class("flex items-center gap-2")],
                            [
                                h.label(
                                    [
                                        ...attributes.label,
                                        h.Class(
                                            "block text-sm font-medium text-foreground"
                                        ),
                                    ],
                                    [config.label]
                                ),
                                ...M.value(config.field).pipe(
                                    M.tag("Validating", () => [
                                        h.span(
                                            [
                                                h.Class(
                                                    "text-primary text-sm animate-spin"
                                                ),
                                            ],
                                            ["◐"]
                                        ),
                                    ]),
                                    M.tag("Valid", () => [
                                        h.span(
                                            [h.Class("text-primary text-sm")],
                                            ["✓"]
                                        ),
                                    ]),
                                    M.orElse(() => [])
                                ),
                            ]
                        ),
                        h.input([
                            ...attributes.input,
                            h.Class(
                                clsx(
                                    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring",
                                    borderClass(config.field)
                                )
                            ),
                        ]),
                        ...(config.field._tag === "Invalid"
                            ? [
                                  h.span(
                                      [
                                          ...attributes.description,
                                          h.Class(
                                              "block text-sm text-destructive mt-0.5"
                                          ),
                                      ],
                                      [config.field.errors[0]]
                                  ),
                              ]
                            : []),
                    ]
                ),
        },
        h
    )
}

export const textareaField = <ParentMessage>(
    config: Readonly<{
        id: string
        label: string
        value: string
        onInput: (value: string) => ParentMessage
        rows?: number
        placeholder?: string
    }>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return Ui.Textarea.view(
        {
            id: config.id,
            value: config.value,
            onInput: config.onInput,
            rows: config.rows ?? 4,
            ...(config.placeholder !== undefined && {
                placeholder: config.placeholder,
            }),
            toView: (attributes) =>
                h.div(
                    [h.Class("space-y-1")],
                    [
                        h.label(
                            [
                                ...attributes.label,
                                h.Class(
                                    "block text-sm font-medium text-foreground"
                                ),
                            ],
                            [config.label]
                        ),
                        h.textarea([
                            ...attributes.textarea,
                            h.Class(
                                "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            ),
                        ]),
                    ]
                ),
        },
        h
    )
}

export const selectField = <ParentMessage>(
    config: Readonly<{
        id: string
        label: string
        value: string
        onChange: (value: string) => ParentMessage
        options: ReadonlyArray<Readonly<{ value: string; label: string }>>
        placeholder?: string
    }>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return Ui.Select.view(
        {
            id: config.id,
            value: config.value,
            onChange: config.onChange,
            toView: (attributes) =>
                h.div(
                    [h.Class("space-y-1")],
                    [
                        h.label(
                            [
                                ...attributes.label,
                                h.Class(
                                    "block text-sm font-medium text-foreground"
                                ),
                            ],
                            [config.label]
                        ),
                        h.select(
                            [
                                ...attributes.select,
                                h.Class(
                                    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                ),
                            ],
                            [
                                ...(config.placeholder
                                    ? [
                                          h.option(
                                              [h.Value(""), h.Disabled(true)],
                                              [config.placeholder]
                                          ),
                                      ]
                                    : []),
                                ...config.options.map(
                                    ({ value, label: optionLabel }) =>
                                        h.option(
                                            [h.Value(value)],
                                            [optionLabel]
                                        )
                                ),
                            ]
                        ),
                    ]
                ),
        },
        h
    )
}

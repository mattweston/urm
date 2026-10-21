import { Match as M } from "effect"
import type { Field } from "foldkit/fieldValidation"
import { type Html, inertHtml, type HtmlBuilder } from "foldkit/html"

type WithClassProps = Readonly<{
    class?: string
    children?: ReadonlyArray<Html | string>
}>

type TextFieldInputProps<ParentMessage> = Readonly<{
    id: string
    field: Field<string>
    onInput?: (value: string) => ParentMessage
    type?: "text" | "email" | "password"
    placeholder?: string
    autocomplete?: string
    autofocus?: boolean
    readOnly?: boolean
    class?: string
}>

type TextFieldTextAreaProps<ParentMessage> = Readonly<{
    id: string
    value: string
    onInput: (value: string) => ParentMessage
    placeholder?: string
    class?: string
}>

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

const fieldToBorderClass = (field: Field<string>) =>
    M.value(field).pipe(
        M.tagsExhaustive({
            NotValidated: () => "border-input",
            Validating: () => "border-primary",
            Valid: () => "border-primary",
            Invalid: () => "border-destructive",
        })
    )

export const TextField = (props: WithClassProps): Html => {
    const h = inertHtml

    return h.div(
        [h.Class(joinClassName("grid", props.class))],
        props.children ?? []
    )
}

export const TextFieldLabel = (
    props: WithClassProps & Readonly<{ for: string }>
): Html => {
    const h = inertHtml

    return h.label(
        [
            h.For(props.for),
            h.Class(
                joinClassName(
                    "text-sm font-medium text-foreground",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}

export const TextFieldInput = <ParentMessage>(
    props: TextFieldInputProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.input([
        h.Id(props.id),
        h.Type(props.type ?? "text"),
        h.Value(props.field.value),
        ...(props.placeholder !== undefined
            ? [h.Placeholder(props.placeholder)]
            : []),
        ...(props.autocomplete !== undefined
            ? [h.Autocomplete(props.autocomplete)]
            : []),
        ...(props.autofocus ? [h.Autofocus(true)] : []),
        ...(props.readOnly ? [h.Readonly(true)] : []),
        h.AriaInvalid(props.field._tag === "Invalid"),
        h.Class(
            joinClassName(
                "w-full rounded-[var(--radius-control)] border-(length:--field-border-width) bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]",
                joinClassName(fieldToBorderClass(props.field), props.class)
            )
        ),
        ...(props.onInput !== undefined ? [h.OnInput(props.onInput)] : []),
    ])
}

export const TextFieldTextArea = <ParentMessage>(
    props: TextFieldTextAreaProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.textarea([
        h.Id(props.id),
        h.Value(props.value),
        ...(props.placeholder !== undefined
            ? [h.Placeholder(props.placeholder)]
            : []),
        h.Class(
            joinClassName(
                "min-h-32 w-full rounded-[var(--radius-control)] border-(length:--field-border-width) bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]",
                props.class
            )
        ),
        h.OnInput(props.onInput),
    ])
}

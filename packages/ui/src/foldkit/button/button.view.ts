import { type Attribute, type Html, type HtmlBuilder } from "foldkit/html"

type ButtonProps<ParentMessage = never> = Readonly<{
    type?: "button" | "submit" | "reset"
    disabled?: boolean
    isDisabled?: boolean | undefined
    variant?: "default" | "secondary" | "outline" | "ghost"
    size?: "default" | "sm" | "lg" | "icon"
    class?: string
    className?: string
    attributes?: ReadonlyArray<Attribute<ParentMessage>>
    children?: ReadonlyArray<Html | string>
    onClick?: ParentMessage
}>

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

const variantClassName = (variant: ButtonProps["variant"]) =>
    variant === "outline"
        ? "border-(length:--control-outline-border-width) border-border bg-background text-foreground [box-shadow:var(--shadow-control)] hover:bg-accent hover:text-accent-foreground hover:[box-shadow:var(--shadow-control-hover)]"
        : variant === "ghost"
          ? "border-transparent bg-transparent text-foreground shadow-none hover:bg-accent hover:text-accent-foreground"
          : variant === "secondary"
            ? "bg-secondary text-secondary-foreground [box-shadow:var(--shadow-control)] hover:bg-secondary-hover hover:[box-shadow:var(--shadow-control-hover)]"
            : "bg-primary text-primary-foreground [box-shadow:var(--shadow-primary)] hover:bg-primary-hover hover:[box-shadow:var(--shadow-control-hover)] disabled:bg-secondary disabled:text-secondary-foreground disabled:opacity-100 disabled:hover:bg-secondary disabled:[box-shadow:var(--shadow-control)]"

const sizeClassName = (size: ButtonProps["size"]) =>
    size === "icon"
        ? "size-9 p-0"
        : size === "sm"
          ? "h-8 px-3 text-xs"
          : size === "lg"
            ? "h-11 px-6"
            : "h-10 px-4"

export const Button = <ParentMessage>(
    props: ButtonProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const isDisabled = props.disabled ?? props.isDisabled ?? false
    const className = joinClassName(
        "inline-flex items-center justify-center rounded-[var(--radius-control)] border-border [border-style:var(--control-border-style)] [border-width:var(--control-border-width)] [font-family:var(--control-font-family)] [font-weight:var(--control-font-weight)] [letter-spacing:var(--control-letter-spacing)] [text-transform:var(--control-text-transform)] transition-[background-color,box-shadow,transform,color] duration-100 hover:-translate-y-[var(--control-hover-translate)] active:translate-x-[var(--control-press-translate)] active:translate-y-[var(--control-press-translate)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]",
        joinClassName(
            variantClassName(props.variant),
            joinClassName(
                sizeClassName(props.size),
                props.className ?? props.class
            )
        )
    )

    return h.button(
        [
            h.Type(props.type ?? "button"),
            ...(isDisabled ? [h.Disabled(true)] : []),
            ...(props.onClick !== undefined ? [h.OnClick(props.onClick)] : []),
            ...(props.attributes ?? []),
            h.Class(className),
        ],
        props.children ?? []
    )
}

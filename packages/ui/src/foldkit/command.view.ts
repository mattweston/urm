import { Effect } from "effect"
import { Mount } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { type Html, inertHtml, type HtmlBuilder } from "foldkit/html"
import { Button } from "./button/button.view.ts"
import { IconSearch } from "./icons/view.ts"

type WithClassProps = Readonly<{
    class?: string
    children?: ReadonlyArray<Html | string>
}>

type CommandInputProps<ParentMessage> = Readonly<{
    value: string
    onInput: (value: string) => ParentMessage
    placeholder?: string
    autofocus?: boolean
    label?: string
    class?: string
}>

type CommandItemProps<ParentMessage> = Readonly<{
    href?: string
    onClick?: ParentMessage
    class?: string
    children?: ReadonlyArray<Html | string>
}>

type CommandGroupProps = WithClassProps &
    Readonly<{
        heading?: string
    }>

type CommandDialogProps<ParentMessage> = Readonly<{
    open: boolean
    onOpenChange: ParentMessage
    onMounted: ParentMessage
    label?: string
    class?: string
    children?: ReadonlyArray<Html | string>
}>

const h = inertHtml

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

export const Command = (props: WithClassProps): Html =>
    h.div(
        [
            h.Class(
                joinClassName(
                    "flex size-full flex-col overflow-hidden rounded-[var(--radius-surface)] bg-popover text-popover-foreground blur-none",
                    props.class
                )
            ),
            h.Attribute("cmdk-root", ""),
        ],
        props.children ?? []
    )

const MountedCommandDialog = taggedStruct("MountedCommandDialog")

export const OpenCommandDialog = Mount.define("OpenCommandDialog", {
    messages: [MountedCommandDialog],
    execute: ({ element }) =>
        Effect.gen(function* () {
            if (!(element instanceof HTMLDialogElement))
                return MountedCommandDialog()
            yield* Effect.acquireRelease(
                Effect.sync(() => {
                    const previous_focus = element.ownerDocument.activeElement
                    element.showModal()
                    return previous_focus
                }),
                (previous_focus) =>
                    Effect.sync(() => {
                        element.close()
                        if (
                            previous_focus instanceof HTMLElement &&
                            previous_focus.isConnected &&
                            !element.ownerDocument.querySelector("dialog[open]")
                        )
                            previous_focus.focus()
                    })
            )
            return MountedCommandDialog()
        }),
})

export const CommandDialog = <ParentMessage>(
    props: CommandDialogProps<ParentMessage>,
    command_h: HtmlBuilder<ParentMessage>
): Html => {
    if (!props.open) {
        return command_h.empty
    }

    return command_h.dialog(
        [
            command_h.AriaLabel(props.label ?? "Search"),
            command_h.OnCancel(props.onOpenChange),
            command_h.Attribute("data-page-search", ""),
            command_h.OnMount(
                Mount.mapMessage(OpenCommandDialog(), () => props.onMounted)
            ),
            command_h.Class(
                joinClassName(
                    "fixed inset-x-4 top-[min(6rem,10dvh)] m-0 mx-auto max-h-[80dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-hidden rounded-[var(--radius-surface)] border border-border bg-popover p-0 text-popover-foreground [box-shadow:var(--shadow-overlay)] backdrop:bg-background/80 backdrop:backdrop-blur-sm",
                    props.class
                )
            ),
        ],
        [
            Command({
                class: "h-auto max-h-[80dvh]",
                children: [
                    command_h.div(
                        [
                            command_h.Class(
                                "flex shrink-0 items-center justify-between gap-4 border-b border-border px-3 py-2"
                            ),
                        ],
                        [
                            command_h.span(
                                [command_h.Class("text-sm font-medium")],
                                [props.label ?? "Search"]
                            ),
                            Button(
                                {
                                    variant: "ghost",
                                    class: "h-auto min-h-9 px-3 py-1.5",
                                    onClick: props.onOpenChange,
                                    children: ["Close"],
                                },
                                command_h
                            ),
                        ]
                    ),
                    ...(props.children ?? []),
                ],
            }),
        ]
    )
}

export const CommandInput = <ParentMessage>(
    props: CommandInputProps<ParentMessage>,
    command_h: HtmlBuilder<ParentMessage>
): Html => {
    return command_h.div(
        [
            command_h.Class(
                "flex shrink-0 items-center border-b border-border px-3"
            ),
            command_h.Attribute("cmdk-input-wrapper", ""),
        ],
        [
            IconSearch({ class: "me-2 size-4 shrink-0 text-muted-foreground" }),
            command_h.input([
                command_h.Type("search"),
                command_h.AriaLabel(props.label ?? "Search pages"),
                command_h.Value(props.value),
                ...(props.placeholder !== undefined
                    ? [command_h.Placeholder(props.placeholder)]
                    : []),
                ...(props.autofocus ? [command_h.Autofocus(true)] : []),
                command_h.Class(
                    joinClassName(
                        "flex min-h-12 min-w-0 w-full rounded-[var(--radius-control)] bg-transparent py-3 text-base placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)] sm:text-sm",
                        props.class
                    )
                ),
                command_h.OnInput((value) => props.onInput(value)),
                command_h.Attribute("cmdk-input", ""),
            ]),
        ]
    )
}

export const CommandList = (props: WithClassProps): Html =>
    h.div(
        [
            h.Class(
                joinClassName(
                    "min-h-0 max-h-[300px] overflow-y-auto overflow-x-hidden overscroll-contain",
                    props.class
                )
            ),
            h.Attribute("cmdk-list", ""),
        ],
        props.children ?? []
    )

export const CommandEmpty = (props: WithClassProps): Html =>
    h.div(
        [
            h.Class(joinClassName("py-6 text-center text-sm", props.class)),
            h.Attribute("cmdk-empty", ""),
        ],
        props.children ?? []
    )

export const CommandGroup = (props: CommandGroupProps): Html =>
    h.div(
        [
            h.Attribute("cmdk-group", ""),
            h.Class(
                joinClassName(
                    "overflow-hidden p-1 text-foreground",
                    props.class
                )
            ),
        ],
        [
            ...(props.heading === undefined
                ? []
                : [
                      h.div(
                          [
                              h.Class(
                                  "px-2 py-1.5 text-xs font-medium text-muted-foreground [overflow-wrap:anywhere]"
                              ),
                              h.Attribute("cmdk-group-heading", ""),
                          ],
                          [props.heading]
                      ),
                  ]),
            ...(props.children ?? []),
        ]
    )

export const CommandSeparator = (props: WithClassProps): Html =>
    h.div(
        [
            h.Class(joinClassName("h-px bg-border", props.class)),
            h.Attribute("cmdk-separator", ""),
        ],
        props.children ?? []
    )

export const CommandItem = <ParentMessage>(
    props: CommandItemProps<ParentMessage>,
    command_h: HtmlBuilder<ParentMessage>
): Html => {
    const attributes = [
        command_h.Class(
            joinClassName(
                "relative flex min-w-0 cursor-default select-none items-center rounded-[var(--radius-control)] px-2 py-1.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]",
                props.class
            )
        ),
        command_h.Attribute("cmdk-item", ""),
        ...(props.onClick !== undefined
            ? [command_h.OnClick(props.onClick)]
            : []),
    ]

    return props.href === undefined
        ? command_h.button(
              [command_h.Type("button"), ...attributes],
              props.children ?? []
          )
        : command_h.a(
              [command_h.Href(props.href), ...attributes],
              props.children ?? []
          )
}

export const CommandShortcut = (props: WithClassProps): Html =>
    h.span(
        [
            h.Class(
                joinClassName(
                    "ms-auto shrink-0 text-xs tracking-widest text-muted-foreground",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )

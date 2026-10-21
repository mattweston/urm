import { Effect } from "effect"
import { Mount } from "foldkit"
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"
import { Button } from "../button/button.view.ts"
import {
    filteredRichTextSlashCommands,
    normalizeRichTextSlashMenuIndex,
} from "./rich-text-editor.commands.ts"
import { positionRichTextSlashMenu } from "./rich-text-editor.dom.ts"
import {
    ClosedRichTextEditorSlashMenu,
    RestoredRichTextEditorSelection,
    SelectedRichTextEditorSlashCommand,
    type RichTextEditorMessage,
    type RichTextEditorModel,
} from "./rich-text-editor.schema.ts"
import type { RichTextSlashCommand } from "./rich-text-editor.commands.ts"

export type RichTextEditorSlashMenuProps<Message> = Readonly<{
    model: RichTextEditorModel
    toParentMessage: (message: RichTextEditorMessage) => Message
    isBackdropDisabled?: boolean | undefined
}>

const slashMenuPositionMount = <Message>(
    props: RichTextEditorSlashMenuProps<Message>,
    h: HtmlBuilder<Message>
): Attribute<Message> => {
    const { OnMount } = h
    return OnMount(
        Mount.mapMessage(
            Mount.define("position-rich-text-editor-slash-menu", {
                messages: [RestoredRichTextEditorSelection],
                execute: ({ element }) =>
                    Effect.sync(() => {
                        requestAnimationFrame(() => {
                            if (element instanceof HTMLElement)
                                positionRichTextSlashMenu(
                                    element,
                                    props.model.selection
                                )
                        })
                        return RestoredRichTextEditorSelection()
                    }),
            })(),
            props.toParentMessage
        )
    )
}

const renderSlashMenuBackdrop = <Message>(
    props: RichTextEditorSlashMenuProps<Message>,
    h: HtmlBuilder<Message>
): Html => {
    const { Class, AriaLabel } = h
    return Button(
        {
            variant: "ghost",
            onClick: props.toParentMessage(ClosedRichTextEditorSlashMenu()),
            attributes: [
                AriaLabel("Close rich text command menu"),
                Class(
                    "fixed inset-0 z-40 h-auto w-auto rounded-none bg-transparent p-0 hover:bg-transparent"
                ),
            ],
            children: [],
        },
        h
    )
}

const renderSlashMenuHeader = <Message>(
    query: string,
    h: HtmlBuilder<Message>
): Html => {
    const { div, span, Class } = h
    return div(
        [
            Class(
                "shrink-0 [overflow-wrap:anywhere] border-b-(length:--surface-border-width) border-border px-[var(--space-3)] py-[var(--space-2)] text-(length:--font-size-sm) leading-[var(--line-height-sm)] text-muted-foreground"
            ),
        ],
        [span([Class("text-foreground")], [`/${query}`])]
    )
}

const renderSlashCommandItem = <Message>(
    {
        command,
        isActive,
        toParentMessage,
    }: Readonly<{
        command: RichTextSlashCommand
        isActive: boolean
        toParentMessage: (message: RichTextEditorMessage) => Message
    }>,
    h: HtmlBuilder<Message>
): Html => {
    const { div, span, Class, OnClick, Role, Attribute, Tabindex } = h

    return div(
        [
            Role("option"),
            Attribute("aria-selected", isActive ? "true" : "false"),
            Tabindex(-1),
            Class(
                `min-w-0 [overflow-wrap:anywhere] cursor-default rounded-md px-3 py-2 text-(length:--font-size-sm) leading-[var(--line-height-sm)] outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${isActive ? "bg-accent text-accent-foreground" : ""}`
            ),
            OnClick(
                toParentMessage(
                    SelectedRichTextEditorSlashCommand({ value: command.value })
                )
            ),
        ],
        [span([Class("font-medium")], [command.label])]
    )
}

const renderEmptySlashCommands = <Message>(h: HtmlBuilder<Message>): Html => {
    const { p, Class } = h
    return p(
        [
            Class(
                "m-0 px-[var(--space-list-item-x)] py-[var(--space-list-item-y)] text-(length:--font-size-sm) leading-[var(--line-height-sm)] text-muted-foreground"
            ),
        ],
        ["No commands found."]
    )
}

const renderSlashCommandList = <Message>(
    {
        commands,
        activeIndex,
        toParentMessage,
    }: Readonly<{
        commands: ReadonlyArray<RichTextSlashCommand>
        activeIndex: number
        toParentMessage: (message: RichTextEditorMessage) => Message
    }>,
    h: HtmlBuilder<Message>
): Html => {
    const { div, Class, Role, Attribute } = h
    return div(
        [
            Role("listbox"),
            Attribute("aria-label", "Rich text commands"),
            Class("min-h-0 overflow-y-auto overscroll-contain p-2"),
        ],
        commands.length > 0
            ? commands.map((command, index) =>
                  renderSlashCommandItem<Message>(
                      {
                          command,
                          isActive: index === activeIndex,
                          toParentMessage,
                      },
                      h
                  )
              )
            : [renderEmptySlashCommands<Message>(h)]
    )
}

const renderSlashMenuPanel = <Message>(
    props: RichTextEditorSlashMenuProps<Message>,
    h: HtmlBuilder<Message>
): Html => {
    const { div, Class } = h
    const commands = filteredRichTextSlashCommands(props.model.slashMenu.query)
    const activeIndex = normalizeRichTextSlashMenuIndex(
        props.model.slashMenu.query,
        props.model.slashMenu.activeIndex
    )

    return div(
        [
            Class(
                "absolute left-[var(--space-4)] top-[var(--space-4)] z-50 flex w-64 flex-col"
            ),
            slashMenuPositionMount(props, h),
        ],
        [
            div(
                [
                    Class(
                        "flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-popover text-popover-foreground [box-shadow:var(--shadow-overlay)]"
                    ),
                ],
                [
                    renderSlashMenuHeader<Message>(
                        props.model.slashMenu.query,
                        h
                    ),
                    renderSlashCommandList<Message>(
                        {
                            commands,
                            activeIndex,
                            toParentMessage: props.toParentMessage,
                        },
                        h
                    ),
                ]
            ),
        ]
    )
}

export const RichTextEditorSlashMenu = <Message>(
    props: RichTextEditorSlashMenuProps<Message>,
    h: HtmlBuilder<Message>
): Html => {
    const { div, Class } = h
    return div(
        [Class("contents")],
        [
            ...(props.isBackdropDisabled
                ? []
                : [renderSlashMenuBackdrop(props, h)]),
            renderSlashMenuPanel(props, h),
        ]
    )
}

import { Schema as S } from "effect"
import { Command, Submodel } from "foldkit"
import { taggedStruct } from "foldkit/schema"

import * as Terminal from "./terminal/index.ts"
import * as KbdShortcuts from "./kbd-shortcuts/index.ts"
import * as Grep from "./grep/index.ts"

export const Model = S.Struct({
    kbd_shortcuts: KbdShortcuts.Model,
    terminal: Terminal.Model,
    grep: Grep.Model,
})
export type Model = typeof Model.Type

export const GotTerminalMessage = taggedStruct("GotTerminalMessage", {
    message: Terminal.Message,
})
export const GotKbdShortcutsMessage = taggedStruct("GotKbdShortcutsMessage", {
    message: KbdShortcuts.Message,
})
export const GotGrepMessage = taggedStruct("GotGrepMessage", {
    message: Grep.Message,
})
export const Message = S.Union([
    GotKbdShortcutsMessage,
    GotTerminalMessage,
    GotGrepMessage,
])
export type Message = typeof Message.Type

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [
    {
        kbd_shortcuts: KbdShortcuts.init()[0],
        terminal: Terminal.init()[0],
        grep: Grep.init(),
    },
    [],
]

export const update = (model: Model, message: Message): UpdateReturn => {
    switch (message._tag) {
        case "GotGrepMessage": {
            const [grep, commands] = Grep.update_with_commands(
                model.grep,
                message.message
            )
            return [
                { ...model, grep },
                Command.mapMessages(commands, (message) =>
                    GotGrepMessage({ message })
                ),
            ]
        }
        case "GotKbdShortcutsMessage": {
            const [kbd_shortcuts, commands] = KbdShortcuts.update(
                model.kbd_shortcuts,
                message.message
            )
            return [
                { ...model, kbd_shortcuts },
                Command.mapMessages(commands, (message) =>
                    GotKbdShortcutsMessage({ message })
                ),
            ]
        }
        case "GotTerminalMessage":
            return [
                {
                    ...model,
                    terminal: Terminal.update(
                        model.terminal,
                        message.message
                    )[0],
                },
                [],
            ]
    }
}

const kbd_shortcuts_view = Submodel.defineView<
    KbdShortcuts.Model,
    KbdShortcuts.Message
>((model, h) => KbdShortcuts.view(model, (message) => message, h))

const terminal_view = Submodel.defineView<Terminal.Model, Terminal.Message>(
    (model, h) => Terminal.view(model, (message) => message, h)
)

const grep_view = Submodel.defineView<
    Grep.Model,
    Grep.Message,
    { readonly preview: Grep.Preview }
>((model, { preview }, h) => Grep.view(model, preview, h))

export const view = Submodel.defineView<
    Model,
    Message,
    {
        readonly path: string
        readonly kbd_shortcuts_href: string
        readonly terminal_href: string
        readonly grep_href: string
        readonly bookmarks_href: string
        readonly grep_preview: Grep.Preview
    }
>(
    (
        model,
        {
            path,
            kbd_shortcuts_href,
            terminal_href,
            grep_href,
            bookmarks_href,
            grep_preview,
        },
        h
    ) => {
        if (Grep.is_grep_path(path))
            return h.submodel({
                slotId: "dev-grep",
                model: model.grep,
                view: grep_view,
                viewInputs: { preview: grep_preview },
                toParentMessage: (message) => GotGrepMessage({ message }),
            })
        if (KbdShortcuts.isKbdShortcutsPath(path)) {
            return h.submodel({
                slotId: "dev-kbd-shortcuts",
                model: model.kbd_shortcuts,
                view: kbd_shortcuts_view,
                toParentMessage: (message) =>
                    GotKbdShortcutsMessage({ message }),
            })
        }
        if (Terminal.isTerminalPath(path)) {
            return h.submodel({
                slotId: "dev-terminal",
                model: model.terminal,
                view: terminal_view,
                toParentMessage: (message) => GotTerminalMessage({ message }),
            })
        }

        return h.section(
            [h.Class("mx-auto w-full max-w-5xl space-y-6")],
            [
                h.h1([h.Class("text-3xl font-bold")], ["Dev"]),
                h.p(
                    [h.Class("text-muted-foreground")],
                    [
                        path === "/dev" || path === "/dev/"
                            ? "Developer tools and references."
                            : "Developer tool not found.",
                    ]
                ),
                h.a(
                    [
                        h.Href(kbd_shortcuts_href),
                        h.Class("block text-sm font-medium underline"),
                    ],
                    ["Keyboard Shortcuts"]
                ),
                h.a(
                    [
                        h.Href(terminal_href),
                        h.Class("text-sm font-medium underline"),
                    ],
                    ["Terminal"]
                ),
                h.a(
                    [
                        h.Href(grep_href),
                        h.Class("block text-sm font-medium underline"),
                    ],
                    ["Grep"]
                ),
                h.a(
                    [
                        h.Href(bookmarks_href),
                        h.Class("block text-sm font-medium underline"),
                    ],
                    ["Bookmarks"]
                ),
            ]
        )
    }
)

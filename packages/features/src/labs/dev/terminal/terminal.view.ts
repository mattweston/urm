/** # Terminal view */
import { Array, String } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { cliCommands, type CliCommand } from "./cli-data.ts"
import { highlightTerminalSource } from "./shiki.ts"
import { UpdatedTerminalSearchQuery, type Message } from "./terminal.message.ts"
import type { Model } from "./terminal.model.ts"

const matchesQuery =
    (query: string) =>
    (cliCommand: CliCommand): boolean => {
        const normalisedQuery = String.toLowerCase(String.trim(query))
        const searchableText = [
            cliCommand.command,
            cliCommand.description,
            ...cliCommand.tags,
            ...cliCommand.comments,
        ].join(" ")

        return (
            normalisedQuery === "" ||
            String.includes(normalisedQuery)(String.toLowerCase(searchableText))
        )
    }

export const filterCliCommands = (query: string): ReadonlyArray<CliCommand> =>
    Array.filter(cliCommands, matchesQuery(query))

const terminalSource = (cliCommand: CliCommand): string =>
    [
        ...Array.map(cliCommand.comments, (comment) => `# ${comment}`),
        `$ ${cliCommand.command}`,
    ].join("\n")

const commandView = <ParentMessage>(
    cliCommand: CliCommand,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("li")(
        cliCommand.command,
        [h.Class("border-b border-border last:border-b-0")],
        [
            h.div(
                [h.Class("px-4 pt-4 sm:px-5")],
                [
                    h.p(
                        [h.Class("text-sm text-card-foreground")],
                        [cliCommand.description]
                    ),
                    h.ul(
                        [h.Class("mt-2 flex flex-wrap gap-1.5")],
                        Array.map(cliCommand.tags, (tag) =>
                            h.li(
                                [
                                    h.Class(
                                        "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground"
                                    ),
                                ],
                                [tag]
                            )
                        )
                    ),
                ]
            ),
            h.div([
                h.Class("terminal-shiki overflow-x-auto px-4 py-4 sm:px-5"),
                h.InnerHTML(
                    highlightTerminalSource(terminalSource(cliCommand))
                ),
            ]),
        ]
    )

/**
 * Search the command reference and browse syntax-highlighted terminal examples.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const matchingCommands = filterCliCommands(model.query)

    return h.section(
        [h.Class("mx-auto w-full min-w-0 max-w-5xl space-y-6")],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["URM terminal"]
                    ),
                    h.p(
                        [h.Class("text-muted-foreground")],
                        [
                            "Search the commands used to build, test, and explore URM.",
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "overflow-hidden rounded-[var(--radius-surface)] border border-border bg-card text-card-foreground shadow-lg"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                "flex items-center gap-3 border-b border-border bg-muted/60 px-4 py-3"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("flex gap-1.5"), h.AriaHidden(true)],
                                [
                                    h.span([
                                        h.Class(
                                            "size-3 rounded-full bg-red-400"
                                        ),
                                    ]),
                                    h.span([
                                        h.Class(
                                            "size-3 rounded-full bg-amber-400"
                                        ),
                                    ]),
                                    h.span([
                                        h.Class(
                                            "size-3 rounded-full bg-emerald-400"
                                        ),
                                    ]),
                                ]
                            ),
                            h.label(
                                [
                                    h.For("terminal-command-filter"),
                                    h.Class("sr-only"),
                                ],
                                ["Search URM commands"]
                            ),
                            h.input([
                                h.Id("terminal-command-filter"),
                                h.Type("search"),
                                h.Value(model.query),
                                h.Placeholder(
                                    "Search commands, tags, or comments…"
                                ),
                                h.OnInput((value) =>
                                    toParentMessage(
                                        UpdatedTerminalSearchQuery({ value })
                                    )
                                ),
                                h.Class(
                                    "min-w-0 flex-1 rounded border border-input bg-background/80 px-3 py-1.5 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
                                ),
                            ]),
                            h.span(
                                [
                                    h.Class(
                                        "hidden text-xs text-muted-foreground sm:block"
                                    ),
                                ],
                                [`${Array.length(matchingCommands)} commands`]
                            ),
                        ]
                    ),
                    Array.match(matchingCommands, {
                        onEmpty: () =>
                            h.p(
                                [
                                    h.Class(
                                        "px-5 py-12 text-center text-sm text-muted-foreground"
                                    ),
                                    h.Role("status"),
                                ],
                                ["No URM commands match that search."]
                            ),
                        onNonEmpty: (commands) =>
                            h.ul(
                                [h.AriaLive("polite")],
                                Array.map(commands, (cliCommand) =>
                                    commandView(cliCommand, h)
                                )
                            ),
                    }),
                ]
            ),
        ]
    )
}

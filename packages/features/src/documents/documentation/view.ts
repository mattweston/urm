import { view as markdownView } from "@foldkit/markdown"
import type { MarkdownDocument } from "@foldkit/markdown"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { KeyedTokensInfo } from "@shikijs/magic-move/core"

import { documentationIslands } from "./islands.ts"
import { documentationMarkdownViews } from "./markdown-view.ts"
import type * as Tabs from "../../labs/tabs/index.ts"
import * as Interactive from "./interactive.ts"
import { graphView, type DocumentationGraph } from "./graph.ts"

export const view = <ParentMessage>(
    title: string,
    document: MarkdownDocument,
    highlighted_code: Readonly<Record<string, string>>,
    tabs: Tabs.ModelType,
    toTabsMessage: (message: Tabs.MessageType) => ParentMessage,
    interactive: Interactive.Model,
    to_interactive_message: (message: Interactive.Message) => ParentMessage,
    magic_move_steps: ReadonlyArray<KeyedTokensInfo>,
    graph: DocumentationGraph,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.article(
        [
            h.Class(
                "doc-prose mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8"
            ),
        ],
        [
            h.h1([], [title]),
            ...(graph.nodes.length > 1
                ? [
                      graphView(
                          graph,
                          interactive.graph_settings,
                          interactive.is_graph_settings_open,
                          (message) =>
                              to_interactive_message(
                                  Interactive.GotGraphMessage({ message })
                              ),
                          h
                      ),
                  ]
                : []),
            markdownView(document, {
                islands: documentationIslands(
                    tabs,
                    toTabsMessage,
                    interactive,
                    to_interactive_message,
                    magic_move_steps,
                    h
                ),
                views: documentationMarkdownViews(highlighted_code),
            }),
        ]
    )

import { Match as M, Schema as S } from "effect"
import { Command } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"

import * as BugFix from "./bug-fix.ts"
import * as AudioHighlight from "./audio-highlight.ts"
import * as CodeTabs from "./code-tabs.ts"
import * as CodeLines from "./code-lines.ts"
import * as ExplainLines from "./explain-lines.ts"
import * as Tabs from "./tabs.ts"
import * as SyntaxAnimation from "./syntax-animation.ts"
import * as StyleguideAnimation from "./styleguide-animation.ts"
import * as Graph from "./graph.ts"
import * as LayoutAnimator from "./layout-animator.ts"

export const Model = S.Struct({
    code_tabs: CodeTabs.Model,
    tabs: Tabs.Model,
    bug_fix: BugFix.Model,
    syntax_animation: SyntaxAnimation.Model,
    styleguide_animation: StyleguideAnimation.Model,
    layout_animator: LayoutAnimator.Model,
    audio_highlight: AudioHighlight.Model,
    graph_settings: Graph.GraphSettings,
    is_graph_settings_open: S.Boolean,
})
export type Model = typeof Model.Type

export const GotCodeTabsMessage = taggedStruct("GotCodeTabsMessage", {
    message: CodeTabs.Message,
})
export const GotCodeLinesMessage = taggedStruct("GotCodeLinesMessage", {
    message: CodeLines.Message,
})
export const GotExplainLinesMessage = taggedStruct("GotExplainLinesMessage", {
    message: ExplainLines.Message,
})
export const GotTabsMessage = taggedStruct("GotTabsMessage", {
    message: Tabs.Message,
})
export const GotBugFixMessage = taggedStruct("GotBugFixMessage", {
    message: BugFix.Message,
})
export const GotSyntaxAnimationMessage = taggedStruct(
    "GotSyntaxAnimationMessage",
    {
        message: SyntaxAnimation.Message,
    }
)
export const GotStyleguideAnimationMessage = taggedStruct(
    "GotStyleguideAnimationMessage",
    { message: StyleguideAnimation.Message }
)
export const GotLayoutAnimatorMessage = taggedStruct(
    "GotLayoutAnimatorMessage",
    {
        message: LayoutAnimator.Message,
    }
)
export const GotAudioHighlightMessage = taggedStruct(
    "GotAudioHighlightMessage",
    {
        message: AudioHighlight.Message,
    }
)
export const GotGraphMessage = taggedStruct("GotGraphMessage", {
    message: Graph.GraphMessage,
})
export const Message = S.Union([
    GotCodeTabsMessage,
    GotCodeLinesMessage,
    GotExplainLinesMessage,
    GotTabsMessage,
    GotBugFixMessage,
    GotSyntaxAnimationMessage,
    GotStyleguideAnimationMessage,
    GotLayoutAnimatorMessage,
    GotAudioHighlightMessage,
    GotGraphMessage,
])
export type Message = typeof Message.Type

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => {
    const [code_tabs, commands] = CodeTabs.init()
    const [tabs, tabs_commands] = Tabs.init()

    return [
        {
            code_tabs,
            tabs,
            bug_fix: BugFix.init(),
            syntax_animation: SyntaxAnimation.init(),
            styleguide_animation: StyleguideAnimation.init(),
            layout_animator: LayoutAnimator.init(),
            audio_highlight: AudioHighlight.init(),
            graph_settings: Graph.defaultGraphSettings,
            is_graph_settings_open: false,
        },
        [
            ...Command.mapMessages(commands, (message) =>
                GotCodeTabsMessage({ message })
            ),
            ...Command.mapMessages(tabs_commands, (message) =>
                GotTabsMessage({ message })
            ),
        ],
    ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotCodeLinesMessage: () => [model, []],
            GotExplainLinesMessage: () => [model, []],
            GotCodeTabsMessage: ({ message }) => {
                const [code_tabs, commands] = CodeTabs.update(
                    model.code_tabs,
                    message
                )

                return [
                    modifyFields(model, { code_tabs: () => code_tabs }),
                    Command.mapMessages(commands, (child_message) =>
                        GotCodeTabsMessage({ message: child_message })
                    ),
                ]
            },
            GotTabsMessage: ({ message }) => {
                const [tabs, commands] = Tabs.update(model.tabs, message)

                return [
                    modifyFields(model, { tabs: () => tabs }),
                    Command.mapMessages(commands, (child_message) =>
                        GotTabsMessage({ message: child_message })
                    ),
                ]
            },
            GotBugFixMessage: ({ message }) => [
                modifyFields(model, {
                    bug_fix: (bug_fix) => BugFix.update(bug_fix, message),
                }),
                [],
            ],
            GotSyntaxAnimationMessage: ({ message }) => [
                modifyFields(model, {
                    syntax_animation: (syntax_animation) =>
                        SyntaxAnimation.update(syntax_animation, message),
                }),
                [],
            ],
            GotStyleguideAnimationMessage: ({ message }) => [
                modifyFields(model, {
                    styleguide_animation: (styleguide_animation) =>
                        StyleguideAnimation.update(
                            styleguide_animation,
                            message
                        ),
                }),
                [],
            ],
            GotLayoutAnimatorMessage: ({ message }) => [
                modifyFields(model, {
                    layout_animator: (layout_animator) =>
                        LayoutAnimator.update(layout_animator, message),
                }),
                [],
            ],
            GotAudioHighlightMessage: ({ message }) => [
                modifyFields(model, {
                    audio_highlight: (audio_highlight) =>
                        AudioHighlight.update(audio_highlight, message),
                }),
                [],
            ],
            GotGraphMessage: ({ message }) =>
                M.value(message).pipe(
                    M.withReturnType<UpdateReturn>(),
                    M.tagsExhaustive({
                        GraphMounted: () => [model, []],
                        GraphMountFailed: () => [model, []],
                        GraphNavigationCompleted: () => [model, []],
                        ToggledGraphSettings: () => [
                            modifyFields(model, {
                                is_graph_settings_open: (is_open) => !is_open,
                            }),
                            [],
                        ],
                        ChangedGraphSearch: ({ value }) => [
                            modifyFields(model, {
                                graph_settings: () =>
                                    modifyFields(model.graph_settings, {
                                        search: () => value,
                                    }),
                            }),
                            [],
                        ],
                        ToggledGraphTags: () => [
                            modifyFields(model, {
                                graph_settings: () =>
                                    modifyFields(model.graph_settings, {
                                        show_tags: (show_tags) => !show_tags,
                                    }),
                            }),
                            [],
                        ],
                        ToggledGraphOrphans: () => [
                            modifyFields(model, {
                                graph_settings: () =>
                                    modifyFields(model.graph_settings, {
                                        show_orphans: (show_orphans) =>
                                            !show_orphans,
                                    }),
                            }),
                            [],
                        ],
                        ToggledGraphArrows: () => [
                            modifyFields(model, {
                                graph_settings: () =>
                                    modifyFields(model.graph_settings, {
                                        show_arrows: (show_arrows) =>
                                            !show_arrows,
                                    }),
                            }),
                            [],
                        ],
                        ChangedGraphNodeSize: ({ value }) => [
                            modifyFields(model, {
                                graph_settings: () =>
                                    modifyFields(model.graph_settings, {
                                        node_size: () => value,
                                    }),
                            }),
                            [],
                        ],
                        ChangedGraphLinkWidth: ({ value }) => [
                            modifyFields(model, {
                                graph_settings: () =>
                                    modifyFields(model.graph_settings, {
                                        link_width: () => value,
                                    }),
                            }),
                            [],
                        ],
                        ChangedGraphRepulsion: ({ value }) => [
                            modifyFields(model, {
                                graph_settings: () =>
                                    modifyFields(model.graph_settings, {
                                        repulsion: () => value,
                                    }),
                            }),
                            [],
                        ],
                        ChangedGraphEdgeLength: ({ value }) => [
                            modifyFields(model, {
                                graph_settings: () =>
                                    modifyFields(model.graph_settings, {
                                        edge_length: () => value,
                                    }),
                            }),
                            [],
                        ],
                        ResetGraphSettings: () => [
                            modifyFields(model, {
                                graph_settings: () =>
                                    Graph.defaultGraphSettings,
                            }),
                            [],
                        ],
                        GraphLinkClicked: ({ href }) => [
                            model,
                            Command.mapMessages(
                                [Graph.navigateGraphLink(href)],
                                (child_message) =>
                                    GotGraphMessage({
                                        message: child_message,
                                    })
                            ),
                        ],
                    })
                ),
        })
    )

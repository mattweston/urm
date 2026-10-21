import { Match as M, Schema as S } from "effect"
import { Command } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { evo } from "foldkit/struct"

import * as AudioHighlight from "./audio-highlight.ts"
import * as BugFix from "./bug-fix.ts"
import * as CodeLines from "./code-lines.ts"
import * as CodeTabs from "./code-tabs.ts"
import * as ExplainLines from "./explain-lines.ts"
import * as LayoutAnimator from "./layout-animator.ts"
import * as StyleguideAnimation from "./styleguide-animation.ts"
import * as SyntaxAnimation from "./syntax-animation.ts"
import * as Tabs from "./tabs.ts"

export const Model = S.Struct({
    code_tabs: CodeTabs.Model,
    tabs: Tabs.Model,
    bug_fix: BugFix.Model,
    syntax_animation: SyntaxAnimation.Model,
    styleguide_animation: StyleguideAnimation.Model,
    layout_animator: LayoutAnimator.Model,
    audio_highlight: AudioHighlight.Model,
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
])
export type Message = typeof Message.Type

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => {
    const [code_tabs, code_tabs_commands] = CodeTabs.init()
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
        },
        [
            ...Command.mapMessages(code_tabs_commands, (message) =>
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
                    evo(model, { code_tabs: () => code_tabs }),
                    Command.mapMessages(commands, (child_message) =>
                        GotCodeTabsMessage({ message: child_message })
                    ),
                ]
            },
            GotTabsMessage: ({ message }) => {
                const [tabs, commands] = Tabs.update(model.tabs, message)
                return [
                    evo(model, { tabs: () => tabs }),
                    Command.mapMessages(commands, (child_message) =>
                        GotTabsMessage({ message: child_message })
                    ),
                ]
            },
            GotBugFixMessage: ({ message }) => [
                evo(model, {
                    bug_fix: (bug_fix) => BugFix.update(bug_fix, message),
                }),
                [],
            ],
            GotSyntaxAnimationMessage: ({ message }) => [
                evo(model, {
                    syntax_animation: (syntax_animation) =>
                        SyntaxAnimation.update(syntax_animation, message),
                }),
                [],
            ],
            GotStyleguideAnimationMessage: ({ message }) => [
                evo(model, {
                    styleguide_animation: (styleguide_animation) =>
                        StyleguideAnimation.update(
                            styleguide_animation,
                            message
                        ),
                }),
                [],
            ],
            GotLayoutAnimatorMessage: ({ message }) => [
                evo(model, {
                    layout_animator: (layout_animator) =>
                        LayoutAnimator.update(layout_animator, message),
                }),
                [],
            ],
            GotAudioHighlightMessage: ({ message }) => [
                evo(model, {
                    audio_highlight: (audio_highlight) =>
                        AudioHighlight.update(audio_highlight, message),
                }),
                [],
            ],
        })
    )

import type { KeyedTokensInfo } from "@shikijs/magic-move/core"
import { inertHtml as h, type Html, type HtmlBuilder } from "foldkit/html"

import * as AudioHighlight from "./audio-highlight.ts"
import * as BugFix from "./bug-fix.ts"
import * as CodeLines from "./code-lines.ts"
import * as CodeTabs from "./code-tabs.ts"
import * as ExplainLines from "./explain-lines.ts"
import * as Interactive from "./component-interactive.ts"
import * as LayoutAnimator from "./layout-animator.ts"
import * as StyleguideAnimation from "./styleguide-animation.ts"
import * as SyntaxAnimation from "./syntax-animation.ts"
import * as DocumentationTabs from "./tabs.ts"

type LabelAttributes = Readonly<{
    labels: string
    label?: string
}>

type CodeLinesAttributes = Readonly<{
    selectable?: "true"
    lockOnSelect?: "true"
}>

type LineExplanationAttributes = Readonly<{
    line: number
    title?: string
}>

type AudioHighlightAttributes = Readonly<{
    ranges: string
    explanations?: string
    scale?: "major" | "minor" | "pentatonic" | "blues"
    root?: string
}>

const labels_from = (labels: string): ReadonlyArray<string> =>
    labels
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value !== "")

export const documentationInteractiveIslandViews = <ParentMessage>(
    interactive: Interactive.Model,
    to_interactive_message: (message: Interactive.Message) => ParentMessage,
    magic_move_steps: ReadonlyArray<KeyedTokensInfo>,
    builder: HtmlBuilder<ParentMessage>
) => ({
    Tabs: ({ labels, label }: LabelAttributes, content: ReadonlyArray<Html>) =>
        DocumentationTabs.view(
            interactive.tabs,
            labels_from(labels),
            content,
            label ?? "Content alternatives",
            (message) =>
                to_interactive_message(Interactive.GotTabsMessage({ message })),
            builder
        ),
    TabItem: (_attributes: {}, content: ReadonlyArray<Html>) =>
        h.div([], content),
    CodeTabs: (
        { labels, label }: LabelAttributes,
        content: ReadonlyArray<Html>
    ) =>
        CodeTabs.view(
            interactive.code_tabs,
            labels_from(labels),
            content,
            label ?? "Code examples",
            (message) =>
                to_interactive_message(
                    Interactive.GotCodeTabsMessage({ message })
                ),
            builder
        ),
    ImportedExample: (
        {
            path,
            title,
        }: Readonly<{ path: string; region?: string; title?: string }>,
        content: ReadonlyArray<Html>
    ) =>
        h.figure(
            [h.Class("documentation-imported-example")],
            [
                h.figcaption(
                    [h.Class("documentation-imported-example-caption")],
                    [h.span([], [title ?? path]), h.code([], [path])]
                ),
                h.div(
                    [h.Class("documentation-imported-example-code")],
                    content
                ),
            ]
        ),
    CodeLines: (
        { selectable, lockOnSelect }: CodeLinesAttributes,
        content: ReadonlyArray<Html>
    ) =>
        CodeLines.view(
            content,
            selectable === "true",
            lockOnSelect === "true",
            (message) =>
                to_interactive_message(
                    Interactive.GotCodeLinesMessage({ message })
                ),
            builder
        ),
    ExplainLines: (_attributes: {}, content: ReadonlyArray<Html>) =>
        ExplainLines.view(
            content,
            (message) =>
                to_interactive_message(
                    Interactive.GotExplainLinesMessage({ message })
                ),
            builder
        ),
    LineExplanation: (
        { line, title }: LineExplanationAttributes,
        content: ReadonlyArray<Html>
    ) =>
        h.div(
            [
                h.Class("documentation-line-explanation-source"),
                h.DataAttribute("line-explanation-source", ""),
                h.DataAttribute("explanation-line", String(line)),
                ...(title === undefined
                    ? []
                    : [h.DataAttribute("explanation-title", title)]),
            ],
            content
        ),
    BugFix: (_attributes: {}, content: ReadonlyArray<Html>) =>
        BugFix.view(
            interactive.bug_fix,
            content,
            magic_move_steps.slice(-content.length),
            (message) =>
                to_interactive_message(
                    Interactive.GotBugFixMessage({ message })
                ),
            builder
        ),
    SyntaxAnimation: (
        { titles }: Readonly<{ titles: string }>,
        content: ReadonlyArray<Html>
    ) =>
        SyntaxAnimation.view(
            interactive.syntax_animation,
            labels_from(titles),
            content,
            magic_move_steps.slice(-content.length),
            (message) =>
                to_interactive_message(
                    Interactive.GotSyntaxAnimationMessage({ message })
                ),
            builder
        ),
    StyleguideAnimation: (
        { descriptions }: Readonly<{ descriptions: string }>,
        content: ReadonlyArray<Html>
    ) =>
        StyleguideAnimation.view(
            interactive.styleguide_animation,
            descriptions.split("|").map((value) => value.trim()),
            content,
            magic_move_steps.slice(-content.length),
            (message) =>
                to_interactive_message(
                    Interactive.GotStyleguideAnimationMessage({ message })
                ),
            builder
        ),
    LayoutAnimator: (
        { id, label }: Readonly<{ id: string; label?: string }>,
        content: ReadonlyArray<Html>
    ) =>
        LayoutAnimator.view(
            interactive.layout_animator,
            id,
            label ?? "Animated responsive preview",
            content,
            (message) =>
                to_interactive_message(
                    Interactive.GotLayoutAnimatorMessage({ message })
                ),
            builder
        ),
    AudioHighlight: (
        { ranges, explanations, scale, root }: AudioHighlightAttributes,
        content: ReadonlyArray<Html>
    ) =>
        AudioHighlight.view(
            interactive.audio_highlight,
            AudioHighlight.parseRanges(ranges),
            explanations?.split("|").map((value) => value.trim()) ?? [],
            scale ?? "major",
            root ?? "C4",
            content,
            (message) =>
                to_interactive_message(
                    Interactive.GotAudioHighlightMessage({ message })
                ),
            builder
        ),
})

import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as JsonPointerDemo from "./json-pointer.ts"

type ToParentMessage<ParentMessage> = (
    message: JsonPointerDemo.Message
) => ParentMessage

type ButtonAttribute<ParentMessage> =
    Parameters<HtmlBuilder<ParentMessage>["button"]>[0] extends ReadonlyArray<
        infer Attribute
    >
        ? Attribute
        : never

type ButtonViewAttributes<ParentMessage> = Readonly<{
    button: ReadonlyArray<ButtonAttribute<ParentMessage>>
}>

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const panel = <ParentMessage>(
    title: string,
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border px-5 py-3"
                    ),
                ],
                [
                    h.h3(
                        [
                            h.Class(
                                "text-xs font-semibold tracking-widest uppercase"
                            ),
                        ],
                        [title]
                    ),
                ]
            ),
            ...children,
        ]
    )

const metric = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>,
    tone: "default" | "cyan" | "green" | "amber" = "default"
): Html => {
    const toneClass =
        tone === "cyan"
            ? "border-cyan-500/30 bg-cyan-500/5"
            : tone === "green"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : tone === "amber"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border bg-background/70"

    return h.div(
        [
            h.Class(
                `min-w-0 rounded-[var(--radius-surface)] border p-3 ${toneClass}`
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.div(
                [
                    h.Class(
                        "mt-1 whitespace-pre-wrap break-words font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const choice_button = <ParentMessage>(
    label: string,
    active: boolean,
    message: JsonPointerDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: active,
            toView: (attributes: ButtonViewAttributes<ParentMessage>) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            active
                                ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-xs font-semibold text-cyan-700"
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: JsonPointerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect JsonPointer examples"),
        ],
        JsonPointerDemo.stages.map((stage: JsonPointerDemo.Stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        JsonPointerDemo.Message.SelectedJsonPointerStage({
                            stage,
                        })
                    ),
                    isDisabled: model.stage === stage,
                    toView: (attributes: ButtonViewAttributes<ParentMessage>) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    model.stage === stage
                                        ? "rounded-[var(--radius-surface)] bg-foreground px-3 py-2 text-xs font-semibold tracking-wider text-background uppercase"
                                        : "rounded-[var(--radius-surface)] px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground"
                                ),
                            ],
                            [stage]
                        ),
                },
                h
            )
        )
    )

const api_pills = <ParentMessage>(
    apis: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    apis.map((api: string) =>
        h.keyed("span")(
            api,
            [
                h.Class(
                    "rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] text-cyan-600"
                ),
            ],
            [api]
        )
    )

const intro_panel = <ParentMessage>(
    details: JsonPointerDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.div(
                [h.Class("grid gap-0 lg:grid-cols-[1.05fr_0.95fr]")],
                [
                    h.div(
                        [h.Class("p-6")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-600 uppercase"
                                    ),
                                ],
                                [details.eyebrow]
                            ),
                            h.h2(
                                [
                                    h.Class(
                                        "mt-2 text-2xl font-semibold tracking-tight"
                                    ),
                                ],
                                [details.title]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [details.description]
                            ),
                            h.div(
                                [h.Class("mt-4 flex flex-wrap gap-2")],
                                api_pills(details.apis, h)
                            ),
                        ]
                    ),
                    h.pre(
                        [
                            h.Class(
                                "overflow-x-auto border-t border-border bg-background/60 p-5 font-mono text-xs leading-5 lg:border-l lg:border-t-0"
                            ),
                        ],
                        [h.code([], [details.code])]
                    ),
                ]
            ),
        ]
    )

const token_view = <ParentMessage>(
    model: JsonPointerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = JsonPointerDemo.token_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Token case",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Slash",
                                        "Tilde",
                                        "Mixed",
                                        "Unicode",
                                    ] as const
                                ).map((tokenCase: JsonPointerDemo.TokenCase) =>
                                    choice_button(
                                        tokenCase,
                                        model.tokenCase === tokenCase,
                                        JsonPointerDemo.Message.SelectedJsonPointerTokenCase(
                                            {
                                                tokenCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("input token", snapshot.input, h),
                            metric("escapeToken", snapshot.escaped, h, "cyan"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Inverse behavior",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "unescapeToken",
                                snapshot.unescaped,
                                h,
                                "green"
                            ),
                            metric(
                                "round trip",
                                String(snapshot.roundTrip),
                                h,
                                "green"
                            ),
                            metric(
                                "characters escapeToken leaves alone",
                                snapshot.unchangedCharacters,
                                h
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Token escaping is deliberately narrow: only '~' and '/' are transformed. URI-reserved and Unicode characters are handled later by fragment formatting.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const format_view = <ParentMessage>(
    model: JsonPointerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = JsonPointerDemo.format_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Decoded path",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Path", "Root", "Reserved"] as const).map(
                                    (formatCase: JsonPointerDemo.FormatCase) =>
                                        choice_button(
                                            formatCase,
                                            model.formatCase === formatCase,
                                            JsonPointerDemo.Message.SelectedJsonPointerFormatCase(
                                                {
                                                    formatCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("tokens", snapshot.tokens, h, "cyan"),
                            metric("encoding order", snapshot.ordering, h),
                            metric("root", snapshot.root, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "URI fragment",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "formatUriFragment",
                                snapshot.fragment,
                                h,
                                "green"
                            ),
                            metric(
                                "parse back",
                                snapshot.parsedBack,
                                h,
                                "cyan"
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Each path item is one decoded token. A slash inside that token becomes '~1'; slashes inserted between tokens remain path separators.",
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const parse_label = (parseCase: JsonPointerDemo.ParseCase): string =>
    parseCase === "EncodedSeparator"
        ? "encoded separator"
        : parseCase === "EscapedSlash"
          ? "escaped slash"
          : "decoded"

const parse_view = <ParentMessage>(
    model: JsonPointerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = JsonPointerDemo.parse_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.76fr_1.24fr]")],
        [
            panel(
                "Fragment case",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Decoded",
                                        "EncodedSeparator",
                                        "EscapedSlash",
                                    ] as const
                                ).map((parseCase: JsonPointerDemo.ParseCase) =>
                                    choice_button(
                                        parse_label(parseCase),
                                        model.parseCase === parseCase,
                                        JsonPointerDemo.Message.SelectedJsonPointerParseCase(
                                            {
                                                parseCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("fragment", snapshot.fragment, h, "cyan"),
                            metric("tokens", snapshot.tokens, h, "green"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Decode order",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric(
                                "comparison fragment",
                                snapshot.comparisonFragment,
                                h
                            ),
                            metric(
                                "comparison tokens",
                                snapshot.comparisonTokens,
                                h,
                                "cyan"
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        'parse("")',
                                        snapshot.rootEmpty,
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        'parse("#")',
                                        snapshot.rootHash,
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const edge_label = (edgeCase: JsonPointerDemo.EdgeCase): string =>
    edgeCase === "RoundTrip" ? "round trip" : edgeCase.toLowerCase()

const edge_view = <ParentMessage>(
    model: JsonPointerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = JsonPointerDemo.edge_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.82fr_1.18fr]")],
        [
            panel(
                "Validation",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Invalid",
                                        "RoundTrip",
                                        "Surrogate",
                                    ] as const
                                ).map((edgeCase: JsonPointerDemo.EdgeCase) =>
                                    choice_button(
                                        edge_label(edgeCase),
                                        model.edgeCase === edgeCase,
                                        JsonPointerDemo.Message.SelectedJsonPointerEdgeCase(
                                            {
                                                edgeCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric(
                                "invalid fragments",
                                snapshot.invalidResults,
                                h,
                                "amber"
                            ),
                            metric(
                                "unpaired surrogate",
                                snapshot.surrogateError,
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Round trips",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            metric("path tokens", snapshot.path, h),
                            metric("formatted", snapshot.formatted, h, "cyan"),
                            metric("parsed", snapshot.parsed, h, "green"),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "format → parse",
                                        String(snapshot.roundTrip),
                                        h,
                                        "green"
                                    ),
                                    metric(
                                        "escape → unescape",
                                        String(snapshot.tokenRoundTrip),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const notice_panel = <ParentMessage>(
    details: JsonPointerDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    panel(
        "What to notice",
        [
            h.p(
                [h.Class("px-5 py-4 text-sm leading-6 text-muted-foreground")],
                [details.notice]
            ),
        ],
        h
    )

export const view = <ParentMessage>(
    model: JsonPointerDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = JsonPointerDemo.stage_details[model.stage]

    return h.div(
        [h.Class("space-y-5")],
        [
            h.section(
                [h.Class(PANEL_CLASS)],
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("max-w-3xl")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-[10px] font-semibold tracking-[0.2em] text-cyan-600 uppercase"
                                            ),
                                        ],
                                        ["effect / JsonPointer"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        [
                                            "RFC 6901 token escaping and URI fragments",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "See the two encoding layers separately: JSON Pointer token escaping for '~' and '/', then URI-fragment percent-encoding and validation.",
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-wrap gap-2 lg:justify-end"
                                    ),
                                ],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["4 exports"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["RFC 6901"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["strict typing"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            intro_panel(details, h),
            model.stage === "Tokens"
                ? token_view(model, to_parent_message, h)
                : model.stage === "Format"
                  ? format_view(model, to_parent_message, h)
                  : model.stage === "Parse"
                    ? parse_view(model, to_parent_message, h)
                    : edge_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}

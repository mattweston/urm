import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as EncodingDemo from "./encoding.ts"

type ToParentMessage<ParentMessage> = (
    message: EncodingDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: EncodingDemo.Stage,
    model: EncodingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                EncodingDemo.Message.SelectedEncodingStage({ stage })
            ),
            isDisabled: model.stage === stage,
            toView: (attributes) =>
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

const stage_tabs = <ParentMessage>(
    model: EncodingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Encoding examples"),
        ],
        EncodingDemo.stages.map((stage) =>
            stage_button(stage, model, to_parent_message, h)
        )
    )

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

const api_pills = <ParentMessage>(
    apis: ReadonlyArray<string>,
    h: HtmlBuilder<ParentMessage>
): ReadonlyArray<Html> =>
    apis.map((api) =>
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

const metric = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>,
    tone: "default" | "cyan" | "green" | "amber" | "red" = "default"
): Html => {
    const tone_class =
        tone === "cyan"
            ? "border-cyan-500/30 bg-cyan-500/5"
            : tone === "green"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : tone === "amber"
                ? "border-amber-500/30 bg-amber-500/5"
                : tone === "red"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-border bg-background/70"

    return h.div(
        [
            h.Class(
                `min-w-0 rounded-[var(--radius-surface)] border p-3 ${tone_class}`
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
                        "mt-1 break-words font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const choice_button = <ParentMessage>(
    label: string,
    is_active: boolean,
    message: EncodingDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_active,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            is_active
                                ? "rounded-[var(--radius-surface)] border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 font-mono text-xs font-semibold text-cyan-700"
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const intro_panel = <ParentMessage>(
    details: EncodingDemo.StageDetails,
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

const flow_card = <ParentMessage>(
    left: string,
    arrow: string,
    right: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center"
                    ),
                ],
                [
                    h.code(
                        [
                            h.Class(
                                "break-words font-mono text-xs font-semibold"
                            ),
                        ],
                        [left]
                    ),
                    h.div(
                        [h.Class("text-center font-mono text-cyan-600")],
                        [arrow]
                    ),
                    h.code(
                        [
                            h.Class(
                                "break-words font-mono text-xs font-semibold"
                            ),
                        ],
                        [right]
                    ),
                ]
            ),
        ]
    )

const base64_view = <ParentMessage>(
    model: EncodingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EncodingDemo.base64_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.82fr_1.18fr]")],
        [
            panel(
                "Source",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Text", "Unicode", "Bytes"] as const).map(
                                    (base64Case) =>
                                        choice_button(
                                            base64Case,
                                            model.base64Case === base64Case,
                                            EncodingDemo.Message.SelectedEncodingBase64Case(
                                                {
                                                    base64Case,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("input kind", snapshot.inputKind, h),
                            metric("input", snapshot.inputDisplay, h, "cyan"),
                            metric("UTF-8 / raw bytes", snapshot.bytes, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Base64 round trip",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            flow_card(
                                snapshot.inputDisplay,
                                "encodeBase64 →",
                                snapshot.encoded,
                                h
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "encoded length",
                                        String(snapshot.encodedLength),
                                        h
                                    ),
                                    metric(
                                        "'=' padding",
                                        String(snapshot.paddingCount),
                                        h
                                    ),
                                    metric(
                                        "decoded bytes",
                                        snapshot.decodedBytes,
                                        h
                                    ),
                                    metric(
                                        "decoded text",
                                        snapshot.decodedText,
                                        h
                                    ),
                                ]
                            ),
                            metric(
                                "round trip",
                                String(snapshot.roundTrip),
                                h,
                                snapshot.roundTrip ? "green" : "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const base64url_view = <ParentMessage>(
    model: EncodingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EncodingDemo.base64url_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.82fr_1.18fr]")],
        [
            panel(
                "Input",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    ["Question", "Binary", "Padding"] as const
                                ).map((base64UrlCase) =>
                                    choice_button(
                                        base64UrlCase === "Question"
                                            ? "hello?"
                                            : base64UrlCase === "Binary"
                                              ? "binary"
                                              : "padding",
                                        model.base64UrlCase === base64UrlCase,
                                        EncodingDemo.Message.SelectedEncodingBase64UrlCase(
                                            {
                                                base64UrlCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("input", snapshot.input, h, "cyan"),
                            metric("bytes", snapshot.bytes, h),
                            metric(
                                "round trip",
                                String(snapshot.roundTrip),
                                h,
                                "green"
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Standard vs URL-safe",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid gap-3 md:grid-cols-2")],
                                [
                                    metric("Base64", snapshot.standard, h),
                                    metric(
                                        "Base64Url",
                                        snapshot.urlSafe,
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "contains '='?",
                                        String(snapshot.hasPadding),
                                        h
                                    ),
                                    metric(
                                        "uses '-' / '_'?",
                                        `${snapshot.usesDash} / ${snapshot.usesUnderscore}`,
                                        h
                                    ),
                                ]
                            ),
                            flow_card(
                                snapshot.urlSafe,
                                "decodeBase64Url →",
                                snapshot.decoded,
                                h
                            ),
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric(
                                        "padded variant",
                                        snapshot.paddedVariant,
                                        h
                                    ),
                                    metric(
                                        "padded accepted",
                                        String(snapshot.paddedAccepted),
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

const hex_view = <ParentMessage>(
    model: EncodingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EncodingDemo.hex_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.82fr_1.18fr]")],
        [
            panel(
                "Hex mode",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (["Text", "Bytes", "RandomRules"] as const).map(
                                    (hexCase) =>
                                        choice_button(
                                            hexCase === "RandomRules"
                                                ? "randomHex rules"
                                                : hexCase,
                                            model.hexCase === hexCase,
                                            EncodingDemo.Message.SelectedEncodingHexCase(
                                                {
                                                    hexCase,
                                                }
                                            ),
                                            to_parent_message,
                                            h
                                        )
                                )
                            ),
                            metric("mode", snapshot.mode, h, "cyan"),
                            metric("input", snapshot.input, h),
                            metric("bytes", snapshot.bytes, h),
                        ]
                    ),
                ],
                h
            ),
            panel(
                model.hexCase === "RandomRules"
                    ? "randomHex behavior"
                    : "Hex round trip",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        model.hexCase === "RandomRules"
                            ? [
                                  h.div(
                                      [h.Class("grid grid-cols-2 gap-3")],
                                      [
                                          metric(
                                              "requested",
                                              String(snapshot.randomRequested),
                                              h
                                          ),
                                          metric(
                                              "actual length",
                                              String(
                                                  snapshot.randomActualLength
                                              ),
                                              h,
                                              "cyan"
                                          ),
                                          metric(
                                              "requested < 8",
                                              String(snapshot.shortRequested),
                                              h
                                          ),
                                          metric(
                                              "actual length",
                                              String(
                                                  snapshot.shortActualLength
                                              ),
                                              h,
                                              "amber"
                                          ),
                                      ]
                                  ),
                                  metric(
                                      "cryptographically secure?",
                                      String(snapshot.secure),
                                      h,
                                      "amber"
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "text-sm leading-6 text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          "randomHex generates 8-character words using Math.random(). Lengths are effectively rounded down to multiples of 8 by unsigned 32-bit coercion.",
                                      ]
                                  ),
                              ]
                            : [
                                  flow_card(
                                      snapshot.input,
                                      "encodeHex →",
                                      snapshot.encoded,
                                      h
                                  ),
                                  h.div(
                                      [h.Class("grid grid-cols-2 gap-3")],
                                      [
                                          metric(
                                              "lowercase",
                                              String(snapshot.lowercase),
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
                                              "decoded bytes",
                                              snapshot.decodedBytes,
                                              h
                                          ),
                                          metric(
                                              "decoded text",
                                              snapshot.decodedText,
                                              h
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

const error_label = (errorCase: EncodingDemo.ErrorCase): string =>
    errorCase === "Base64Length"
        ? "Base64 length"
        : errorCase === "Base64Padding"
          ? "Base64 '='"
          : errorCase === "UrlAlphabet"
            ? "URL alphabet"
            : errorCase === "HexOdd"
              ? "Hex odd length"
              : "Hex character"

const errors_view = <ParentMessage>(
    model: EncodingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = EncodingDemo.error_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.8fr_1.2fr]")],
        [
            panel(
                "Malformed input",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                (
                                    [
                                        "Base64Length",
                                        "Base64Padding",
                                        "UrlAlphabet",
                                        "HexOdd",
                                        "HexCharacter",
                                    ] as const
                                ).map((errorCase) =>
                                    choice_button(
                                        error_label(errorCase),
                                        model.errorCase === errorCase,
                                        EncodingDemo.Message.SelectedEncodingErrorCase(
                                            {
                                                errorCase,
                                            }
                                        ),
                                        to_parent_message,
                                        h
                                    )
                                )
                            ),
                            metric("decoder", snapshot.decoder, h),
                            metric(
                                "input",
                                JSON.stringify(snapshot.input),
                                h,
                                "cyan"
                            ),
                            metric("Result", snapshot.resultTag, h, "red"),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "EncodingError",
                [
                    h.div(
                        [h.Class("space-y-4 p-5")],
                        [
                            h.div(
                                [h.Class("grid grid-cols-2 gap-3")],
                                [
                                    metric("_tag", snapshot.errorTag, h, "red"),
                                    metric("kind", snapshot.kind, h),
                                    metric(
                                        "module",
                                        snapshot.module,
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "isEncodingError",
                                        String(snapshot.isEncodingError),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            metric("message", snapshot.message, h, "amber"),
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-border bg-background/70 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[9px] font-semibold tracking-widest text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["runtime TypeId"]
                                    ),
                                    h.code(
                                        [
                                            h.Class(
                                                "mt-2 block break-all font-mono text-xs font-semibold"
                                            ),
                                        ],
                                        [snapshot.typeId]
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
    details: EncodingDemo.StageDetails,
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
    model: EncodingDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = EncodingDemo.stage_details[model.stage]

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
                                        ["effect / Encoding"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        ["Text-safe views of UTF-8 and bytes"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Compare standard Base64, URL-safe Base64, and lowercase hex, then inspect the structured Result failures produced by malformed decode input.",
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
                                        ["14 documented items"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["UTF-8 ↔ bytes"]
                                    ),
                                    h.span(
                                        [
                                            h.Class(
                                                "rounded-full border border-border bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                                            ),
                                        ],
                                        ["Result errors"]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            intro_panel(details, h),
            model.stage === "Base64"
                ? base64_view(model, to_parent_message, h)
                : model.stage === "Base64Url"
                  ? base64url_view(model, to_parent_message, h)
                  : model.stage === "Hex"
                    ? hex_view(model, to_parent_message, h)
                    : errors_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}

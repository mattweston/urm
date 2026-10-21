import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as CryptoDemo from "./crypto.ts"

type ToParentMessage<ParentMessage> = (
    message: CryptoDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const stage_button = <ParentMessage>(
    stage: CryptoDemo.Stage,
    model: CryptoDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(
                CryptoDemo.Message.SelectedCryptoStage({ stage })
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
    model: CryptoDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Crypto examples"),
        ],
        [
            stage_button("Service", model, to_parent_message, h),
            stage_button("Random", model, to_parent_message, h),
            stage_button("IDs", model, to_parent_message, h),
            stage_button("Digest", model, to_parent_message, h),
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

const choice_button = <ParentMessage>(
    label: string,
    onClick: ParentMessage,
    active: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            active
                                ? "rounded-[var(--radius-surface)] border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-700"
                                : "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const action_button = <ParentMessage>(
    label: string,
    onClick: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_intro = <ParentMessage>(
    details: CryptoDemo.StageDetails,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.div(
                [
                    h.Class(
                        "grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)] lg:items-start"
                    ),
                ],
                [
                    h.div(
                        [h.Class("min-w-0")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "font-mono text-[10px] font-semibold tracking-[0.18em] text-cyan-600 uppercase"
                                    ),
                                ],
                                [details.eyebrow]
                            ),
                            h.h3(
                                [
                                    h.Class(
                                        "mt-1 text-lg font-semibold tracking-tight"
                                    ),
                                ],
                                [details.title]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 max-w-3xl text-sm leading-6 text-muted-foreground"
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
                                "overflow-x-auto rounded-[var(--radius-surface)] border border-border bg-background p-4"
                            ),
                        ],
                        [
                            h.code(
                                [
                                    h.Class(
                                        "font-mono text-xs leading-6 text-foreground"
                                    ),
                                ],
                                [details.code]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const notice_panel = <ParentMessage>(
    details: CryptoDemo.StageDetails,
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
                        ["What to notice"]
                    ),
                ]
            ),
            h.p(
                [h.Class("px-5 py-4 text-sm leading-6 text-muted-foreground")],
                [details.notice]
            ),
        ]
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

const metric = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>,
    tone: "default" | "cyan" | "green" | "amber" = "default"
): Html => {
    const tone_class =
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
                        "mt-1 break-all font-mono text-xs font-semibold leading-5"
                    ),
                ],
                [value]
            ),
        ]
    )
}

const list_pill = <ParentMessage>(
    value: string,
    h: HtmlBuilder<ParentMessage>,
    tone: "cyan" | "default" = "default"
): Html =>
    h.span(
        [
            h.Class(
                tone === "cyan"
                    ? "rounded-full border border-cyan-500/30 bg-cyan-500/5 px-2.5 py-1 font-mono text-[10px] text-cyan-600"
                    : "rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[10px] text-muted-foreground"
            ),
        ],
        [value]
    )

const service_view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    const snapshot = CryptoDemo.service_snapshot()

    return h.div(
        [h.Class("space-y-5")],
        [
            h.div(
                [h.Class("grid gap-5 xl:grid-cols-[0.82fr_1.18fr]")],
                [
                    panel(
                        "Crypto.make inputs",
                        [
                            h.div(
                                [h.Class("space-y-3 p-5")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border border-cyan-500/30 bg-cyan-500/5 p-4"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "font-mono text-sm font-semibold text-cyan-700"
                                                    ),
                                                ],
                                                ["randomBytes(size)"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "mt-2 text-sm leading-6 text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    "Primitive source of fresh secure bytes. All random helpers and identifiers are derived from it.",
                                                ]
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border border-violet-500/30 bg-violet-500/5 p-4"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [
                                                    h.Class(
                                                        "font-mono text-sm font-semibold text-violet-700"
                                                    ),
                                                ],
                                                ["digest(algorithm, data)"]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "mt-2 text-sm leading-6 text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    "Primitive SHA implementation supplied by the runtime or a custom test/platform layer.",
                                                ]
                                            ),
                                        ]
                                    ),
                                    metric(
                                        "primitive operations",
                                        String(snapshot.primitiveCount),
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                    panel(
                        "Derived service surface",
                        [
                            h.div(
                                [h.Class("p-5")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["from randomBytes"]
                                    ),
                                    h.div(
                                        [h.Class("mt-3 flex flex-wrap gap-2")],
                                        [
                                            ...snapshot.derivedRandom.map(
                                                (value) =>
                                                    list_pill(value, h, "cyan")
                                            ),
                                            ...snapshot.derivedIds.map(
                                                (value) =>
                                                    list_pill(value, h, "cyan")
                                            ),
                                        ]
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-6 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["delegated digest algorithms"]
                                    ),
                                    h.div(
                                        [h.Class("mt-3 flex flex-wrap gap-2")],
                                        snapshot.digestAlgorithms.map((value) =>
                                            list_pill(value, h)
                                        )
                                    ),
                                    h.div(
                                        [
                                            h.Class(
                                                "mt-6 grid gap-0 overflow-hidden rounded-[var(--radius-surface)] border border-border md:grid-cols-[1fr_auto_1fr]"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [h.Class("p-4")],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "font-mono text-xs font-semibold"
                                                            ),
                                                        ],
                                                        ["Effect program"]
                                                    ),
                                                    h.p(
                                                        [
                                                            h.Class(
                                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            "Requires Crypto.Crypto, not a concrete browser or Node implementation.",
                                                        ]
                                                    ),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "grid place-items-center border-y border-border px-4 py-3 font-mono text-[10px] text-cyan-600 md:border-x md:border-y-0"
                                                    ),
                                                ],
                                                ["provide →"]
                                            ),
                                            h.div(
                                                [h.Class("p-4")],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "font-mono text-xs font-semibold"
                                                            ),
                                                        ],
                                                        ["Crypto.Crypto"]
                                                    ),
                                                    h.p(
                                                        [
                                                            h.Class(
                                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            "Runtime-backed in production; deterministic Crypto.make service in this teaching demo.",
                                                        ]
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ],
                        h
                    ),
                ]
            ),
        ]
    )
}

const random_view = <ParentMessage>(
    model: CryptoDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = CryptoDemo.random_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.7fr_1.3fr]")],
        [
            panel(
                "Random controls",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                ["randomBytes size"]
                            ),
                            h.div(
                                [h.Class("mt-3")],
                                [
                                    action_button(
                                        `${snapshot.byteSize} bytes · cycle`,
                                        to_parent_message(
                                            CryptoDemo.Message.ClickedCycleCryptoByteSize()
                                        ),
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-6 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                ["integer range mode"]
                            ),
                            h.div(
                                [h.Class("mt-3 flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "Inclusive",
                                        to_parent_message(
                                            CryptoDemo.Message.ClickedToggleCryptoRangeMode()
                                        ),
                                        model.rangeMode === "Inclusive",
                                        h
                                    ),
                                    choice_button(
                                        "Half-open",
                                        to_parent_message(
                                            CryptoDemo.Message.ClickedToggleCryptoRangeMode()
                                        ),
                                        model.rangeMode === "HalfOpen",
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-6 rounded-[var(--radius-surface)] border border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["bytes · hex"]
                                    ),
                                    h.code(
                                        [
                                            h.Class(
                                                "mt-2 block break-all font-mono text-xs leading-5 text-cyan-700"
                                            ),
                                        ],
                                        [snapshot.bytesHex]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Derived random operations",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3"
                            ),
                        ],
                        [
                            metric(
                                "random · [0, 1)",
                                snapshot.random,
                                h,
                                "cyan"
                            ),
                            metric(
                                "randomBoolean",
                                String(snapshot.randomBoolean),
                                h,
                                "cyan"
                            ),
                            metric("randomInt", snapshot.randomInt, h),
                            metric(
                                "randomBetween(10, 20)",
                                snapshot.randomBetween,
                                h,
                                "green"
                            ),
                            metric(
                                `randomIntBetween ${snapshot.rangeNotation}`,
                                String(snapshot.randomIntBetween),
                                h,
                                "green"
                            ),
                            metric(
                                "randomShuffle",
                                snapshot.shuffled.join(" → "),
                                h,
                                "green"
                            ),
                            metric(
                                "nextDoubleUnsafe()",
                                snapshot.unsafeDouble,
                                h,
                                "amber"
                            ),
                            metric(
                                "nextIntUnsafe()",
                                snapshot.unsafeInt,
                                h,
                                "amber"
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const id_card = <ParentMessage>(
    label: string,
    value: string,
    annotation: string,
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
                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                    ),
                ],
                [label]
            ),
            h.code(
                [
                    h.Class(
                        "mt-2 block break-all font-mono text-sm font-semibold leading-6 text-foreground"
                    ),
                ],
                [value]
            ),
            h.p(
                [h.Class("mt-2 text-xs leading-5 text-muted-foreground")],
                [annotation]
            ),
        ]
    )

const ids_view = <ParentMessage>(
    model: CryptoDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = CryptoDemo.id_snapshot(model)

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.7fr_1.3fr]")],
        [
            panel(
                "Clock dependency",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "UUIDv7 and ULID read the active Effect Clock. Toggle the fixed teaching clock and both time-aware identifiers change deterministically.",
                                ]
                            ),
                            h.div(
                                [h.Class("mt-4 flex flex-wrap gap-2")],
                                [
                                    choice_button(
                                        "Unix epoch",
                                        to_parent_message(
                                            CryptoDemo.Message.ClickedToggleCryptoIdClock()
                                        ),
                                        model.idClock === "Epoch",
                                        h
                                    ),
                                    choice_button(
                                        "Demo time",
                                        to_parent_message(
                                            CryptoDemo.Message.ClickedToggleCryptoIdClock()
                                        ),
                                        model.idClock === "DemoTime",
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("mt-5 grid gap-3")],
                                [
                                    metric(
                                        "active Clock",
                                        snapshot.clockLabel,
                                        h,
                                        "cyan"
                                    ),
                                    metric(
                                        "currentTimeMillis → ISO",
                                        snapshot.clockIso,
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Generated identifiers",
                [
                    h.div(
                        [h.Class("space-y-3 p-5")],
                        [
                            id_card(
                                "UUIDv4",
                                snapshot.uuidV4,
                                `Version nibble: ${snapshot.uuidV4Version} · randomness-only`,
                                h
                            ),
                            id_card(
                                "UUIDv7",
                                snapshot.uuidV7,
                                `Version nibble: ${snapshot.uuidV7Version} · active Clock + random bytes`,
                                h
                            ),
                            id_card(
                                "ULID",
                                snapshot.ulid,
                                `${snapshot.ulidLength} Crockford base32 characters · timestamp prefix + 80 random bits`,
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const digest_view = <ParentMessage>(
    model: CryptoDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const snapshot = CryptoDemo.digest_snapshot(model)
    const algorithms: ReadonlyArray<CryptoDemo.DigestChoice> = [
        "SHA-1",
        "SHA-256",
        "SHA-384",
        "SHA-512",
    ]

    return h.div(
        [h.Class("grid gap-5 xl:grid-cols-[0.78fr_1.22fr]")],
        [
            panel(
                "Digest input",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                ["algorithm"]
                            ),
                            h.div(
                                [h.Class("mt-3 flex flex-wrap gap-2")],
                                algorithms.map((algorithm) =>
                                    choice_button(
                                        algorithm,
                                        to_parent_message(
                                            CryptoDemo.Message.SelectedCryptoDigestAlgorithm(
                                                {
                                                    algorithm,
                                                }
                                            )
                                        ),
                                        model.digestAlgorithm === algorithm,
                                        h
                                    )
                                )
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-6 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                ["UTF-8 input"]
                            ),
                            h.div(
                                [h.Class("mt-3")],
                                [
                                    action_button(
                                        `${snapshot.input} · toggle input`,
                                        to_parent_message(
                                            CryptoDemo.Message.ClickedToggleCryptoDigestInput()
                                        ),
                                        h
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("mt-5 grid gap-3")],
                                [
                                    metric("text", snapshot.input, h),
                                    metric(
                                        "UTF-8 bytes · hex",
                                        snapshot.inputBytes,
                                        h
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Digest result",
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            h.div(
                                [h.Class("grid gap-3 sm:grid-cols-2")],
                                [
                                    metric(
                                        "algorithm",
                                        snapshot.algorithm,
                                        h,
                                        snapshot.legacy ? "amber" : "green"
                                    ),
                                    metric(
                                        "output length",
                                        `${snapshot.outputBytes} bytes / ${snapshot.outputBytes * 8} bits`,
                                        h,
                                        "green"
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-3 rounded-[var(--radius-surface)] border border-border bg-background p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["demo primitive output · hex"]
                                    ),
                                    h.code(
                                        [
                                            h.Class(
                                                "mt-2 block break-all font-mono text-xs leading-5 text-cyan-700"
                                            ),
                                        ],
                                        [snapshot.outputHex]
                                    ),
                                ]
                            ),
                            snapshot.legacy
                                ? h.div(
                                      [
                                          h.Class(
                                              "mt-3 rounded-[var(--radius-surface)] border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5 text-amber-700"
                                          ),
                                      ],
                                      [
                                          "SHA-1 is exposed for interoperability. Do not choose it for new security-sensitive designs.",
                                      ]
                                  )
                                : h.div(
                                      [
                                          h.Class(
                                              "mt-3 rounded-[var(--radius-surface)] border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs leading-5 text-cyan-700"
                                          ),
                                      ],
                                      [
                                          "The core service delegates digest bytes to the supplied primitive. Production platform layers use the host cryptography API.",
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

export const view = <ParentMessage>(
    model: CryptoDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const details = CryptoDemo.stage_details[model.stage]

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
                                        ["effect / Crypto"]
                                    ),
                                    h.h2(
                                        [
                                            h.Class(
                                                "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                                            ),
                                        ],
                                        ["Cryptography as an Effect service"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-3 max-w-2xl text-sm leading-6 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "Explore how secure platform primitives become injectable Effects for random values, identifiers, and SHA message digests.",
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
                                    list_pill("platform-independent", h),
                                    list_pill("Clock-aware IDs", h),
                                    list_pill("testable service", h),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            stage_tabs(model, to_parent_message, h),
            stage_intro(details, h),
            model.stage === "Service"
                ? service_view(h)
                : model.stage === "Random"
                  ? random_view(model, to_parent_message, h)
                  : model.stage === "IDs"
                    ? ids_view(model, to_parent_message, h)
                    : digest_view(model, to_parent_message, h),
            notice_panel(details, h),
        ]
    )
}

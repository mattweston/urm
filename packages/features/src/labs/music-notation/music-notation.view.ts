import { Effect } from "effect"
import { Schema as S } from "effect"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import abcjs from "abcjs"
import type { Model } from "./music-notation.model.ts"
import { HOST_ID, setRenderedTune } from "./music-notation.host.ts"
import {
    CompletedRenderedAbc,
    ClickedExample,
    ClickedPlay,
    ClickedStop,
    ToggledTablature,
} from "./music-notation.message.ts"
import type { Message as MusicNotationMessage } from "./music-notation.message.ts"

// MOUNT

const RenderAbc = Mount.define("RenderAbc", {
    args: { abcNotation: S.String, showTablature: S.Boolean },
    messages: [CompletedRenderedAbc],
    execute: ({ element, abcNotation, showTablature }) =>
        Effect.sync(() => {
            element.innerHTML = ""
            const foregroundColor = getComputedStyle(document.documentElement)
                .getPropertyValue("--foreground")
                .trim()
            const result = abcjs.renderAbc(element, abcNotation, {
                responsive: "resize",
                ...(foregroundColor.length > 0 ? { foregroundColor } : {}),
                ...(showTablature
                    ? {
                          tablature: [
                              {
                                  instrument: "guitar",
                                  label: "Guitar",
                                  tuning: ["E,", "A,", "D", "G", "B", "e"],
                              },
                          ],
                      }
                    : {}),
            })
            setRenderedTune(HOST_ID, result[0])
            return CompletedRenderedAbc({ abcNotation })
        }),
})

// EXAMPLES

const EXAMPLES: ReadonlyArray<{ label: string; abc: string }> = [
    {
        label: "C Major Arpeggio",
        abc: `X:1
M:4/4
L:1/8
K:C
|: C2 E2 G2 c2 | e2 d2 c2 B2 | A2 G2 F2 E2 | D4 C4 :|`,
    },
    {
        label: "Twinkle Twinkle",
        abc: `X:1
M:4/4
L:1/8
K:C
|: C C G G | A A G2 | F F E E | D D C2 :|`,
    },
    {
        label: "Scale",
        abc: `X:1
M:4/4
L:1/8
K:C
|: C D E F | G A B c | c B A G | F E D C :|`,
    },
    {
        label: "Guitar Reel",
        abc: `X:1
T:Cooley's
M:4/4
L:1/8
R:reel
K:Emin
|:D2|EB{c}BA B2 EB|~B2 AB dBAG|FDAD BDAD|FDAD dAFD|
EBBA B2 EB|B2 AB defg|afe^c dBAF|DEFD E2:|
|:gf|eB B2 efge|eB B2 gedB|A2 FA DAFA|A2 FA defg|
eB B2 eBgB|eB B2 defg|afe^c dBAF|DEFD E2:|`,
    },
]

// VIEW

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: MusicNotationMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [h.Class("mx-auto max-w-4xl space-y-6 p-6")],
        [
            h.h1(
                [h.Class("text-3xl font-bold tracking-tight")],
                ["Music Notation"]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                [
                    ...EXAMPLES.map(({ label, abc }) =>
                        h.button(
                            [
                                h.OnClick(
                                    toParentMessage(
                                        ClickedExample({
                                            abcNotation: abc,
                                        })
                                    )
                                ),
                                h.Class(
                                    "rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                                ),
                            ],
                            [label]
                        )
                    ),
                    h.button(
                        [
                            h.OnClick(
                                toParentMessage(
                                    model.isPlaying
                                        ? ClickedStop()
                                        : ClickedPlay()
                                )
                            ),
                            h.Class(
                                model.isPlaying
                                    ? "rounded-[var(--radius-control)] bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                                    : "rounded-[var(--radius-control)] bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                            ),
                        ],
                        [model.isPlaying ? "Stop" : "Play"]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) bg-card p-4"
                    ),
                ],
                [
                    h.pre(
                        [h.Class("overflow-x-auto text-xs leading-relaxed")],
                        [model.abcNotation]
                    ),
                ]
            ),
            h.button(
                [
                    h.OnClick(toParentMessage(ToggledTablature())),
                    h.Class(
                        model.showTablature
                            ? "rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            : "rounded-[var(--radius-control)] bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"
                    ),
                ],
                [model.showTablature ? "Hide Tablature" : "Show Tablature"]
            ),
            h.keyed("div")(
                model.abcNotation + String(model.showTablature),
                [
                    h.OnMount(
                        Mount.mapMessage(
                            RenderAbc({
                                abcNotation: model.abcNotation,
                                showTablature: model.showTablature,
                            }),
                            toParentMessage
                        )
                    ),
                    h.Class(
                        "min-h-[200px] rounded-[var(--radius-surface)] border-(length:--surface-border-width) bg-card p-4"
                    ),
                ],
                []
            ),
            h.div([h.Id(HOST_ID), h.Class("hidden")], []),
        ]
    )
}

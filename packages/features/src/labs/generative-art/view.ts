import { Canvas } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { Button, Slider } from "@foldkit/ui"

import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constant.ts"
import {
    ClickedReset,
    ClickedTogglePlay,
    GotFlowStrengthSliderMessage,
    GotNoiseScaleSliderMessage,
    MovedPointer,
    PressedCanvas,
    type GenerativeArtMessage,
} from "./message.ts"
import type { GenerativeArtModel } from "./model.ts"
import { sceneShapes } from "./shape.ts"

// The piece is lit from a black canvas, so its chrome stays dark in both site
// themes rather than following the palette. Everything outside the frame is
// ordinary page furniture.
const BUTTON_CLASS =
    "min-w-20 px-4 py-2 text-sm font-medium tracking-wide uppercase rounded-md " +
    "border-(length:--surface-border-width) border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 " +
    "text-white/85 transition-colors duration-200"

const SLIDER_ROW_CLASS = "flex flex-col gap-2 min-w-44"

const SLIDER_HEADER_CLASS =
    "flex items-baseline justify-between text-xs uppercase tracking-widest text-white/60"

const SLIDER_LABEL_CLASS = "cursor-pointer select-none"

const SLIDER_VALUE_CLASS = "text-white/40 tabular-nums"

const SLIDER_ROOT_CLASS =
    "relative h-5 w-full flex items-center select-none touch-none"

const SLIDER_TRACK_CLASS =
    "h-5 w-full rounded-full bg-white/10 py-2 bg-clip-content cursor-pointer"

const SLIDER_FILLED_TRACK_CLASS =
    "h-full rounded-full bg-fuchsia-400 py-2 bg-clip-content"

const SLIDER_THUMB_CLASS =
    "h-3 w-3 rounded-full bg-white border-(length:--surface-border-width) border-fuchsia-400 shadow cursor-grab focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 data-[dragging]:cursor-grabbing"

const sliderView = <ParentMessage>(
    label: string,
    sliderModel: Slider.Model,
    value: number,
    toSliderMessage: (message: Slider.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.submodel({
        slotId: sliderModel.id,
        model: sliderModel,
        view: Slider.view,
        viewInputs: {
            value,
            formatValue: (value) => value.toFixed(2),
            toView: (attributes) =>
                h.div(
                    [h.Class(SLIDER_ROW_CLASS)],
                    [
                        h.div(
                            [h.Class(SLIDER_HEADER_CLASS)],
                            [
                                h.label(
                                    [
                                        ...attributes.label,
                                        h.Class(SLIDER_LABEL_CLASS),
                                    ],
                                    [label]
                                ),
                                h.span(
                                    [h.Class(SLIDER_VALUE_CLASS)],
                                    [value.toFixed(2)]
                                ),
                            ]
                        ),
                        h.div(
                            [...attributes.root, h.Class(SLIDER_ROOT_CLASS)],
                            [
                                h.div(
                                    [
                                        ...attributes.track,
                                        h.Class(SLIDER_TRACK_CLASS),
                                    ],
                                    [
                                        h.div([
                                            ...attributes.filledTrack,
                                            h.Class(SLIDER_FILLED_TRACK_CLASS),
                                        ]),
                                    ]
                                ),
                                h.div([
                                    ...attributes.thumb,
                                    h.Class(SLIDER_THUMB_CLASS),
                                ]),
                            ]
                        ),
                    ]
                ),
        },
        toParentMessage: toSliderMessage,
    })

const controlButton = <ParentMessage>(
    label: string,
    onClick: ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Button.view(
        {
            onClick,
            toView: (attributes) =>
                h.button(
                    [...attributes.button, h.Class(BUTTON_CLASS)],
                    [label]
                ),
        },
        h
    )

const controlsView = <ParentMessage>(
    model: GenerativeArtModel,
    toParentMessage: (message: GenerativeArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-wrap items-end gap-6 mt-4 px-6 py-4 rounded-[var(--radius-surface)] bg-black/40 border-(length:--surface-border-width) border-white/10 backdrop-blur"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center gap-3")],
                [
                    controlButton(
                        model.isRunning ? "Pause" : "Play",
                        toParentMessage(ClickedTogglePlay()),
                        h
                    ),
                    controlButton("Reset", toParentMessage(ClickedReset()), h),
                    h.span(
                        [
                            h.Class(
                                "text-xs uppercase tracking-widest text-white/40"
                            ),
                        ],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "inline-block tabular-nums text-right min-w-8 tracking-normal"
                                    ),
                                ],
                                [`${model.particles.length}`]
                            ),
                            " particles",
                        ]
                    ),
                ]
            ),
            sliderView(
                "Turbulence",
                model.flowStrengthSlider,
                model.flowStrength,
                (message) =>
                    toParentMessage(GotFlowStrengthSliderMessage({ message })),
                h
            ),
            sliderView(
                "Noise scale",
                model.noiseScaleSlider,
                model.noiseScale,
                (message) =>
                    toParentMessage(GotNoiseScaleSliderMessage({ message })),
                h
            ),
        ]
    )

export const generativeArtView = <ParentMessage>(
    model: GenerativeArtModel,
    toParentMessage: (message: GenerativeArtMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-2xl p-6 bg-[radial-gradient(ellipse_at_top,_#1a0a2c_0%,_#04010a_55%,_#000_100%)] font-mono select-none"
            ),
        ],
        [
            h.p(
                [
                    h.Class(
                        "mb-4 text-xs tracking-widest text-white/40 uppercase"
                    ),
                ],
                ["Move to stir. Click to bloom."]
            ),
            Canvas.view(
                {
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    shapes: sceneShapes(model),
                    className:
                        "max-w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-white/10 cursor-crosshair bg-card text-card-foreground [box-shadow:var(--shadow-surface)]",
                    onPointerDown: ({ x, y }) =>
                        toParentMessage(PressedCanvas({ x, y })),
                    onPointerMove: ({ x, y }) =>
                        toParentMessage(MovedPointer({ x, y })),
                },
                h
            ),
            controlsView(model, toParentMessage, h),
        ]
    )

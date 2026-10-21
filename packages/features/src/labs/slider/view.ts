import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

const rowClassName = "flex flex-col gap-2 w-full max-w-sm"

const headerClassName =
    "flex items-center justify-between text-sm text-foreground"

const labelClassName = "font-medium cursor-pointer select-none"

const valueClassName = "tabular-nums text-muted-foreground"

const rootClassName =
    "relative h-6 w-full flex items-center select-none touch-none"

const trackClassName = "h-1.5 w-full rounded-full bg-muted"

const filledTrackClassName = "h-full rounded-full bg-primary"

const thumbClassName =
    "h-5 w-5 rounded-full bg-background border-2 border-primary shadow cursor-grab focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 data-[dragging]:cursor-grabbing"

const ratingFormatted = (value: number): string => `${value} of 10`
const volumeFormatted = (value: number): string => `${Math.round(value * 100)}%`

export const view = <ParentMessage>(
    sliderRating: Ui.Slider.Model,
    ratingValue: number,
    sliderVolume: Ui.Slider.Model,
    volumeValue: number,
    ratingToMessage: (message: Ui.Slider.Message) => ParentMessage,
    volumeToMessage: (message: Ui.Slider.Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Slider"]
            ),
            h.div(
                [h.Class("flex flex-col gap-8 max-w-sm")],
                [
                    h.submodel({
                        slotId: sliderRating.id,
                        model: sliderRating,
                        view: Ui.Slider.view,
                        viewInputs: {
                            value: ratingValue,
                            formatValue: (value) => `${value} of 10`,
                            toView: (attributes) =>
                                h.div(
                                    [h.Class(rowClassName)],
                                    [
                                        h.div(
                                            [h.Class(headerClassName)],
                                            [
                                                h.label(
                                                    [
                                                        ...attributes.label,
                                                        h.Class(labelClassName),
                                                    ],
                                                    ["Rating"]
                                                ),
                                                h.span(
                                                    [h.Class(valueClassName)],
                                                    [
                                                        ratingFormatted(
                                                            ratingValue
                                                        ),
                                                    ]
                                                ),
                                            ]
                                        ),
                                        h.div(
                                            [
                                                ...attributes.root,
                                                h.Class(rootClassName),
                                            ],
                                            [
                                                h.div(
                                                    [
                                                        ...attributes.track,
                                                        h.Class(trackClassName),
                                                    ],
                                                    [
                                                        h.div(
                                                            [
                                                                ...attributes.filledTrack,
                                                                h.Class(
                                                                    filledTrackClassName
                                                                ),
                                                            ],
                                                            []
                                                        ),
                                                    ]
                                                ),
                                                h.div(
                                                    [
                                                        ...attributes.thumb,
                                                        h.Class(thumbClassName),
                                                    ],
                                                    []
                                                ),
                                            ]
                                        ),
                                    ]
                                ),
                        },
                        toParentMessage: ratingToMessage,
                    }),
                    h.submodel({
                        slotId: sliderVolume.id,
                        model: sliderVolume,
                        view: Ui.Slider.view,
                        viewInputs: {
                            value: volumeValue,
                            formatValue: (value) =>
                                `${Math.round(value * 100)} percent`,
                            toView: (attributes) =>
                                h.div(
                                    [h.Class(rowClassName)],
                                    [
                                        h.div(
                                            [h.Class(headerClassName)],
                                            [
                                                h.label(
                                                    [
                                                        ...attributes.label,
                                                        h.Class(labelClassName),
                                                    ],
                                                    ["Volume"]
                                                ),
                                                h.span(
                                                    [h.Class(valueClassName)],
                                                    [
                                                        volumeFormatted(
                                                            volumeValue
                                                        ),
                                                    ]
                                                ),
                                            ]
                                        ),
                                        h.div(
                                            [
                                                ...attributes.root,
                                                h.Class(rootClassName),
                                            ],
                                            [
                                                h.div(
                                                    [
                                                        ...attributes.track,
                                                        h.Class(trackClassName),
                                                    ],
                                                    [
                                                        h.div(
                                                            [
                                                                ...attributes.filledTrack,
                                                                h.Class(
                                                                    filledTrackClassName
                                                                ),
                                                            ],
                                                            []
                                                        ),
                                                    ]
                                                ),
                                                h.div(
                                                    [
                                                        ...attributes.thumb,
                                                        h.Class(thumbClassName),
                                                    ],
                                                    []
                                                ),
                                            ]
                                        ),
                                    ]
                                ),
                        },
                        toParentMessage: volumeToMessage,
                    }),
                ]
            ),
        ]
    )
}

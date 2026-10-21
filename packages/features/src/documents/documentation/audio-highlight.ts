import { Option, Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { modifyFields } from "foldkit/struct"
import type { Html, HtmlBuilder } from "foldkit/html"

export type LineRange = readonly [number, number]

export const Model = S.Struct({ step_index: S.Number })
export type Model = typeof Model.Type

export const SelectedStep = taggedStruct("SelectedStep", {
    step_index: S.Number,
})
export const Message = S.Union([SelectedStep])
export type Message = typeof Message.Type

export const init = (): Model => ({ step_index: 0 })

export const update = (model: Model, message: Message): Model =>
    modifyFields(model, { step_index: () => message.step_index })

const parseRange = (value: string): LineRange | undefined => {
    const [start_value, end_value] = value.split("-")
    const start = Number.parseInt(start_value ?? "", 10)
    const end = Number.parseInt(end_value ?? start_value ?? "", 10)

    return Number.isNaN(start) || Number.isNaN(end) || start < 1 || end < start
        ? undefined
        : [start, end]
}

export const parseRanges = (value: string): ReadonlyArray<LineRange> =>
    value
        .split(",")
        .map((range) => parseRange(range.trim()))
        .filter((range) => range !== undefined)

const NOTE_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
]

const SCALE_INTERVALS = {
    major: [0, 2, 4, 5, 7, 9, 11, 12],
    minor: [0, 2, 3, 5, 7, 8, 10, 12],
    pentatonic: [0, 2, 4, 7, 9, 12],
    blues: [0, 3, 5, 6, 7, 10, 12],
}

const rootMidi = (root_note: string): number => {
    const match = /^([A-G]#?)(\d)$/.exec(root_note)
    if (match === null) {
        return 60
    }

    const note_index = NOTE_NAMES.findIndex((note) => note === match[1])
    const octave = Number.parseInt(match[2] ?? "", 10)

    return note_index < 0 || Number.isNaN(octave)
        ? 60
        : (octave + 1) * 12 + note_index
}

const frequencies = (
    count: number,
    scale: keyof typeof SCALE_INTERVALS,
    root_note: string
): ReadonlyArray<number> => {
    const intervals = SCALE_INTERVALS[scale]
    const root_midi = rootMidi(root_note)

    return Array.from({ length: count }, (_, index) => {
        const interval = intervals[index % intervals.length] ?? 0

        return 440 * Math.pow(2, (root_midi + interval - 69) / 12)
    })
}

export const view = <ParentMessage>(
    model: Model,
    ranges: ReadonlyArray<LineRange>,
    explanations: ReadonlyArray<string>,
    scale: keyof typeof SCALE_INTERVALS,
    root_note: string,
    content: ReadonlyArray<Html>,
    to_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const step_index = Math.max(
        0,
        Math.min(model.step_index, ranges.length - 1)
    )
    const range = ranges[step_index]
    const frequency = frequencies(ranges.length, scale, root_note)[step_index]
    const step_frequencies = frequencies(ranges.length, scale, root_note)

    return h.div(
        [h.Class("documentation-audio-highlight")],
        [
            h.div(
                [
                    h.Class("documentation-audio-highlight-steps"),
                    h.Role("group"),
                    h.AriaLabel("Code walkthrough steps"),
                ],
                ranges.map((_range, index) =>
                    h.button(
                        [
                            h.Type("button"),
                            h.Class("documentation-audio-highlight-step"),
                            h.Id(`documentation-audio-highlight-step-${index}`),
                            h.OnClick(
                                to_message(SelectedStep({ step_index: index }))
                            ),
                            h.OnKeyDownFocus((key) => {
                                const next_index =
                                    key === "ArrowRight"
                                        ? (index + 1) % ranges.length
                                        : key === "ArrowLeft"
                                          ? (index - 1 + ranges.length) %
                                            ranges.length
                                          : key === "Home"
                                            ? 0
                                            : key === "End"
                                              ? ranges.length - 1
                                              : undefined

                                if (
                                    next_index === undefined ||
                                    ranges.length === 0
                                ) {
                                    return Option.none()
                                }

                                return Option.some({
                                    focusSelector: `#documentation-audio-highlight-step-${next_index}`,
                                    message: to_message(
                                        SelectedStep({ step_index: next_index })
                                    ),
                                })
                            }),
                            h.DataAttribute(
                                "audio-frequency",
                                String(step_frequencies[index] ?? 440)
                            ),
                            ...(index === step_index
                                ? [
                                      h.DataAttribute("active", ""),
                                      h.DataAttribute("audio-active", ""),
                                      h.AriaCurrent("step"),
                                  ]
                                : []),
                            h.AriaLabel(`Step ${index + 1}`),
                        ],
                        [String(index + 1)]
                    )
                )
            ),
            h.p(
                [
                    h.Class("documentation-audio-highlight-explanation"),
                    h.AriaLive("polite"),
                ],
                [
                    explanations[step_index] ??
                        (range === undefined
                            ? "No walkthrough step"
                            : `Lines ${range[0]}–${range[1]}`),
                ]
            ),
            h.div(
                [
                    h.Class("documentation-audio-highlight-code"),
                    h.DataAttribute("audio-highlight", ""),
                    h.DataAttribute("step-index", String(step_index)),
                    h.DataAttribute("range-start", String(range?.[0] ?? 0)),
                    h.DataAttribute("range-end", String(range?.[1] ?? 0)),
                    h.DataAttribute("frequency", String(frequency ?? 440)),
                ],
                content
            ),
        ]
    )
}

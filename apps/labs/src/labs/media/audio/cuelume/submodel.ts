import { Effect, Match, Schema } from "effect"
import { Command, Mount, Submodel } from "foldkit"
import { m } from "foldkit/message"
import { bind, play, setEnabled, setVolume, sounds } from "cuelume"
import type { DesktopRoute } from "../../../../routing/route.ts"

export const cuelume_href = () => "/labs/media/audio/cuelume"
export const is_cuelume_path = (path: string) =>
    path.replace(/\/$/, "") === "/labs/media/audio/cuelume"

const Sound = Schema.Literals(sounds)
export const Model = Schema.Struct({
    active: Schema.Boolean,
    enabled: Schema.Boolean,
    volume: Schema.Number,
    last_sound: Schema.String,
    is_expanded: Schema.Boolean,
})
export type Model = typeof Model.Type

const CompletedAudio = m("CompletedAudio")
const ClickedMute = m("ClickedMute")
const ChangedVolume = m("ChangedVolume", { value: Schema.String })
const ClickedSound = m("ClickedSound", { sound: Sound })
const ClickedSave = m("ClickedSave")
const ClickedReveal = m("ClickedReveal")
export const Message = Schema.Union([
    CompletedAudio,
    ClickedMute,
    ChangedVolume,
    ClickedSound,
    ClickedSave,
    ClickedReveal,
])
export type Message = typeof Message.Type

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const ConfigureCuelumeAudio = Command.define("ConfigureCuelumeAudio", {
    args: { enabled: Schema.Boolean, volume: Schema.Number },
    messages: [CompletedAudio],
    execute: ({ enabled, volume }) =>
        Effect.sync(() => {
            setEnabled(enabled)
            setVolume(volume)
            return CompletedAudio()
        }),
})
const PlayCuelumeOutcome = Command.define("PlayCuelumeOutcome", {
    args: { sound: Sound },
    messages: [CompletedAudio],
    execute: ({ sound }) =>
        Effect.sync(() => {
            play(sound)
            return CompletedAudio()
        }),
})
const BindAudio = Mount.define(
    "BindCuelumeAudio",
    {
        enabled: Schema.Boolean,
        volume: Schema.Number,
    },
    CompletedAudio
)(
    ({ enabled, volume }) =>
        (element) =>
            Effect.acquireRelease(
                Effect.sync(() => {
                    setEnabled(enabled)
                    setVolume(volume)
                    bind(element)
                }),
                () => Effect.sync(() => setEnabled(false))
            ).pipe(Effect.as(CompletedAudio()))
)

export const init = (route: DesktopRoute): Model => ({
    active: route._tag === "Labs" && is_cuelume_path(route.labs_path),
    enabled: true,
    volume: 0.4,
    last_sound: "None yet",
    is_expanded: false,
})
export const changed_route = (model: Model, route: DesktopRoute): Model => {
    const active = route._tag === "Labs" && is_cuelume_path(route.labs_path)
    return active === model.active
        ? model
        : {
              ...init(route),
              enabled: model.enabled,
              volume: model.volume,
          }
}
export const update = (model: Model, message: Message): UpdateReturn => {
    if (!model.active) return [model, []]
    return Match.value(message).pipe(
        Match.withReturnType<UpdateReturn>(),
        Match.tagsExhaustive({
            CompletedAudio: () => [model, []],
            ClickedMute: () => {
                const enabled = !model.enabled
                return [
                    { ...model, enabled },
                    [ConfigureCuelumeAudio({ enabled, volume: model.volume })],
                ]
            },
            ChangedVolume: ({ value }) => {
                const parsed = Number(value)
                if (!Number.isFinite(parsed)) return [model, []]
                const volume = Math.max(0, Math.min(1, parsed / 100))
                return [
                    { ...model, volume },
                    [ConfigureCuelumeAudio({ enabled: model.enabled, volume })],
                ]
            },
            ClickedSound: ({ sound }) => [{ ...model, last_sound: sound }, []],
            ClickedSave: () => [
                { ...model, last_sound: "success" },
                [PlayCuelumeOutcome({ sound: "success" })],
            ],
            ClickedReveal: () => {
                const is_expanded = !model.is_expanded
                const sound = is_expanded ? "bloom" : "droplet"
                return [
                    { ...model, is_expanded, last_sound: sound },
                    [PlayCuelumeOutcome({ sound })],
                ]
            },
        })
    )
}

const descriptions: Record<typeof Sound.Type, string> = {
    arrival: "Arrival cue",
    pulse: "Pulsing cue",
    scan: "Scanning cue",
    chime: "Soft ascending bell",
    sparkle: "Four-note twinkle",
    droplet: "Descending note",
    bloom: "Warm, slow swell",
    whisper: "Quiet, breathy swell",
    tick: "Crisp navigation tick",
    press: "Muted press",
    release: "Springy release",
    toggle: "Mechanical click",
    success: "Three-note confirmation",
    error: "Gentle refusal",
    page: "Papery flick",
    loading: "Rising shimmer",
    ready: "Harmonic bloom",
}
const button_class =
    "cursor-pointer rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.section(
        [
            h.Class("mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6"),
            h.OnMount(
                BindAudio({ enabled: model.enabled, volume: model.volume })
            ),
        ],
        [
            h.header(
                [h.Class("space-y-2")],
                [
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        ["Media / Audio"]
                    ),
                    h.h1(
                        [h.Class("text-3xl font-semibold tracking-tight")],
                        ["Cuelume"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-muted-foreground")],
                        [
                            `Explore ${sounds.length} synthesized interaction sounds. Click a sound to preview it, then try the controls below.`,
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "flex flex-wrap items-center gap-6 rounded-xl border border-border bg-card p-5"
                    ),
                ],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(button_class),
                            h.AriaPressed(String(!model.enabled)),
                            h.OnClick(ClickedMute()),
                        ],
                        [model.enabled ? "Mute sounds" : "Unmute sounds"]
                    ),
                    h.label(
                        [h.Class("flex items-center gap-3 text-sm")],
                        [
                            `Volume ${Math.round(model.volume * 100)}%`,
                            h.input([
                                h.Type("range"),
                                h.Attribute("min", "0"),
                                h.Attribute("max", "100"),
                                h.Attribute("step", "1"),
                                h.Value(String(model.volume * 100)),
                                h.AriaLabel("Sound volume"),
                                h.OnInput((value) => ChangedVolume({ value })),
                            ]),
                        ]
                    ),
                    h.p(
                        [
                            h.Class("text-sm text-muted-foreground"),
                            h.Attribute("aria-live", "polite"),
                        ],
                        [`Last selected: ${model.last_sound}`]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-3 sm:grid-cols-2 lg:grid-cols-3")],
                sounds.map((sound) =>
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(`${button_class} space-y-1 text-left`),
                            h.Attribute("data-cuelume-toggle", sound),
                            h.OnClick(ClickedSound({ sound })),
                        ],
                        [
                            h.span([h.Class("block capitalize")], [sound]),
                            h.span(
                                [
                                    h.Class(
                                        "block text-xs font-normal text-muted-foreground"
                                    ),
                                ],
                                [descriptions[sound]]
                            ),
                        ]
                    )
                )
            ),
            h.section(
                [h.Class("space-y-4 rounded-xl border border-border p-5")],
                [
                    h.h2(
                        [h.Class("text-xl font-semibold")],
                        ["Try interaction sounds"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "Hover and press use a mouse. Click previews also work with touch and keyboard. Your browser may require a click before hover sounds play.",
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap gap-3")],
                        [
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Class(button_class),
                                    h.Attribute("data-cuelume-hover", "tick"),
                                    h.Attribute("data-cuelume-press", ""),
                                    h.Attribute("data-cuelume-release", ""),
                                ],
                                ["Hover, press, release"]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Class(button_class),
                                    h.OnClick(ClickedSave()),
                                ],
                                ["Preview save confirmation"]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Class(button_class),
                                    h.AriaExpanded(model.is_expanded),
                                    h.Attribute(
                                        "aria-controls",
                                        "cuelume-reveal"
                                    ),
                                    h.OnClick(ClickedReveal()),
                                ],
                                [
                                    model.is_expanded
                                        ? "Collapse details"
                                        : "Reveal details",
                                ]
                            ),
                        ]
                    ),
                    ...(model.is_expanded
                        ? [
                              h.p(
                                  [
                                      h.Id("cuelume-reveal"),
                                      h.Class(
                                          "rounded-lg bg-muted p-4 text-sm"
                                      ),
                                  ],
                                  [
                                      "A warm bloom accompanies the reveal; a descending droplet accompanies dismissal.",
                                  ]
                              ),
                          ]
                        : []),
                ]
            ),
        ]
    )
)

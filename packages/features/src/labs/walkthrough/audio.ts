import { Array, Effect, Match as M, Option, Schema as S } from "effect"
import { Command, ManagedResource, type Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"

// One AudioContext for the whole lab, acquired when the reader turns sound on
// and released when they turn it off. The Effect Atom version builds a fresh
// context per tone and closes it on `ended`; a browser will refuse to start one
// at all without a gesture, so owning it is both cheaper and the only way to
// know whether a cue can be played.
const AudioContextResource = ManagedResource.tag<AudioContext>()("AudioContext")

export type AudioService = ManagedResource.ServiceOf<
    typeof AudioContextResource
>

export const resource = AudioContextResource

export const AudioOff = taggedStruct("AudioOff")
export const AudioStarting = taggedStruct("AudioStarting")
// `maybe_diagnostic` carries what the last cue saw — the context's own state,
// or why it could not be reached. A cue that plays into a suspended context
// makes no sound and raises nothing, so without this the only symptom is
// silence.
export const AudioReady = taggedStruct("AudioReady", {
    maybe_diagnostic: S.Option(S.String),
})
export const AudioFailed = taggedStruct("AudioFailed", { reason: S.String })
export const Model = S.Union([AudioOff, AudioStarting, AudioReady, AudioFailed])
export type Model = typeof Model.Type

export const init: Model = AudioOff()

export const Running = taggedStruct("Running")
export const DiceLanded = taggedStruct("DiceLanded")
export const RollStarted = taggedStruct("RollStarted")
export const RollLanded = taggedStruct("RollLanded")
export const AuthorSelected = taggedStruct("AuthorSelected", {
    author_index: S.Number,
})
export const AuthorLanded = taggedStruct("AuthorLanded")
export const LikeToggled = taggedStruct("LikeToggled", { is_liked: S.Boolean })
export const LikeConfirmed = taggedStruct("LikeConfirmed")
export const SwitchFlipped = taggedStruct("SwitchFlipped")
export const TodoAdded = taggedStruct("TodoAdded")
export const TodoRemoved = taggedStruct("TodoRemoved")
export const Cue = S.Union([
    Running,
    DiceLanded,
    RollStarted,
    RollLanded,
    AuthorSelected,
    AuthorLanded,
    LikeToggled,
    LikeConfirmed,
    SwitchFlipped,
    TodoAdded,
    TodoRemoved,
])
export type Cue = typeof Cue.Type

const Waveform = S.Literals(["Sine", "Triangle"])
type Waveform = typeof Waveform.Type

type Tone = Readonly<{
    frequency: number
    waveform: Waveform
    duration_seconds: number
    volume: number
    delay_seconds: number
}>

const tone = (
    frequency: number,
    waveform: Waveform,
    duration_seconds: number,
    volume: number,
    delay_seconds = 0
): Tone => ({ frequency, waveform, duration_seconds, volume, delay_seconds })

const AUTHOR_SEQUENCES: ReadonlyArray<ReadonlyArray<number>> = [
    [261.63, 329.63, 392],
    [293.66, 349.23, 440],
    [164.81, 164.81],
    [349.23, 440, 523.25],
    [392, 493.88, 587.33],
    [440, 523.25, 659.25],
]

const arpeggio = (
    notes: ReadonlyArray<number>,
    waveform: Waveform,
    duration_seconds: number,
    volume: number,
    step_seconds: number
): ReadonlyArray<Tone> =>
    Array.map(notes, (frequency, note_index) =>
        tone(
            frequency,
            waveform,
            duration_seconds,
            volume,
            note_index * step_seconds
        )
    )

// Every cue is a list of tones with their offsets, scheduled together on the
// context's own clock. The atom version sequences the same cues with
// setTimeout, which drifts under load; nothing here needs a timer.
const cue_tones = (cue: Cue): ReadonlyArray<Tone> =>
    M.value(cue).pipe(
        M.withReturnType<ReadonlyArray<Tone>>(),
        M.tagsExhaustive({
            Running: () => [tone(196, "Sine", 0.08, 0.025)],
            DiceLanded: () => [
                tone(261.63, "Triangle", 0.22, 0.035),
                tone(329.63, "Triangle", 0.32, 0.03, 0.065),
            ],
            RollStarted: () => [
                tone(392, "Sine", 0.1, 0.025),
                tone(329.63, "Sine", 0.1, 0.022, 0.065),
                tone(261.63, "Sine", 0.12, 0.02, 0.13),
            ],
            RollLanded: () => [
                tone(659.25, "Triangle", 0.2, 0.035),
                tone(783.99, "Triangle", 0.2, 0.032, 0.075),
                tone(1046.5, "Triangle", 0.32, 0.03, 0.15),
            ],
            AuthorSelected: ({ author_index }) =>
                arpeggio(
                    AUTHOR_SEQUENCES[author_index] ?? AUTHOR_SEQUENCES[0] ?? [],
                    "Sine",
                    0.18,
                    0.022,
                    0.095
                ),
            AuthorLanded: () => [
                tone(440, "Triangle", 0.16, 0.03),
                tone(659.25, "Triangle", 0.16, 0.03),
                tone(440, "Triangle", 0.16, 0.028, 0.11),
                tone(659.25, "Triangle", 0.16, 0.028, 0.11),
            ],
            LikeToggled: ({ is_liked }) =>
                arpeggio(
                    is_liked
                        ? [349.23, 440, 523.25, 698.46]
                        : [523.25, 440, 349.23],
                    "Sine",
                    0.2,
                    0.025,
                    0.085
                ),
            LikeConfirmed: () => [
                tone(880, "Triangle", 0.22, 0.03),
                tone(1318.51, "Triangle", 0.22, 0.03),
            ],
            SwitchFlipped: () => [tone(659.25, "Sine", 0.16, 0.025)],
            TodoAdded: () => [
                tone(523.25, "Sine", 0.16, 0.025),
                tone(659.25, "Sine", 0.2, 0.025, 0.085),
            ],
            TodoRemoved: () => [
                tone(329.63, "Sine", 0.16, 0.025),
                tone(261.63, "Sine", 0.2, 0.025, 0.085),
            ],
        })
    )

const oscillator_type = (waveform: Waveform): OscillatorType =>
    waveform === "Sine" ? "sine" : "triangle"

const schedule_tone = (context: AudioContext, value: Tone): void => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start_time = context.currentTime + value.delay_seconds
    const end_time = start_time + value.duration_seconds

    oscillator.type = oscillator_type(value.waveform)
    oscillator.frequency.setValueAtTime(value.frequency, start_time)
    gain.gain.setValueAtTime(value.volume, start_time)
    gain.gain.exponentialRampToValueAtTime(0.001, end_time)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(start_time)
    oscillator.stop(end_time)
}

export const ToggledAudio = taggedStruct("ToggledAudio")
export const StartedAudio = taggedStruct("StartedAudio")
export const StoppedAudio = taggedStruct("StoppedAudio")
export const FailedStartAudio = taggedStruct("FailedStartAudio", {
    reason: S.String,
})
export const CompletedPlayCue = taggedStruct("CompletedPlayCue", {
    context_state: S.String,
})
export const FailedPlayCue = taggedStruct("FailedPlayCue", { reason: S.String })
export const Message = S.Union([
    ToggledAudio,
    StartedAudio,
    StoppedAudio,
    FailedStartAudio,
    CompletedPlayCue,
    FailedPlayCue,
])
export type Message = typeof Message.Type

// Firing a cue while sound is off is not an error worth handling at the call
// site: `.get` fails with `ResourceNotAvailable` and the cue is dropped, so
// every example can ask for its cue unconditionally. Anything else that goes
// wrong reaches the Model instead of being swallowed with it.
const PlayCue = Command.define("PlayCue", {
    args: { cue: Cue },
    messages: [CompletedPlayCue, FailedPlayCue],
    execute: ({ cue }) =>
        AudioContextResource.get.pipe(
            Effect.flatMap((context) =>
                // Backgrounding a tab suspends the context again, so the state
                // is worth re-checking rather than trusting what acquire left.
                (context.state === "suspended"
                    ? Effect.tryPromise(() => context.resume())
                    : Effect.void
                ).pipe(
                    Effect.andThen(
                        Effect.sync(() => {
                            Array.forEach(cue_tones(cue), (value) =>
                                schedule_tone(context, value)
                            )
                            return CompletedPlayCue({
                                context_state: context.state,
                            })
                        })
                    )
                )
            ),
            Effect.catchTag("ResourceNotAvailable", () =>
                Effect.succeed(
                    CompletedPlayCue({ context_state: "unavailable" })
                )
            ),
            Effect.catch((error) =>
                Effect.succeed(FailedPlayCue({ reason: String(error) }))
            )
        ),
})

// Narrower than Message on purpose: a cue can only ever resolve to
// CompletedPlayCue or FailedPlayCue, so an example adds those two to its own
// union rather than the whole audio lifecycle.
export type CueCompleted =
    | typeof CompletedPlayCue.Type
    | typeof FailedPlayCue.Type

export const play = (
    cue: Cue
): Command.Command<CueCompleted, never, AudioService> => PlayCue({ cue })

type UpdateReturn = Update.Return<Model, Message, AudioService>

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ToggledAudio: () => ({
                model: M.value(model).pipe(
                    M.withReturnType<Model>(),
                    M.tag("AudioOff", "AudioFailed", () => AudioStarting()),
                    M.tag("AudioStarting", "AudioReady", () => AudioOff()),
                    M.exhaustive
                ),
                commands: [],
            }),
            StartedAudio: () => ({
                model: AudioReady({ maybe_diagnostic: Option.none() }),
                commands: [],
            }),
            StoppedAudio: () => ({ model: AudioOff(), commands: [] }),
            FailedStartAudio: ({ reason }) => ({
                model: AudioFailed({ reason }),
                commands: [],
            }),
            CompletedPlayCue: ({ context_state }) => ({
                model:
                    context_state === "running" ||
                    context_state === "unavailable"
                        ? model
                        : model._tag === "AudioReady"
                          ? AudioReady({
                                maybe_diagnostic: Option.some(
                                    `context ${context_state}`
                                ),
                            })
                          : model,
                commands: [],
            }),
            FailedPlayCue: ({ reason }) => ({
                model:
                    model._tag === "AudioReady"
                        ? AudioReady({ maybe_diagnostic: Option.some(reason) })
                        : model,
                commands: [],
            }),
        })
    )

export const is_ready = (model: Model): boolean => model._tag === "AudioReady"

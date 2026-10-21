// A port of `.context/visual-effect/src/sounds/TaskSounds.ts`.
//
// Upstream plays no sound files: every cue is synthesised, and the pitch is
// chosen by a walk over a pentatonic scale so repeated events climb it and
// simultaneous ones voice as one chord. That behaviour is the sound design, so
// matching it means porting the synthesis rather than picking samples.
//
// The class becomes a plain object because a Foldkit feature has nowhere to put
// a singleton: the whole thing is scoped to the audio ManagedResource, which is
// what owns its lifetime and disposes it.

// Tone is large and only needed once sound is actually on, so it is imported
// lazily — the same reason the effect-website defers its own tone engine.
type ToneModule = typeof import("tone")
type PolySynth = InstanceType<ToneModule["PolySynth"]>

const PENTATONIC_SCALE = ["C", "D", "E", "G", "A"]
const BASE_OCTAVE = 3

// Events within this window are voiced as adjacent degrees of the same chord
// rather than advancing the walk.
const CHORD_WINDOW_MILLIS = 100

// Upstream latches failure and interrupt so a burst of them is one sound.
const REPEAT_SUPPRESSION_MILLIS = 200

export type SoundSystem = {
    readonly tone: ToneModule
    readonly synths: Readonly<Record<string, PolySynth>>
    readonly volume: InstanceType<ToneModule["Volume"]>
    readonly nodes: ReadonlyArray<{ dispose: () => unknown }>
    walk: Walk
    suppress_failure_until: number
    suppress_interrupt_until: number
}

// The walk, as data. Kept separate from the synths so it can be asserted
// without an AudioContext — the arithmetic is the part with behaviour in it.
export type Walk = Readonly<{
    note_index: number
    chord_window_start: number | undefined
    chord_step: number
    chord_base_index: number
    chord_base_octave: number
}>

export const initial_walk: Walk = {
    note_index: 0,
    chord_window_start: undefined,
    chord_step: 0,
    chord_base_index: 0,
    chord_base_octave: 0,
}

export const advance_walk = (
    walk: Walk,
    octave_offset: number,
    now: number
): { readonly scale_index: number; readonly walk: Walk } => {
    const in_window =
        walk.chord_window_start !== undefined &&
        now - walk.chord_window_start <= CHORD_WINDOW_MILLIS

    const base = in_window
        ? walk
        : {
              ...walk,
              chord_window_start: now,
              chord_step: 0,
              chord_base_index: walk.note_index % PENTATONIC_SCALE.length,
              chord_base_octave: octave_offset,
          }

    return {
        scale_index:
            (base.chord_base_index + base.chord_step) % PENTATONIC_SCALE.length,
        walk: {
            ...base,
            chord_step: base.chord_step + 1,
            note_index: (base.note_index + 1) % (PENTATONIC_SCALE.length * 2),
        },
    }
}

// PORT NOTE: upstream calls this with `octaveOffset` of 0.5 for "half an octave
// higher" and then builds the note name as `${note}${BASE_OCTAVE + 0.5}` — i.e.
// "C3.5", which is not a note Tone can parse. Fractional offsets are applied as
// a semitone transpose here instead, which is what the comment intends.
// Narrowed to the one thing note naming needs, so it can be exercised without
// an AudioContext. `ToneModule` satisfies this structurally.
export type NoteTransposer = Readonly<{
    Frequency: (name: string) => {
        transpose: (semitones: number) => { toNote: () => string }
    }
}>

export const walk_note = (
    tone: NoteTransposer,
    scale_index: number,
    octave_offset: number
): string => {
    const whole_octaves = Math.floor(octave_offset)
    const semitones = Math.round((octave_offset - whole_octaves) * 12)
    const name = `${PENTATONIC_SCALE[scale_index] ?? "C"}${(
        BASE_OCTAVE + whole_octaves
    ).toString()}`

    return semitones === 0
        ? name
        : tone.Frequency(name).transpose(semitones).toNote()
}

const next_note = (
    system: SoundSystem,
    octave_offset: number,
    now: number
): string => {
    const advanced = advance_walk(system.walk, octave_offset, now)

    system.walk = advanced.walk

    return walk_note(
        system.tone,
        advanced.scale_index,
        advanced.walk.chord_base_octave
    )
}

export const create_sound_system = async (): Promise<SoundSystem> => {
    const tone = await import("tone")

    // Must be awaited before any node is created, or the nodes race the
    // context coming up.
    await tone.start()

    const volume = new tone.Volume(-12).toDestination()
    const reverb = new tone.Reverb({ decay: 2.5, wet: 0.3 }).connect(volume)
    const distortion = new tone.Distortion({
        distortion: 0.8,
        wet: 1,
    }).connect(volume)

    // Voicings are upstream's, unchanged.
    const synths = {
        success: new tone.PolySynth(tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: {
                attack: 0.02,
                decay: 0.3,
                sustain: 0.1,
                release: 1.2,
            },
        }).connect(reverb),
        running: new tone.PolySynth(tone.Synth, {
            oscillator: { type: "sine" },
            envelope: {
                attack: 0.002,
                decay: 0.08,
                sustain: 0,
                release: 0.1,
            },
        }).connect(reverb),
        bass: new tone.PolySynth(tone.Synth, {
            oscillator: { type: "sawtooth" },
            envelope: {
                attack: 0.02,
                decay: 0.4,
                sustain: 0.1,
                release: 0.8,
            },
        }).connect(reverb),
        interrupt: new tone.PolySynth(tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: {
                attack: 0.001,
                decay: 0.08,
                sustain: 0,
                release: 0.04,
            },
        }).connect(reverb),
        reset: new tone.PolySynth(tone.Synth, {
            oscillator: { type: "sine" },
            envelope: {
                attack: 0.004,
                decay: 0.18,
                sustain: 0,
                release: 0.12,
            },
        }).connect(reverb),
        death: new tone.PolySynth(tone.Synth, {
            oscillator: { type: "fatsawtooth" },
            envelope: {
                attack: 0.01,
                decay: 0.5,
                sustain: 0.3,
                release: 1.5,
            },
        }).connect(distortion),
        config: new tone.PolySynth(tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: {
                attack: 0.001,
                decay: 0.05,
                sustain: 0,
                release: 0.05,
            },
        }).connect(reverb),
        ref_update: new tone.PolySynth(tone.Synth, {
            oscillator: { type: "sine" },
            envelope: {
                attack: 0.001,
                decay: 0.04,
                sustain: 0,
                release: 0.04,
            },
        }).connect(reverb),
        finalizer: new tone.PolySynth(tone.Synth, {
            oscillator: { type: "square" },
            envelope: {
                attack: 0.005,
                decay: 0.12,
                sustain: 0.05,
                release: 0.25,
            },
        }).connect(reverb),
        notification: new tone.PolySynth(tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: {
                attack: 0.005,
                decay: 0.25,
                sustain: 0.1,
                release: 0.4,
            },
        }).connect(reverb),
    }

    return {
        tone,
        synths,
        volume,
        nodes: [...Object.values(synths), reverb, distortion, volume],
        walk: initial_walk,
        suppress_failure_until: 0,
        suppress_interrupt_until: 0,
    }
}

export const dispose_sound_system = (system: SoundSystem): void => {
    for (const node of system.nodes) {
        node.dispose()
    }
}

const at = (system: SoundSystem): number => system.tone.now()

// --- the cues, one function each, as upstream has ------------------------

export const play_running = (system: SoundSystem, now: number): void => {
    system.synths["running"]?.triggerAttackRelease(
        next_note(system, 0.5, now),
        "32n",
        undefined,
        0.25
    )
}

// Upstream cycles a triad inside the chord window so overlapping successes stay
// consonant, and sits an octave above the walk for brightness.
export const play_success = (system: SoundSystem, now: number): void => {
    const advanced = advance_walk(system.walk, 1, now)

    system.walk = advanced.walk

    const root = `${
        PENTATONIC_SCALE[advanced.walk.chord_base_index] ?? "C"
    }${(BASE_OCTAVE + 1).toString()}`
    const triad = [0, 4, 7]
    // `chord_step` has already advanced, so the first voice of a chord is the
    // root, as upstream's is.
    const semitones = triad[(advanced.walk.chord_step - 1) % triad.length] ?? 0

    system.synths["success"]?.triggerAttackRelease(
        system.tone.Frequency(root).transpose(semitones).toNote(),
        "4n"
    )
}

export const play_failure = (system: SoundSystem, now: number): void => {
    if (now < system.suppress_failure_until) {
        return
    }

    system.suppress_failure_until = now + REPEAT_SUPPRESSION_MILLIS

    const name = `${
        PENTATONIC_SCALE[system.walk.note_index % PENTATONIC_SCALE.length] ??
        "C"
    }${(BASE_OCTAVE - 1).toString()}`

    system.walk = {
        ...system.walk,
        note_index: (system.walk.note_index + 1) % PENTATONIC_SCALE.length,
    }
    system.synths["bass"]?.triggerAttackRelease(name, "4n", at(system), 0.65)
}

// Two rapid ascending beeps.
export const play_interrupted = (system: SoundSystem, now: number): void => {
    if (now < system.suppress_interrupt_until) {
        return
    }

    system.suppress_interrupt_until = now + REPEAT_SUPPRESSION_MILLIS

    const started = at(system)

    system.synths["interrupt"]?.triggerAttackRelease("C5", "32n", started, 0.6)
    system.synths["interrupt"]?.triggerAttackRelease(
        "E5",
        "32n",
        started + 0.07,
        0.6
    )
}

// A descending two-note cue, G to C.
export const play_reset = (system: SoundSystem): void => {
    const started = at(system)

    system.synths["reset"]?.triggerAttackRelease(
        `G${BASE_OCTAVE.toString()}`,
        "16n",
        started,
        0.6
    )
    system.synths["reset"]?.triggerAttackRelease(
        `C${BASE_OCTAVE.toString()}`,
        "16n",
        started + 0.1,
        0.6
    )
}

// A short distorted stab, then a low rumble underneath it.
export const play_death = (system: SoundSystem): void => {
    const started = at(system)

    system.synths["death"]?.triggerAttackRelease(
        `D#${BASE_OCTAVE.toString()}`,
        "32n",
        started,
        0.45
    )
    system.synths["death"]?.triggerAttackRelease(
        `C${(BASE_OCTAVE - 2).toString()}`,
        "1n",
        started + 0.1,
        0.55
    )
}

export const play_configuration_change = (system: SoundSystem): void => {
    system.synths["config"]?.triggerAttackRelease("G5", "16n", undefined, 0.6)
}

export const play_ref_update = (system: SoundSystem): void => {
    system.synths["ref_update"]?.triggerAttackRelease(
        "E6",
        "64n",
        undefined,
        0.35
    )
}

export const play_finalizer_created = (
    system: SoundSystem,
    now: number
): void => {
    system.synths["finalizer"]?.triggerAttackRelease(
        next_note(system, 0, now),
        "32n",
        undefined,
        0.25
    )
}

export const play_finalizer_running = (
    system: SoundSystem,
    now: number
): void => {
    system.synths["finalizer"]?.triggerAttackRelease(
        next_note(system, 0.5, now),
        "16n",
        undefined,
        0.3
    )
}

export const play_finalizer_completed = (
    system: SoundSystem,
    now: number
): void => {
    system.synths["finalizer"]?.triggerAttackRelease(
        next_note(system, 1, now),
        "8n",
        undefined,
        0.35
    )
}

export const play_notification = (system: SoundSystem): void => {
    const started = at(system)

    system.synths["notification"]?.triggerAttackRelease(
        "C5",
        "16n",
        started,
        0.4
    )
    system.synths["notification"]?.triggerAttackRelease(
        "E5",
        "16n",
        started + 0.12,
        0.4
    )
}

export const stop_all = (system: SoundSystem): void => {
    for (const synth of Object.values(system.synths)) {
        synth.releaseAll()
    }
}

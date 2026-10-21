const NOTE_SECONDS = 0.32

// An AudioContext is a live browser handle, so it cannot live in the Model, and
// it cannot be built on import either: there is no AudioContext while the page
// is being prerendered. It is created on the first note and kept here after.
const audio_handle: { context: AudioContext | undefined } = {
    context: undefined,
}

export const play_note = (frequency: number): void => {
    try {
        const audio_context = audio_handle.context ?? new AudioContext()
        audio_handle.context = audio_context

        if (audio_context.state === "suspended") {
            void audio_context.resume()
        }

        const oscillator = audio_context.createOscillator()
        const gain = audio_context.createGain()
        const start = audio_context.currentTime

        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(frequency, start)
        gain.gain.setValueAtTime(0.16, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + NOTE_SECONDS)

        oscillator.connect(gain)
        gain.connect(audio_context.destination)
        oscillator.start(start)
        oscillator.stop(start + NOTE_SECONDS)
    } catch {
        // The fold still runs in browsers that do not expose Web Audio.
    }
}

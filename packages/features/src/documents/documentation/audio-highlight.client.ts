const mounted = new WeakSet<HTMLElement>()

const numeric_data = (
    element: HTMLElement,
    name: "rangeStart" | "rangeEnd" | "frequency"
): number => {
    const value = Number(element.dataset[name] ?? "0")
    return Number.isFinite(value) ? value : 0
}

const frequency_for_button = (button: HTMLElement): number => {
    const value = Number(button.dataset.audioFrequency ?? "440")
    return Number.isFinite(value) ? value : 440
}

const highlight_lines = (element: HTMLElement): void => {
    const start = numeric_data(element, "rangeStart")
    const end = numeric_data(element, "rangeEnd")

    element.querySelectorAll<HTMLElement>(".line").forEach((line, index) => {
        const line_number = index + 1
        line.classList.toggle(
            "documentation-audio-highlight-active-line",
            line_number >= start && line_number <= end
        )
    })
}

const audio_contexts = new WeakMap<HTMLElement, AudioContext>()

const play_frequency = (element: HTMLElement, frequency: number): void => {
    try {
        const container =
            element.closest<HTMLElement>(".documentation-audio-highlight") ??
            element
        const audio_context =
            audio_contexts.get(container) ?? new AudioContext()
        audio_contexts.set(container, audio_context)

        const oscillator = audio_context.createOscillator()
        const gain = audio_context.createGain()
        const start = audio_context.currentTime

        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(frequency, start)
        gain.gain.setValueAtTime(0.18, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4)
        oscillator.connect(gain)
        gain.connect(audio_context.destination)
        oscillator.start(start)
        oscillator.stop(start + 0.4)
    } catch {
        // The visual walkthrough remains usable when Web Audio is unavailable.
    }
}

const mount = (element: HTMLElement): void => {
    if (mounted.has(element)) {
        return
    }

    mounted.add(element)
    highlight_lines(element)
}

const mount_within = (root: ParentNode): void => {
    root.querySelectorAll<HTMLElement>("[data-audio-highlight]").forEach(mount)
}

const observer = new MutationObserver((records) => {
    for (const record of records) {
        if (
            record.type === "attributes" &&
            record.target instanceof HTMLElement &&
            record.attributeName === "data-step-index"
        ) {
            highlight_lines(record.target)
            play_frequency(
                record.target,
                numeric_data(record.target, "frequency")
            )
        }

        for (const node of record.addedNodes) {
            if (node instanceof HTMLElement) {
                if (node.matches("[data-audio-highlight]")) {
                    mount(node)
                }
                mount_within(node)
            }
        }
    }
})

document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
        return
    }

    const button = event.target.closest<HTMLElement>("[data-audio-active]")
    if (button !== null) {
        play_frequency(button, frequency_for_button(button))
    }
})

mount_within(document)
observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-step-index"],
    childList: true,
    subtree: true,
})

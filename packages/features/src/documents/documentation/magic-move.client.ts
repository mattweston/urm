import "@shikijs/magic-move/style.css"

import { parseStepTokens } from "./magic-move-tokens.client.ts"

type MountedAnimation = Readonly<{
    commit: (index: number) => void
}>

const mounted = new WeakMap<HTMLElement, MountedAnimation>()
const mounting = new WeakSet<HTMLElement>()

const step_index = (element: HTMLElement): number => {
    const value = Number.parseInt(element.dataset.stepIndex ?? "0", 10)
    return Number.isNaN(value) ? 0 : value
}

const mount = async (element: HTMLElement): Promise<void> => {
    if (mounted.has(element) || mounting.has(element)) {
        return
    }

    mounting.add(element)
    const [{ MagicMoveRenderer }, { createPrecomputedMachine }] =
        await Promise.all([
            import("@shikijs/magic-move/renderer"),
            import("./magic-move-machine.client.ts"),
        ])
    const tokens = parseStepTokens(element.dataset.stepTokens)
    if (tokens.length < 2) {
        mounting.delete(element)
        return
    }

    const machine = createPrecomputedMachine(tokens)
    const reduce_motion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches
    const renderer = new MagicMoveRenderer(element, {
        duration: reduce_motion ? 0 : 500,
        animateContainer: !reduce_motion,
        containerStyle: false,
    })
    renderer.replace(machine.commit(step_index(element)))

    mounted.set(element, {
        commit: (index) => {
            renderer.render(machine.commit(index)).catch((error: unknown) => {
                console.error(
                    "[documentation-magic-move] animation failed",
                    error
                )
            })
        },
    })
    mounting.delete(element)
}

const mount_safely = (element: HTMLElement): void => {
    void mount(element).catch((error: unknown) => {
        mounting.delete(element)
        console.error("[documentation-magic-move] could not load", error)
    })
}

const mount_within = (root: ParentNode): void => {
    root.querySelectorAll<HTMLElement>("[data-magic-move]").forEach(mount_safely)
}

const observer = new MutationObserver((records) => {
    for (const record of records) {
        if (
            record.type === "attributes" &&
            record.target instanceof HTMLElement &&
            record.attributeName === "data-step-index"
        ) {
            mounted
                .get(record.target)
                ?.commit(step_index(record.target))
        }

        for (const node of record.addedNodes) {
            if (node instanceof HTMLElement) {
                if (node.matches("[data-magic-move]")) {
                    mount_safely(node)
                }
                mount_within(node)
            }
        }
    }
})

mount_within(document)
observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-step-index"],
    childList: true,
    subtree: true,
})

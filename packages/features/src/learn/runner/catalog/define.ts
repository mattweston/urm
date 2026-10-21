import type { Example, ExampleKey, TimedNotification } from "../catalog.ts"
import {
    normalize_selector_input,
    resolve_example_code_snippet,
    snippet_result_target_key,
    to_step_snippet_target_key,
    type HighlightSelector,
} from "../snippet-highlights.ts"

// The step's own slice of the snippet, keyed by its index in `labels`. Hovering
// a node moves the highlight box onto the code that produced it, which is what
// makes a four-node concurrent run readable.
export const step_target_key = (index: number): string =>
    to_step_snippet_target_key(index.toString())

// The result highlight names a slice of the snippet by its text, and resolves
// to character offsets here, at module load — a selector that no longer matches
// throws on import rather than silently drawing the box in the wrong place.
export const define = (input: {
    readonly key: ExampleKey
    readonly title: string
    readonly subtitle?: string
    readonly description: string
    readonly source: string
    readonly result_highlight: HighlightSelector
    // Index-aligned with the example's step labels.
    readonly step_highlights?: ReadonlyArray<HighlightSelector>
    readonly notifications?: ReadonlyArray<TimedNotification>
}): Example =>
    ({
        key: input.key,
        title: input.title,
        ...(input.subtitle === undefined ? {} : { subtitle: input.subtitle }),
        description: input.description,
        notifications: input.notifications ?? [],
        code: resolve_example_code_snippet({
            code: { language: "typescript", source: input.source },
            selectors_by_target: {
                [snippet_result_target_key]: normalize_selector_input(
                    input.result_highlight,
                    {
                        example_label: input.title,
                        target_key: snippet_result_target_key,
                    }
                ),
                ...Object.fromEntries(
                    (input.step_highlights ?? []).map((selector, index) => [
                        step_target_key(index),
                        normalize_selector_input(selector, {
                            example_label: input.title,
                            target_key: step_target_key(index),
                        }),
                    ])
                ),
            },
            example_label: input.title,
        }),
    })

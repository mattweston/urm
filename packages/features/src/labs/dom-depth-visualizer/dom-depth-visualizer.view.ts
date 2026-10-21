import type { Html, HtmlBuilder } from "foldkit/html"
import { ClickedToggle, type Message } from "./dom-depth-visualizer.message.ts"
import type { Model } from "./dom-depth-visualizer.model.ts"

const buttonClassName =
    "inline-flex items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer [box-shadow:var(--shadow-control)]"

export const DOM_DEPTH_VISUALIZER_STYLES = `
:root {
    --dom-depth-1: color-mix(in oklch, var(--chart-1) 86%, var(--background));
    --dom-depth-2: color-mix(in oklch, var(--chart-2) 85%, var(--background));
    --dom-depth-3: color-mix(in oklch, var(--chart-3) 84%, var(--background));
    --dom-depth-4: color-mix(in oklch, var(--chart-4) 83%, var(--background));
    --dom-depth-5: color-mix(in oklch, var(--chart-5) 82%, var(--background));
    --dom-depth-6: color-mix(in oklch, var(--destructive) 80%, var(--background));
    --dom-depth-7: color-mix(in oklch, var(--chart-2) 79%, var(--background));
    --dom-depth-8: color-mix(in oklch, var(--chart-3) 78%, var(--background));
    --dom-depth-9: color-mix(in oklch, var(--chart-4) 77%, var(--background));
    --dom-depth-10: color-mix(in oklch, var(--chart-5) 76%, var(--background));
    --dom-depth-11: color-mix(in oklch, var(--chart-1) 74%, var(--background));
    --dom-depth-12: color-mix(in oklch, var(--destructive) 73%, var(--background));
    --dom-depth-13: color-mix(in oklch, var(--chart-3) 72%, var(--background));
    --dom-depth-14: color-mix(in oklch, var(--chart-4) 71%, var(--background));
    --dom-depth-15: color-mix(in oklch, var(--chart-5) 70%, var(--background));
    --dom-depth-16: color-mix(in oklch, var(--chart-1) 68%, var(--background));
    --dom-depth-17: color-mix(in oklch, var(--chart-5) 66%, var(--background));
    --dom-depth-18: color-mix(in oklch, var(--destructive) 64%, var(--background));
}

* {
    outline: 2px dotted var(--dom-depth-1);
}

* * {
    outline: 2px dotted var(--dom-depth-2);
}

* * * {
    outline: 2px dotted var(--dom-depth-3);
}

* * * * {
    outline: 2px dotted var(--dom-depth-4);
}

* * * * * {
    outline: 2px dotted var(--dom-depth-5);
}

* * * * * * {
    outline: 2px dotted var(--dom-depth-6);
}

* * * * * * * {
    outline: 2px dashed var(--dom-depth-7);
}

* * * * * * * * {
    outline: 2px dashed var(--dom-depth-8);
}

* * * * * * * * * {
    outline: 2px dashed var(--dom-depth-9);
}

* * * * * * * * * * {
    outline: 2px dashed var(--dom-depth-10);
}

* * * * * * * * * * * {
    outline: 2px dashed var(--dom-depth-11);
}

* * * * * * * * * * * * {
    outline: 2px dashed var(--dom-depth-12);
}

* * * * * * * * * * * * * {
    outline: 2px solid var(--dom-depth-13);
}

* * * * * * * * * * * * * * {
    outline: 2px solid var(--dom-depth-14);
}

* * * * * * * * * * * * * * * {
    outline: 2px solid var(--dom-depth-15);
}

* * * * * * * * * * * * * * * * {
    outline: 2px solid var(--dom-depth-16);
}

* * * * * * * * * * * * * * * * * {
    outline: 2px solid var(--dom-depth-17);
}

* * * * * * * * * * * * * * * * * * {
    outline: 3px solid var(--dom-depth-18);
}

button.dom-depth-visualizer-toggle {
    outline: none;
}
`

// NOTE: the Design application injected DOM_DEPTH_VISUALIZER_STYLES from its own
// shell. Here the demo carries its own style element, so the outlines work
// wherever it is rendered.
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                "flex min-h-screen items-center justify-center bg-background p-4 text-foreground"
            ),
        ],
        [
            h.style([], [model.isActive ? DOM_DEPTH_VISUALIZER_STYLES : ""]),
            h.div(
                [
                    h.Class(
                        "flex w-full max-w-2xl flex-col items-center gap-6 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-8 text-center text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                [
                    h.div(
                        [h.Class("space-y-2")],
                        [
                            h.h1(
                                [
                                    h.Class(
                                        "text-3xl font-bold tracking-tight text-foreground"
                                    ),
                                ],
                                ["DOM Depth Visualizer"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "Toggle the outline stack to inspect DOM nesting depth.",
                                ]
                            ),
                        ]
                    ),
                    h.button(
                        [
                            h.OnClick(toParentMessage(ClickedToggle())),
                            h.Class(
                                `${buttonClassName} dom-depth-visualizer-toggle`
                            ),
                        ],
                        [model.isActive ? "Turn Off" : "Visualize DOM"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            model.isActive
                                ? "State is saved in localStorage."
                                : "Toggle state is persisted in localStorage.",
                        ]
                    ),
                ]
            ),
        ]
    )
}

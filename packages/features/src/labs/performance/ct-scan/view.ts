import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"

import { ClickedToggle, type Message } from "./message.ts"
import type { Model } from "./model.ts"
import { MountCtScan } from "./mount.ts"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
        [h.Class("mx-auto w-full max-w-4xl space-y-8 px-6 py-10")],
        [
            h.header(
                [h.Class("max-w-2xl space-y-3")],
                [
                    h.h1(
                        [h.Class("text-3xl font-bold tracking-tight")],
                        ["CT Scan"]
                    ),
                    h.p(
                        [h.Class("text-muted-foreground")],
                        [
                            "Inspect the document head for ordering mistakes and render-blocking resources. The scan temporarily exposes and annotates head elements using CSS Wizardry's CT stylesheet.",
                        ]
                    ),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6 [box-shadow:var(--shadow-card)]"
                    ),
                    h.AriaLabelledBy("ct-scan-demo-heading"),
                ],
                [
                    h.h2(
                        [
                            h.Id("ct-scan-demo-heading"),
                            h.Class("text-lg font-semibold"),
                        ],
                        ["Head scan"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mt-2 max-w-2xl text-sm text-muted-foreground"
                            ),
                        ],
                        [
                            model.is_active
                                ? "The diagnostic stylesheet is active. Review the annotated document head above, then stop the scan to restore the page."
                                : "Run the scan to load the diagnostic stylesheet. It is removed when you stop the scan or leave this page.",
                        ]
                    ),
                    h.button(
                        [
                            h.OnClick(toParentMessage(ClickedToggle())),
                            h.AriaPressed(String(model.is_active)),
                            h.Class(
                                model.is_active
                                    ? "mt-5 min-h-11 rounded-[var(--radius-control)] border-(length:--control-border-width) border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground [box-shadow:var(--shadow-control)] hover:bg-secondary/80"
                                    : "mt-5 min-h-11 rounded-[var(--radius-control)] border-(length:--control-border-width) border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground [box-shadow:var(--shadow-primary)] hover:bg-primary/90"
                            ),
                        ],
                        [model.is_active ? "Stop scan" : "Run CT scan"]
                    ),
                    ...(model.is_active
                        ? [
                              h.span(
                                  [
                                      h.OnMount(
                                          Mount.mapMessage(
                                              MountCtScan(),
                                              toParentMessage
                                          )
                                      ),
                                      h.Class("hidden"),
                                      h.AriaHidden(true),
                                  ],
                                  []
                              ),
                          ]
                        : []),
                ]
            ),
        ]
    )

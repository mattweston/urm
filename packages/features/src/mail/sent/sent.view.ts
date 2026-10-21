import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"

import type { Message } from "./sent.message.ts"
import type { Model, SentDelivery } from "./sent.model.ts"

const date_formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
})

const status_label = (status: SentDelivery["status"]): string =>
    status.charAt(0).toUpperCase() + status.slice(1)

const status_class = (status: SentDelivery["status"]): string => {
    switch (status) {
        case "delivered":
        case "sent":
            return "border-success/30 bg-success/10 text-success"
        case "accepted":
        case "queued":
        case "pending":
            return "border-border bg-muted text-muted-foreground"
        case "bounced":
        case "complained":
        case "failed":
            return "border-destructive/30 bg-destructive/10 text-destructive"
        case "skipped":
            return "border-warning/30 bg-warning/10 text-warning"
    }
}

const recipient_view = (
    model: Model,
    delivery: SentDelivery,
    h: HtmlBuilder<Message>
): Html => {
    const contact = model.contacts.find(({ id }) => id === delivery.contactId)

    return h.div(
        [h.Class("min-w-44")],
        contact === undefined
            ? [
                  h.div([h.Class("font-medium")], ["Recipient unavailable"]),
                  h.div(
                      [h.Class("mt-1 text-xs text-muted-foreground")],
                      [
                          delivery.recipientDomain === null
                              ? "Stored as a privacy-safe hash"
                              : `Address at ${delivery.recipientDomain}`,
                      ]
                  ),
              ]
            : [
                  h.div([h.Class("font-medium")], [contact.name]),
                  h.div(
                      [
                          h.Class(
                              "mt-1 max-w-64 truncate text-xs text-muted-foreground"
                          ),
                      ],
                      [contact.email]
                  ),
              ]
    )
}

const sent_view = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("mx-auto grid w-full max-w-6xl gap-6")],
        [
            h.header(
                [h.Class("space-y-2")],
                [
                    h.p(
                        [
                            h.Class(
                                "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                            ),
                        ],
                        ["Transactional mail"]
                    ),
                    h.h1(
                        [h.Class("text-3xl font-semibold tracking-tight")],
                        ["Sent"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-sm text-muted-foreground")],
                        [
                            "Recent transactional deliveries and their latest provider status. Sent does not necessarily mean delivered to the inbox.",
                        ]
                    ),
                ]
            ),
            model.error !== null
                ? h.p(
                      [
                          h.Role("alert"),
                          h.Class(
                              "rounded-[var(--radius-control)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                          ),
                      ],
                      [model.error]
                  )
                : model.loading
                  ? h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        ["Loading delivery history…"]
                    )
                  : model.deliveries.length === 0
                    ? h.section(
                          [
                              h.Class(
                                  "rounded-[var(--radius-surface)] border border-dashed border-border bg-card p-8 text-center"
                              ),
                          ],
                          [
                              h.h2(
                                  [h.Class("text-lg font-semibold")],
                                  ["No transactional deliveries yet"]
                              ),
                              h.p(
                                  [
                                      h.Class(
                                          "mx-auto mt-2 max-w-md text-sm text-muted-foreground"
                                      ),
                                  ],
                                  [
                                      "Messages sent from Mail → Send will appear here with their provider status.",
                                  ]
                              ),
                          ]
                      )
                    : h.div(
                          [
                              h.Class(
                                  "overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card [box-shadow:var(--shadow-surface)]"
                              ),
                          ],
                          [
                              h.table(
                                  [h.Class("w-full min-w-[48rem] text-sm")],
                                  [
                                      h.caption(
                                          [h.Class("sr-only")],
                                          ["Recent transactional deliveries"]
                                      ),
                                      h.thead(
                                          [
                                              h.Class(
                                                  "bg-muted/50 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground"
                                              ),
                                          ],
                                          [
                                              h.tr(
                                                  [],
                                                  [
                                                      "Recipient",
                                                      "Subject",
                                                      "Status",
                                                      "Time",
                                                  ].map((label) =>
                                                      h.th(
                                                          [
                                                              h.Scope("col"),
                                                              h.Class(
                                                                  "px-4 py-3 font-semibold"
                                                              ),
                                                          ],
                                                          [label]
                                                      )
                                                  )
                                              ),
                                          ]
                                      ),
                                      h.tbody(
                                          [],
                                          model.deliveries.map((delivery) =>
                                              h.keyed("tr")(
                                                  delivery.id,
                                                  [
                                                      h.Class(
                                                          "border-t border-border align-top"
                                                      ),
                                                  ],
                                                  [
                                                      h.td(
                                                          [
                                                              h.Class(
                                                                  "px-4 py-4"
                                                              ),
                                                          ],
                                                          [
                                                              recipient_view(
                                                                  model,
                                                                  delivery,
                                                                  h
                                                              ),
                                                          ]
                                                      ),
                                                      h.th(
                                                          [
                                                              h.Scope("row"),
                                                              h.Class(
                                                                  "max-w-sm px-4 py-4 text-left font-medium"
                                                              ),
                                                          ],
                                                          [
                                                              delivery.subject,
                                                              ...(delivery.isTest
                                                                  ? [
                                                                        h.span(
                                                                            [
                                                                                h.Class(
                                                                                    "ml-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.6875rem] font-medium text-primary"
                                                                                ),
                                                                            ],
                                                                            [
                                                                                "Test",
                                                                            ]
                                                                        ),
                                                                    ]
                                                                  : []),
                                                          ]
                                                      ),
                                                      h.td(
                                                          [
                                                              h.Class(
                                                                  "px-4 py-4"
                                                              ),
                                                          ],
                                                          [
                                                              h.span(
                                                                  [
                                                                      h.Class(
                                                                          `inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${status_class(delivery.status)}`
                                                                      ),
                                                                  ],
                                                                  [
                                                                      status_label(
                                                                          delivery.status
                                                                      ),
                                                                  ]
                                                              ),
                                                              ...(delivery.errorMessage ===
                                                              null
                                                                  ? []
                                                                  : [
                                                                        h.p(
                                                                            [
                                                                                h.Class(
                                                                                    "mt-2 max-w-xs text-xs text-destructive"
                                                                                ),
                                                                            ],
                                                                            [
                                                                                delivery.errorMessage,
                                                                            ]
                                                                        ),
                                                                    ]),
                                                          ]
                                                      ),
                                                      h.td(
                                                          [
                                                              h.Class(
                                                                  "whitespace-nowrap px-4 py-4 text-muted-foreground"
                                                              ),
                                                          ],
                                                          [
                                                              h.time(
                                                                  [],
                                                                  [
                                                                      date_formatter.format(
                                                                          new Date(
                                                                              delivery.sentAt ??
                                                                                  delivery.createdAt
                                                                          )
                                                                      ),
                                                                  ]
                                                              ),
                                                          ]
                                                      ),
                                                  ]
                                              )
                                          )
                                      ),
                                  ]
                              ),
                          ]
                      ),
        ]
    )

export const view = Submodel.defineView<Model, Message>(sent_view)

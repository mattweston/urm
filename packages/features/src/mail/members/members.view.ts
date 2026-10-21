import { type Html, type HtmlBuilder } from "foldkit/html"
import * as Foldkit from "foldkit"
import { toImageSrc } from "@urm/utils/media"

import type { Model } from "./members.model.ts"
import type { Message } from "./members.message.ts"
import { manageMembersHref } from "../platform/route.ts"
const fullName = (first: string, last: string) => `${first} ${last}`.trim()

const avatarSrc = (first: string, last: string, avatar: string) =>
    avatar.length > 0
        ? toImageSrc(avatar)
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName(first, last) || "Unknown Member")}&size=128&background=c8c8c8&color=ffffff`

const memberCard = (
    member: Model["members"][number],
    h: HtmlBuilder<Message>
): Html =>
    h.article(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 text-card-foreground [box-shadow:var(--shadow-surface)] transition hover:[box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center gap-4")],
                [
                    h.div(
                        [
                            h.Class(
                                "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#c8c8c8]"
                            ),
                        ],
                        [
                            h.img([
                                h.Src(
                                    avatarSrc(
                                        member.first,
                                        member.last,
                                        member.avatar
                                    )
                                ),
                                h.Alt(
                                    `${fullName(member.first, member.last) || "Unknown Member"} avatar`
                                ),
                                h.Class("size-full object-cover"),
                            ]),
                        ]
                    ),
                    h.div(
                        [h.Class("min-w-0 flex-1")],
                        [
                            fullName(member.first, member.last)
                                ? h.div(
                                      [
                                          h.Class(
                                              "truncate text-lg font-semibold text-foreground"
                                          ),
                                      ],
                                      [fullName(member.first, member.last)]
                                  )
                                : h.i(
                                      [
                                          h.Class(
                                              "text-lg text-muted-foreground"
                                          ),
                                      ],
                                      ["No Name"]
                                  ),
                            member.twitter
                                ? h.p(
                                      [
                                          h.Class(
                                              "text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [`@${member.twitter}`]
                                  )
                                : h.empty,
                        ]
                    ),
                ]
            ),
        ]
    )

export const view = Foldkit.Submodel.defineView<Model, Message>(
    (model, h: HtmlBuilder<Message>): Html => {
        return h.div(
            [
                h.Class(
                    "h-full min-h-0 overflow-auto bg-background text-foreground"
                ),
            ],
            [
                h.main(
                    [
                        h.Class(
                            "mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-8"
                        ),
                    ],
                    [
                        h.div(
                            [h.Class("flex flex-col gap-2")],
                            [
                                h.div(
                                    [
                                        h.Class(
                                            "flex flex-wrap items-end justify-between gap-3"
                                        ),
                                    ],
                                    [
                                        h.div(
                                            [h.Class("space-y-2")],
                                            [
                                                h.h1(
                                                    [
                                                        h.Class(
                                                            "text-3xl font-bold tracking-tight"
                                                        ),
                                                    ],
                                                    ["Members Directory"]
                                                ),
                                                h.p(
                                                    [
                                                        h.Class(
                                                            "text-sm text-muted-foreground"
                                                        ),
                                                    ],
                                                    [
                                                        "Browse members with avatars, names, and social handles.",
                                                    ]
                                                ),
                                            ]
                                        ),
                                        h.a(
                                            [
                                                h.Href(manageMembersHref()),
                                                h.Class(
                                                    "inline-flex h-10 items-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"
                                                ),
                                            ],
                                            ["Open member list"]
                                        ),
                                    ]
                                ),
                            ]
                        ),
                        ...(model.error === null
                            ? []
                            : [
                                  h.div(
                                      [
                                          h.Class(
                                              "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                                          ),
                                      ],
                                      [model.error]
                                  ),
                              ]),
                        ...(model.loading
                            ? [
                                  h.div(
                                      [
                                          h.Class(
                                              "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-8 text-sm text-muted-foreground [box-shadow:var(--shadow-surface)]"
                                          ),
                                      ],
                                      ["Loading members..."]
                                  ),
                              ]
                            : model.members.length === 0
                              ? [
                                    h.div(
                                        [
                                            h.Class(
                                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-card p-10 text-center text-muted-foreground"
                                            ),
                                        ],
                                        ["No members found."]
                                    ),
                                ]
                              : [
                                    h.div(
                                        [
                                            h.Class(
                                                "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                                            ),
                                        ],
                                        model.members.map((member) =>
                                            memberCard(member, h)
                                        )
                                    ),
                                ]),
                    ]
                ),
            ]
        )
    }
)

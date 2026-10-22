import { Match } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    SelectedCharacterId,
    SubmittedCharacter,
    UpdatedCharacterId,
    type Message,
} from "./api-effect.message.ts"
import type { Character, Model } from "./model.ts"

const button_class =
    "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground transition hover:bg-accent [box-shadow:var(--shadow-control)]"

const character_view = <ParentMessage>(
    character: Character,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.article(
        [
            h.Class(
                "grid gap-5 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5 sm:grid-cols-[9rem_1fr]"
            ),
        ],
        [
            h.img([
                h.Src(character.image),
                h.Alt(`${character.name} from Rick and Morty`),
                h.Class(
                    "h-36 w-36 rounded-[var(--radius-surface)] object-cover"
                ),
            ]),
            h.div(
                [h.Class("space-y-3")],
                [
                    h.h2([h.Class("text-2xl font-semibold")], [character.name]),
                    h.dl(
                        [h.Class("grid grid-cols-2 gap-3 text-sm")],
                        [
                            h.div(
                                [],
                                [
                                    h.dt(
                                        [h.Class("text-muted-foreground")],
                                        ["Status"]
                                    ),
                                    h.dd([], [character.status]),
                                ]
                            ),
                            h.div(
                                [],
                                [
                                    h.dt(
                                        [h.Class("text-muted-foreground")],
                                        ["Species"]
                                    ),
                                    h.dd([], [character.species]),
                                ]
                            ),
                            h.div(
                                [],
                                [
                                    h.dt(
                                        [h.Class("text-muted-foreground")],
                                        ["Origin"]
                                    ),
                                    h.dd([], [character.origin_name]),
                                ]
                            ),
                            h.div(
                                [],
                                [
                                    h.dt(
                                        [h.Class("text-muted-foreground")],
                                        ["ID"]
                                    ),
                                    h.dd([], [character.id.toString()]),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const progress = Match.value(model.request).pipe(
        Match.withReturnType<Html>(),
        Match.tagsExhaustive({
            Idle: () =>
                h.p(
                    [h.Class("text-sm text-muted-foreground")],
                    ["Choose a character and make a request."]
                ),
            Loading: () =>
                h.p(
                    [h.Class("text-sm font-medium text-primary")],
                    ["Effect is waiting on RickAndMortyApi…"]
                ),
            Success: () => h.empty,
            ConnectionLost: () => h.empty,
            CharacterNotFound: () => h.empty,
            InvalidResponse: () => h.empty,
        })
    )

    const success_output = Match.value(model.request).pipe(
        Match.withReturnType<Html>(),
        Match.tagsExhaustive({
            Idle: () => h.empty,
            Loading: () => h.empty,
            Success: ({ character }) =>
                character_view<ParentMessage>(character, h),
            ConnectionLost: () => h.empty,
            CharacterNotFound: () => h.empty,
            InvalidResponse: () => h.empty,
        })
    )

    const error_output = Match.value(model.request).pipe(
        Match.withReturnType<Html>(),
        Match.tagsExhaustive({
            Idle: () =>
                h.p([h.Class("text-sm text-muted-foreground")], ["No Errors"]),
            Loading: () =>
                h.p([h.Class("text-sm text-muted-foreground")], ["No Errors"]),
            Success: () =>
                h.p([h.Class("text-sm text-muted-foreground")], ["No Errors"]),
            ConnectionLost: ({ message }) =>
                h.div(
                    [
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-warning/40 bg-warning/10 p-4 text-warning-foreground"
                        ),
                    ],
                    [message]
                ),
            CharacterNotFound: ({ message }) =>
                h.div(
                    [
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/40 bg-destructive/10 p-4 text-destructive"
                        ),
                    ],
                    [message]
                ),
            InvalidResponse: ({ message }) =>
                h.div(
                    [
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/40 bg-destructive/10 p-4 text-destructive"
                        ),
                    ],
                    [message]
                ),
        })
    )

    return h.main(
        [h.Class("flex w-full flex-col gap-6")],
        [
            h.header(
                [h.Class("space-y-2")],
                [
                    h.p(
                        [h.Class("text-sm font-medium text-primary")],
                        ["API Effect"]
                    ),
                    h.h1(
                        [h.Class("text-3xl font-bold tracking-tight")],
                        ["Rick and Morty character lookup"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-2xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "A single component that makes its input, external dependency, and typed success or error output visible.",
                        ]
                    ),
                ]
            ),
            h.form(
                [
                    h.Class(
                        "space-y-5 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5"
                    ),
                    h.OnSubmit(to_parent_message(SubmittedCharacter())),
                ],
                [
                    h.section(
                        [
                            h.Class(
                                "space-y-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                            ),
                        ],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                    ),
                                ],
                                ["Input"]
                            ),
                            h.label(
                                [h.Class("block space-y-2")],
                                [
                                    h.span(
                                        [h.Class("text-sm font-medium")],
                                        ["Character ID"]
                                    ),
                                    h.input([
                                        h.Value(model.character_id_input),
                                        h.OnInput((value) =>
                                            to_parent_message(
                                                UpdatedCharacterId({ value })
                                            )
                                        ),
                                        h.InputMode("numeric"),
                                        h.Class(
                                            "block w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 py-2"
                                        ),
                                    ]),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        "mr-1 self-center text-sm text-muted-foreground"
                                    ),
                                ],
                                ["Try:"]
                            ),
                            ...["1", "2", "3", "999999"].map((id) =>
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.OnClick(
                                            to_parent_message(
                                                SelectedCharacterId({
                                                    value: id,
                                                })
                                            )
                                        ),
                                        h.Class(button_class),
                                    ],
                                    [id]
                                )
                            ),
                        ]
                    ),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Disabled(model.request._tag === "Loading"),
                            h.Class(
                                "rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        [
                            model.request._tag === "Loading"
                                ? "Loading…"
                                : "Fetch character",
                        ]
                    ),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "space-y-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted/30 p-5"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Output"]),
                    progress,
                    h.div(
                        [h.Class("space-y-4")],
                        [
                            h.section(
                                [
                                    h.Class(
                                        "min-h-28 space-y-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-primary/40 bg-primary/5 p-4"
                                    ),
                                ],
                                [
                                    h.p(
                                        [
                                            h.Class(
                                                "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                            ),
                                        ],
                                        ["Dependencies"]
                                    ),
                                    h.p(
                                        [h.Class("font-medium")],
                                        ["RickAndMortyApi"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            "External API supplied to the Effect by its live layer. Each request has a random 35% simulated connection loss.",
                                        ]
                                    ),
                                ]
                            ),
                            h.section(
                                [
                                    h.Class(
                                        "min-h-28 space-y-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-success/40 bg-success/5 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "flex items-baseline justify-between gap-2"
                                            ),
                                        ],
                                        [
                                            h.h3(
                                                [
                                                    h.Class(
                                                        "font-medium text-success"
                                                    ),
                                                ],
                                                ["Success"]
                                            ),
                                            h.span(
                                                [
                                                    h.Class(
                                                        "text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                ["Character"]
                                            ),
                                        ]
                                    ),
                                    success_output,
                                ]
                            ),
                            h.section(
                                [
                                    h.Class(
                                        "min-h-28 space-y-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-destructive/40 bg-destructive/5 p-4"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "flex items-baseline justify-between gap-2"
                                            ),
                                        ],
                                        [
                                            h.h3(
                                                [
                                                    h.Class(
                                                        "font-medium text-destructive"
                                                    ),
                                                ],
                                                ["Errors"]
                                            ),
                                            h.span(
                                                [
                                                    h.Class(
                                                        "text-right text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    "ConnectionLost · CharacterNotFound · InvalidCharacterPayload",
                                                ]
                                            ),
                                        ]
                                    ),
                                    error_output,
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

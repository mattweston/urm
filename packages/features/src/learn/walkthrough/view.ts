import * as Ui from "@foldkit/ui"
import { Array, Match as M, Option } from "effect"
import { AsyncData, Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"

import { CircularCheckbox } from "@urm/ui/foldkit/circular-checkbox.view.ts"
import { NumberFlow } from "@urm/ui/foldkit/number-flow.view.ts"

import * as Audio from "./audio.ts"
// oxlint-disable-next-line import/default
import combining_source from "./examples/combining.ts?highlighted"
import * as Author from "./examples/combining.ts"
import * as Comments from "./examples/embedding.ts"
// oxlint-disable-next-line import/default
import composer_source from "./examples/composer.ts?highlighted"
import * as Composer from "./examples/composer.ts"
// oxlint-disable-next-line import/default
import counter_source from "./examples/counter.ts?highlighted"
import * as Counter from "./examples/counter.ts"
// oxlint-disable-next-line import/default
import on_change_source from "./examples/on-change.ts?highlighted"
import * as Dice from "./examples/on-change.ts"
// oxlint-disable-next-line import/default
import optimistic_update_source from "./examples/optimistic-update.ts?highlighted"
import * as Like from "./examples/optimistic-update.ts"
// oxlint-disable-next-line import/default
import combined_inputs_source from "./examples/combined-inputs.ts?highlighted"
import * as RepeatedText from "./examples/combined-inputs.ts"
// oxlint-disable-next-line import/default
import on_demand_source from "./examples/on-demand.ts?highlighted"
import * as Roll from "./examples/on-demand.ts"
// oxlint-disable-next-line import/default
import streaming_source from "./examples/streaming.ts?highlighted"
import * as Search from "./examples/streaming.ts"
import * as Timer from "./examples/timer.ts"
// oxlint-disable-next-line import/default
import items_source from "./examples/items.ts?highlighted"
import * as Todos from "./examples/items.ts"
// oxlint-disable-next-line import/default
import decoding_source from "./examples/decoding.ts?highlighted"
import * as Weather from "./examples/decoding.ts"
import type { Message } from "./message.ts"
import type { Model } from "./model.ts"
import { walkthrough_href } from "./route.ts"

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const action_class_name =
    "border-l-(length:--surface-border-width) border-border px-4 py-3 text-sm tracking-wide text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"

const action = (
    label: string,
    message: Message,
    is_disabled: boolean,
    h: HtmlBuilder<Message>
): Html =>
    Ui.Button.view(
        {
            onClick: message,
            isDisabled: is_disabled,
            toView: (attributes) =>
                h.button(
                    [...attributes.button, h.Class(action_class_name)],
                    [label]
                ),
        },
        h
    )

const action_row = (
    columns: 2 | 3,
    actions: ReadonlyArray<Html>,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                columns === 2
                    ? "grid grid-cols-2 border-t-(length:--surface-border-width) border-border"
                    : "grid grid-cols-3 border-t-(length:--surface-border-width) border-border"
            ),
        ],
        actions
    )

const badge = (text: string, h: HtmlBuilder<Message>): Html =>
    h.span([h.Class("text-xs tracking-wider text-muted-foreground")], [text])

// The badge the Effect Atom version of these examples prints as `WRITABLE`.
// Nothing here is writable in that sense — the panel is showing a field of the
// one Model, which only update ever replaces.
const model_field_badge = (h: HtmlBuilder<Message>): Html =>
    badge("✎ MODEL FIELD", h)

// A framed section with a small-caps heading and an optional status in the
// top-right corner. Every example is built out of these.
const panel = (
    config: Readonly<{ label: string; maybe_status: Option.Option<Html> }>,
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<Message>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "flex items-center justify-between border-b-(length:--surface-border-width) border-border px-5 py-3"
                    ),
                ],
                [
                    h.h3(
                        [
                            h.Class(
                                "text-xs font-semibold tracking-widest uppercase"
                            ),
                        ],
                        [config.label]
                    ),
                    Option.getOrElse(config.maybe_status, () => h.empty),
                ]
            ),
            ...children,
        ]
    )

// The spinner / tick / elapsed-time trio the async examples share. A running
// Command shows the spinner, the tick lingers for a moment after it lands, and
// the resting state shows how long the last one took.
const timing = (timer: Timer.Timer, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("flex items-center gap-2 text-xs tracking-wider")],
        [
            Timer.is_running(timer)
                ? h.span([
                      h.Class(
                          "size-3 animate-spin rounded-full border-2 border-border border-t-foreground"
                      ),
                      h.AriaLabel("Running"),
                  ])
                : Timer.just_completed(timer)
                  ? h.span([h.Class("text-success")], ["✓"])
                  : h.span(
                        [h.Class("tabular-nums text-muted-foreground")],
                        [`${Timer.elapsed_ms(timer)} ms`]
                    ),
        ]
    )

const note = (value: string, h: HtmlBuilder<Message>): Html =>
    h.div(
        [
            h.Class(
                "flex min-h-24 items-center justify-center p-5 text-center text-sm text-muted-foreground"
            ),
        ],
        [value]
    )

// The large centred value a panel exists to show.
const big_value = (text: string, h: HtmlBuilder<Message>): Html =>
    h.div(
        [
            h.Class(
                "flex min-h-30 items-center justify-center break-all px-5 text-center text-4xl"
            ),
        ],
        [text]
    )

// big_value for a number, with the digits animating between readings.
const numeric_value = (amount: number, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("flex min-h-30 items-center justify-center px-5 text-4xl")],
        [NumberFlow({ value: amount })]
    )

const counter_panel = (model: Counter.Model, h: HtmlBuilder<Message>): Html =>
    panel(
        { label: "Counter", maybe_status: Option.some(model_field_badge(h)) },
        [
            numeric_value(model.count, h),
            action_row(
                3,
                [
                    action(
                        "Decrease",
                        Counter.ClickedDecreaseCount(),
                        false,
                        h
                    ),
                    action("Reset", Counter.ClickedResetCount(), false, h),
                    action(
                        "Increase",
                        Counter.ClickedIncreaseCount(),
                        false,
                        h
                    ),
                ],
                h
            ),
        ],
        h
    )

const counter_view = (
    model: Counter.Model,
    is_derived: boolean,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            counter_panel(model, h),
            ...(is_derived
                ? [
                      panel(
                          { label: "Doubled", maybe_status: Option.none() },
                          [numeric_value(Counter.doubled(model), h)],
                          h
                      ),
                  ]
                : []),
        ]
    )

const combined_inputs_view = (
    model: RepeatedText.Model,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            Ui.Input.view(
                {
                    id: "foldkit-repeated-text",
                    value: model.text,
                    onInput: (value) =>
                        RepeatedText.UpdatedRepeatedText({ value }),
                    toView: (attributes) =>
                        h.section(
                            [h.Class(`${PANEL_CLASS} p-5`)],
                            [
                                h.label(
                                    [
                                        ...attributes.label,
                                        h.Class(
                                            "text-xs font-semibold tracking-widest uppercase"
                                        ),
                                    ],
                                    ["Text"]
                                ),
                                h.input([
                                    ...attributes.input,
                                    h.Class(
                                        "mt-3 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 text-4xl outline-none"
                                    ),
                                ]),
                            ]
                        ),
                },
                h
            ),
            panel(
                {
                    label: "Repeat count",
                    maybe_status: Option.some(model_field_badge(h)),
                },
                [
                    numeric_value(model.repeat_count, h),
                    action_row(
                        3,
                        [
                            action(
                                "Decrease",
                                RepeatedText.ClickedDecreaseRepeatCount(),
                                RepeatedText.isAtMinimum(model),
                                h
                            ),
                            action(
                                "Reset",
                                RepeatedText.ClickedResetRepeatCount(),
                                RepeatedText.isAtMinimum(model),
                                h
                            ),
                            action(
                                "Increase",
                                RepeatedText.ClickedIncreaseRepeatCount(),
                                RepeatedText.isAtMaximum(model),
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                { label: "Repeated", maybe_status: Option.none() },
                [
                    h.p(
                        [
                            h.Class(
                                "min-h-30 break-words px-5 py-6 text-2xl leading-relaxed"
                            ),
                        ],
                        [RepeatedText.repeated(model)]
                    ),
                ],
                h
            ),
        ]
    )

const DIE_PIPS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
    [[128, 128]],
    [
        [92, 92],
        [164, 164],
    ],
    [
        [92, 92],
        [128, 128],
        [164, 164],
    ],
    [
        [92, 92],
        [164, 92],
        [92, 164],
        [164, 164],
    ],
    [
        [92, 92],
        [164, 92],
        [128, 128],
        [92, 164],
        [164, 164],
    ],
    [
        [92, 84],
        [92, 128],
        [92, 172],
        [164, 84],
        [164, 128],
        [164, 172],
    ],
]

// The pips are punched out in the card colour rather than a fixed hex, so one
// die reads correctly under every theme.
const die_face = (roll: number, h: HtmlBuilder<Message>): Html =>
    h.svg(
        [
            h.Xmlns("http://www.w3.org/2000/svg"),
            h.Width("48"),
            h.Height("48"),
            h.Fill("currentColor"),
            h.ViewBox("0 0 256 256"),
            h.Class("text-foreground"),
        ],
        [
            h.rect([
                h.Attribute("x", "32"),
                h.Attribute("y", "32"),
                h.Width("192"),
                h.Height("192"),
                h.Rx("32"),
            ]),
            ...Array.map(DIE_PIPS[roll - 1] ?? [], ([cx, cy]) =>
                h.circle([
                    h.Cx(String(cx)),
                    h.Cy(String(cy)),
                    h.R("12"),
                    h.Fill("var(--card)"),
                ])
            ),
        ]
    )

const die_row = (
    rolls: ReadonlyArray<number>,
    is_refreshing: boolean,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                `flex min-h-30 flex-wrap items-center justify-center gap-3 px-5 py-8 transition-all${
                    is_refreshing ? " opacity-40 blur-[2px]" : ""
                }`
            ),
        ],
        Array.map(rolls, (roll) => die_face(roll, h))
    )

const rolls_panel = (
    idle_note: string,
    rolls: AsyncData.AsyncData<ReadonlyArray<number>, string>,
    timer: Timer.Timer,
    h: HtmlBuilder<Message>
): Html =>
    panel(
        { label: "Dice rolls", maybe_status: Option.some(timing(timer, h)) },
        [
            AsyncData.match(rolls, {
                onIdle: () => note(idle_note, h),
                onLoading: () => note("Rolling…", h),
                onRefreshing: (values) => die_row(values, true, h),
                onFailure: (error) => note(error, h),
                onStale: ({ data }) => die_row(data, true, h),
                onSuccess: (values) => die_row(values, false, h),
            }),
        ],
        h
    )

const total_panel = (
    total: AsyncData.AsyncData<number, string>,
    h: HtmlBuilder<Message>
): Html =>
    panel(
        { label: "Total", maybe_status: Option.none() },
        [
            AsyncData.matchData(total, {
                onEmpty: () => note("Waiting…", h),
                onFailure: (error) => note(error, h),
                onData: (sum) => numeric_value(sum, h),
            }),
        ],
        h
    )

const on_change_view = (model: Dice.Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                {
                    label: "Dice count",
                    maybe_status: Option.some(model_field_badge(h)),
                },
                [
                    numeric_value(model.dice_count, h),
                    action_row(
                        3,
                        [
                            action(
                                "Decrease",
                                Dice.ClickedDecreaseDice(),
                                Dice.is_at_min(model),
                                h
                            ),
                            action("Reset", Dice.ClickedResetDice(), false, h),
                            action(
                                "Increase",
                                Dice.ClickedIncreaseDice(),
                                Dice.is_at_max(model),
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            rolls_panel("Ready to roll", model.rolls, model.timer, h),
            total_panel(Dice.total(model), h),
        ]
    )

const weather_measure = (
    amount: string,
    label: string,
    has_border: boolean,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                has_border
                    ? "flex flex-col items-center justify-center gap-1 border-l-(length:--surface-border-width) border-border py-6"
                    : "flex flex-col items-center justify-center gap-1 py-6"
            ),
        ],
        [
            h.div([h.Class("text-4xl")], [amount]),
            h.div(
                [
                    h.Class(
                        "text-xs tracking-widest uppercase text-muted-foreground"
                    ),
                ],
                [label]
            ),
        ]
    )

const weather_reading = (
    reading: Weather.Reading,
    is_stale: boolean,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                is_stale
                    ? "grid min-h-30 grid-cols-2 opacity-50 transition-opacity"
                    : "grid min-h-30 grid-cols-2 transition-opacity"
            ),
        ],
        [
            weather_measure(
                `${reading.current.temperature_2m}°C`,
                "Temperature",
                false,
                h
            ),
            weather_measure(
                `${reading.current.relative_humidity_2m}%`,
                "Humidity",
                true,
                h
            ),
        ]
    )

const decoding_view = (model: Weather.Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                {
                    label: "City",
                    maybe_status: Option.some(model_field_badge(h)),
                },
                [
                    big_value(Weather.city_at(model.city_index).name, h),
                    h.div(
                        [
                            h.Class(
                                "grid grid-cols-2 border-t-(length:--surface-border-width) border-border sm:grid-cols-4"
                            ),
                        ],
                        Array.map(Weather.cities, (city, city_index) =>
                            action(
                                city.name,
                                Weather.SelectedCity({ city_index }),
                                city_index === model.city_index,
                                h
                            )
                        )
                    ),
                ],
                h
            ),
            panel(
                {
                    label: "Reading",
                    maybe_status: Option.some(timing(model.timer, h)),
                },
                [
                    AsyncData.match(model.weather, {
                        onIdle: () => note("Idle", h),
                        onLoading: () => note("Decoding response…", h),
                        onRefreshing: (reading) =>
                            weather_reading(reading, true, h),
                        onFailure: (error) => note(error, h),
                        onStale: ({ data }) => weather_reading(data, true, h),
                        onSuccess: (reading) =>
                            weather_reading(reading, false, h),
                    }),
                ],
                h
            ),
            // Only the stale branch has something extra to say: the reading
            // above it decoded, and the request after it did not.
            AsyncData.match(model.weather, {
                onIdle: () => h.empty,
                onLoading: () => h.empty,
                onRefreshing: () => h.empty,
                onFailure: () => h.empty,
                onSuccess: () => h.empty,
                onStale: ({ error }) =>
                    panel(
                        { label: "Stale", maybe_status: Option.none() },
                        [
                            h.p(
                                [h.Class("px-5 py-4 text-sm text-warning")],
                                [
                                    `${error} — the reading above is the last one that decoded.`,
                                ]
                            ),
                        ],
                        h
                    ),
            }),
        ]
    )

const on_demand_view = (model: Roll.Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                {
                    label: "Trigger",
                    maybe_status: Option.some(badge("▶ MESSAGE", h)),
                },
                [
                    h.div(
                        [h.Class("p-5")],
                        [
                            Ui.Button.view(
                                {
                                    onClick: Roll.ClickedRollDice(),
                                    isDisabled: Roll.is_rolling(model),
                                    toView: (attributes) =>
                                        h.button(
                                            [
                                                ...attributes.button,
                                                h.Class(
                                                    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-4 py-3 text-sm tracking-[0.25em] transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                                ),
                                            ],
                                            [
                                                Roll.is_rolling(model)
                                                    ? "ROLLING…"
                                                    : "ROLL DICE",
                                            ]
                                        ),
                                },
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            rolls_panel("Press roll", model.rolls, model.timer, h),
            total_panel(Roll.total(model), h),
        ]
    )

const author_measure = (
    count: string,
    suffix: string,
    class_name: string,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                `flex min-h-24 items-center justify-center px-5 text-3xl ${class_name}`
            ),
        ],
        [`${count} ${suffix}`]
    )

const author_panel = (
    label: string,
    data: AsyncData.AsyncData<number, string>,
    suffix: string,
    h: HtmlBuilder<Message>
): Html =>
    panel(
        {
            label,
            maybe_status: Option.some(
                badge(AsyncData.isPending(data) ? "PENDING" : data._tag, h)
            ),
        },
        [
            AsyncData.match(data, {
                onIdle: () => note("Idle", h),
                onLoading: () => note("Loading…", h),
                onRefreshing: (count) =>
                    author_measure(String(count), suffix, "opacity-40", h),
                onFailure: (error) => note(error, h),
                onStale: ({ data: count }) =>
                    author_measure(String(count), suffix, "text-warning", h),
                onSuccess: (count) =>
                    author_measure(String(count), suffix, "", h),
            }),
        ],
        h
    )

const combining_view = (model: Author.Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                {
                    label: "Author",
                    maybe_status: Option.some(model_field_badge(h)),
                },
                [
                    big_value(Author.author_at(model.author_index).name, h),
                    h.div(
                        [
                            h.Class(
                                "grid grid-cols-2 border-t-(length:--surface-border-width) border-border sm:grid-cols-3"
                            ),
                        ],
                        Array.map(Author.authors, (author, author_index) =>
                            action(
                                author.name,
                                Author.SelectedAuthor({ author_index }),
                                author_index === model.author_index,
                                h
                            )
                        )
                    ),
                ],
                h
            ),
            h.div(
                [h.Class("grid gap-5 sm:grid-cols-2")],
                [
                    author_panel("Books", model.books, "books", h),
                    author_panel(
                        "Age at death",
                        model.age_at_death,
                        "years",
                        h
                    ),
                ]
            ),
            panel(
                {
                    label: "Books per year",
                    maybe_status: Option.some(timing(model.timer, h)),
                },
                [
                    AsyncData.match(Author.books_per_year(model), {
                        onIdle: () => note("Idle", h),
                        onLoading: () => note("Waiting for both…", h),
                        onRefreshing: (ratio) =>
                            h.div(
                                [
                                    h.Class(
                                        "flex min-h-30 items-center justify-center px-5 text-4xl opacity-40"
                                    ),
                                ],
                                [`${ratio} books/year`]
                            ),
                        onFailure: (error) => note(error, h),
                        onStale: ({ data: ratio }) =>
                            big_value(`${ratio} books/year`, h),
                        onSuccess: (ratio) =>
                            big_value(`${ratio} books/year`, h),
                    }),
                    // The label names the transition update applies, which is
                    // the whole point of the toggle.
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border"
                            ),
                        ],
                        [
                            Ui.Button.view(
                                {
                                    onClick: Author.ToggledKeepPreviousData(),
                                    isDisabled: false,
                                    toView: (attributes) =>
                                        h.button(
                                            [
                                                ...attributes.button,
                                                h.Class(
                                                    "w-full px-4 py-3 text-left text-xs tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                ),
                                            ],
                                            [
                                                model.keeps_previous_data
                                                    ? "◉  revalidateOrLoad — keeps the last pair on screen"
                                                    : "○  Loading — clears the pair on every switch",
                                            ]
                                        ),
                                },
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const heart = (is_liked: boolean, h: HtmlBuilder<Message>): Html =>
    h.svg(
        [
            h.Xmlns("http://www.w3.org/2000/svg"),
            h.Width("48"),
            h.Height("48"),
            h.ViewBox("0 0 256 256"),
            h.Fill(is_liked ? "currentColor" : "none"),
            h.Stroke("currentColor"),
            h.StrokeWidth("16"),
            h.StrokeLinecap("round"),
            h.StrokeLinejoin("round"),
            h.Class(is_liked ? "text-primary" : "text-muted-foreground"),
        ],
        [
            h.path([
                h.D(
                    "M128,216S28,160,28,92A52,52,0,0,1,128,72h0A52,52,0,0,1,228,92C228,160,128,216,128,216Z"
                ),
            ]),
        ]
    )

const optimistic_update_view = (
    model: Like.Model,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                {
                    label: "Like",
                    maybe_status: Option.some(timing(model.timer, h)),
                },
                [
                    Ui.Button.view(
                        {
                            onClick: Like.ClickedLike(),
                            isDisabled: Like.is_saving(model),
                            toView: (attributes) =>
                                h.button(
                                    [
                                        ...attributes.button,
                                        h.Class(
                                            "flex min-h-30 w-full flex-col items-center justify-center gap-3 px-5 transition-colors hover:bg-muted disabled:cursor-not-allowed"
                                        ),
                                        h.AriaLabel("Toggle like"),
                                    ],
                                    [
                                        heart(Like.displayed_liked(model), h),
                                        h.span(
                                            [h.Class("text-3xl")],
                                            [
                                                NumberFlow({
                                                    value: Like.displayed_count(
                                                        model
                                                    ),
                                                }),
                                            ]
                                        ),
                                    ]
                                ),
                        },
                        h
                    ),
                ],
                h
            ),
            panel(
                {
                    label: "Server",
                    maybe_status: Option.some(badge("↩ SOURCE OF TRUTH", h)),
                },
                [numeric_value(Like.server_count(model), h)],
                h
            ),
            Option.match(model.maybe_error, {
                onNone: () => h.empty,
                onSome: (error) =>
                    panel(
                        { label: "Rolled back", maybe_status: Option.none() },
                        [
                            h.p(
                                [h.Class("px-5 py-4 text-sm text-destructive")],
                                [
                                    `${error} — the pending value was dropped, so the view fell back to the server's.`,
                                ]
                            ),
                        ],
                        h
                    ),
            }),
            panel(
                { label: "Simulate", maybe_status: Option.none() },
                [
                    Ui.Button.view(
                        {
                            onClick: Like.ToggledFailureSimulation(),
                            isDisabled: false,
                            toView: (attributes) =>
                                h.button(
                                    [
                                        ...attributes.button,
                                        h.Class(
                                            "w-full px-4 py-3 text-left text-xs tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        ),
                                    ],
                                    [
                                        model.is_failure_simulated
                                            ? "◉  the next save fails"
                                            : "○  the next save succeeds",
                                    ]
                                ),
                        },
                        h
                    ),
                ],
                h
            ),
        ]
    )

const todo_row = (todo: Todos.Todo, h: HtmlBuilder<Message>): Html =>
    h.keyed("div")(
        String(todo.todo_id),
        [
            h.Class(
                "flex items-center gap-3 border-t-(length:--surface-border-width) border-border px-5 py-3 first:border-t-0"
            ),
        ],
        [
            CircularCheckbox(
                {
                    isChecked: todo.is_completed,
                    label: `Toggle ${todo.text}`,
                    onToggle: Todos.ToggledTodo({ todo_id: todo.todo_id }),
                },
                h
            ),
            h.span(
                [
                    h.Class(
                        todo.is_completed
                            ? "flex-1 text-sm text-muted-foreground line-through"
                            : "flex-1 text-sm"
                    ),
                ],
                [todo.text]
            ),
            Ui.Button.view(
                {
                    onClick: Todos.ClickedDeleteTodo({ todo_id: todo.todo_id }),
                    isDisabled: false,
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    "text-xs tracking-wider text-muted-foreground transition-colors hover:text-destructive"
                                ),
                                h.AriaLabel(`Delete ${todo.text}`),
                            ],
                            ["DELETE"]
                        ),
                },
                h
            ),
        ]
    )

const todos_composer = (model: Todos.Model, h: HtmlBuilder<Message>): Html =>
    panel(
        {
            label: "Create todo",
            maybe_status: Option.some(model_field_badge(h)),
        },
        [
            h.form(
                [h.Class("flex gap-3 p-5"), h.OnSubmit(Todos.SubmittedTodo())],
                [
                    h.input([
                        h.Class(
                            "min-w-0 flex-1 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 outline-none"
                        ),
                        h.Placeholder("What needs doing?"),
                        h.Value(model.draft),
                        h.OnInput((value) => Todos.UpdatedTodoDraft({ value })),
                    ]),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-4 py-2 transition-colors hover:bg-muted"
                            ),
                        ],
                        ["Add"]
                    ),
                ]
            ),
        ],
        h
    )

const todos_filter_panel = (
    model: Todos.Model,
    h: HtmlBuilder<Message>
): Html =>
    panel(
        { label: "Filter", maybe_status: Option.some(badge("↳ DERIVED", h)) },
        [
            h.div(
                [h.Class("grid grid-cols-3")],
                Array.map(Todos.filters, (filter) =>
                    action(
                        filter,
                        Todos.SelectedTodoFilter({ filter }),
                        filter === model.filter,
                        h
                    )
                )
            ),
        ],
        h
    )

const todos_list = (model: Todos.Model, h: HtmlBuilder<Message>): Html =>
    panel(
        {
            label: "Todos",
            maybe_status: Option.some(
                badge(
                    `${Todos.completed_count(model)} / ${model.items.length} DONE`,
                    h
                )
            ),
        },
        [
            Array.match(Todos.visible_items(model), {
                onEmpty: () =>
                    h.p(
                        [
                            h.Class(
                                "px-5 py-8 text-center text-sm text-muted-foreground"
                            ),
                        ],
                        ["Nothing here yet."]
                    ),
                onNonEmpty: (items) =>
                    h.div(
                        [],
                        Array.map(items, (todo) => todo_row(todo, h))
                    ),
            }),
        ],
        h
    )

const items_view = (
    model: Todos.Model,
    shows_filter: boolean,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        shows_filter
            ? [
                  todos_composer(model, h),
                  todos_filter_panel(model, h),
                  todos_list(model, h),
              ]
            : [todos_composer(model, h), todos_list(model, h)]
    )

// The composer is a Submodel: it owns its Model, dispatches its own Message
// type, and the two instances on the page differ only in the slot they occupy.
const composer_view = Submodel.defineView<
    Composer.Model,
    Composer.Message,
    Readonly<{ placeholder: string }>
>((model, { placeholder }, h) =>
    h.form(
        [h.Class("flex gap-3 p-5"), h.OnSubmit(Composer.SubmittedComposer())],
        [
            h.input([
                h.Class(
                    "min-w-0 flex-1 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 outline-none"
                ),
                h.Placeholder(placeholder),
                h.Value(model.draft),
                h.OnInput((value) => Composer.UpdatedComposerDraft({ value })),
            ]),
            h.button(
                [
                    h.Type("submit"),
                    h.Class(
                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-4 py-2 transition-colors hover:bg-muted"
                    ),
                ],
                ["Post"]
            ),
        ]
    )
)

const comments_thread = (
    thread: Comments.Thread,
    h: HtmlBuilder<Message>
): Html =>
    panel(
        {
            label: thread.title,
            maybe_status: Option.some(badge(`${thread.posts.length} POSTS`, h)),
        },
        [
            h.submodel({
                slotId: `composer-${thread.thread_id}`,
                model: thread.composer,
                view: composer_view,
                viewInputs: { placeholder: thread.placeholder },
                toParentMessage: (message) =>
                    Comments.GotComposerMessage({
                        id: thread.thread_id,
                        message,
                    }),
            }),
            Array.match(thread.posts, {
                onEmpty: () =>
                    h.p(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border px-5 py-6 text-center text-sm text-muted-foreground"
                            ),
                        ],
                        ["No posts yet."]
                    ),
                onNonEmpty: (posts) =>
                    h.div(
                        [
                            h.Class(
                                "border-t-(length:--surface-border-width) border-border"
                            ),
                        ],
                        Array.map(posts, (post) =>
                            h.keyed("p")(
                                `post-${post.post_id}`,
                                [
                                    h.Class(
                                        "border-t-(length:--surface-border-width) border-border px-5 py-3 text-sm first:border-t-0"
                                    ),
                                ],
                                [post.text]
                            )
                        )
                    ),
            }),
        ],
        h
    )

const embedding_view = (model: Comments.Model, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("space-y-5")],
        Array.map(model.threads, (thread) => comments_thread(thread, h))
    )

const PATTERN_NOTES: Readonly<Record<Search.Pattern, string>> = {
    Subscription:
        "A Stream the runtime owns, keyed on the query and the search token. Changing either tears the running Stream down and starts a new one, so there is no request to cancel by hand.",
    Command:
        "One Command per page. The Model holds what has arrived and how many rows are still missing, and Load More is an ordinary Message.",
}

const search_header_cell = (label: string, h: HtmlBuilder<Message>): Html =>
    h.th(
        [
            h.Class(
                "px-4 py-2 text-left text-xs tracking-widest uppercase text-muted-foreground"
            ),
        ],
        [label]
    )

const search_row = (row: Search.Row, h: HtmlBuilder<Message>): Html =>
    h.keyed("tr")(
        String(row.row_id),
        [h.Class("border-t-(length:--surface-border-width) border-border")],
        [
            h.td([h.Class("px-4 py-2 text-xs")], [String(row.row_id)]),
            h.td([h.Class("px-4 py-2 text-xs")], [row.title]),
            h.td(
                [h.Class("px-4 py-2 text-xs text-muted-foreground")],
                [row.description]
            ),
        ]
    )

const search_table = (
    visible: ReadonlyArray<Search.Row>,
    h: HtmlBuilder<Message>
): Html =>
    Array.match(visible, {
        onEmpty: () =>
            h.p(
                [
                    h.Class(
                        "px-5 py-8 text-center text-sm text-muted-foreground"
                    ),
                ],
                ["Press search."]
            ),
        onNonEmpty: (found) =>
            h.div(
                [h.Class("max-h-72 overflow-auto")],
                [
                    h.table(
                        [h.Class("w-full")],
                        [
                            h.thead(
                                [h.Class("sticky top-0 bg-muted")],
                                [
                                    h.tr(
                                        [],
                                        [
                                            search_header_cell("Id", h),
                                            search_header_cell("Title", h),
                                            search_header_cell(
                                                "Description",
                                                h
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.tbody(
                                [],
                                Array.map(found, (row) => search_row(row, h))
                            ),
                        ]
                    ),
                ]
            ),
    })

const streaming_view = (model: Search.Model, h: HtmlBuilder<Message>): Html => {
    const visible = Search.visible_rows(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            h.div(
                [
                    h.Class(
                        "grid grid-cols-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                Array.map(Search.patterns, (pattern) =>
                    action(
                        pattern,
                        Search.SelectedSearchPattern({ pattern }),
                        pattern === model.pattern,
                        h
                    )
                )
            ),
            panel(
                {
                    label: "Query",
                    maybe_status: Option.some(
                        badge(
                            `${visible.length} / ${Search.matching(model.query).length}`,
                            h
                        )
                    ),
                },
                [
                    h.div(
                        [h.Class("flex gap-3 p-5")],
                        [
                            h.input([
                                h.Class(
                                    "min-w-0 flex-1 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 outline-none"
                                ),
                                h.Placeholder("Search items…"),
                                h.Value(model.query),
                                h.OnInput((value) =>
                                    Search.UpdatedSearchQuery({ value })
                                ),
                            ]),
                            Ui.Button.view(
                                {
                                    onClick: Search.ClickedSearch(),
                                    isDisabled:
                                        model.is_streaming || model.is_pulling,
                                    toView: (attributes) =>
                                        h.button(
                                            [
                                                ...attributes.button,
                                                h.Class(
                                                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-4 py-2 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                                                ),
                                            ],
                                            ["Search"]
                                        ),
                                },
                                h
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                {
                    label: "Results",
                    maybe_status: Option.some(
                        badge(
                            model.is_streaming
                                ? "STREAMING"
                                : model.is_pulling
                                  ? "LOADING"
                                  : "IDLE",
                            h
                        )
                    ),
                },
                [
                    search_table(visible, h),
                    model.pattern === "Command" && Search.has_more_pages(model)
                        ? h.div(
                              [
                                  h.Class(
                                      "border-t-(length:--surface-border-width) border-border p-5"
                                  ),
                              ],
                              [
                                  Ui.Button.view(
                                      {
                                          onClick: Search.ClickedLoadMore(),
                                          isDisabled: model.is_pulling,
                                          toView: (attributes) =>
                                              h.button(
                                                  [
                                                      ...attributes.button,
                                                      h.Class(
                                                          "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-4 py-2 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                                                      ),
                                                  ],
                                                  ["Load more (5)"]
                                              ),
                                      },
                                      h
                                  ),
                              ]
                          )
                        : h.empty,
                ],
                h
            ),
            panel(
                { label: model.pattern, maybe_status: Option.none() },
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [PATTERN_NOTES[model.pattern]]
                    ),
                ],
                h
            ),
        ]
    )
}

type Page = Readonly<{
    title: string
    lead: string
    source: string
    previous_href: string | undefined
    next_href: string | undefined
    example_number: number
    demo: Html
}>

const page_for_model = (model: Model, h: HtmlBuilder<Message>): Page =>
    M.value(model.route).pipe(
        M.withReturnType<Page>(),
        M.tags({
            ModelMessageRoute: () => ({
                title: "Model & Message",
                lead: "State is a field on the Model. Only update replaces it, in response to a Message.",
                source: counter_source,
                previous_href: undefined,
                next_href: walkthrough_href("state/derived-values"),
                example_number: 1,
                demo: counter_view(model.counter, false, h),
            }),
            DerivedViewRoute: () => ({
                title: "Derived View",
                lead: "The doubled value is computed from the Model while rendering, so there is no second value to synchronize.",
                source: counter_source,
                previous_href: walkthrough_href("state/counter"),
                next_href: walkthrough_href("state/combined-inputs"),
                example_number: 2,
                demo: counter_view(model.counter, true, h),
            }),
            DerivedInputRoute: () => ({
                title: "Derived View II",
                lead: "Two Model fields produce one displayed value. The dependency remains an ordinary function.",
                source: combined_inputs_source,
                previous_href: walkthrough_href("state/derived-values"),
                next_href: walkthrough_href("side-effects/on-change"),
                example_number: 3,
                demo: combined_inputs_view(model.repeated_text, h),
            }),
            CommandRoute: () => ({
                title: "Command",
                lead: "Update explicitly starts effectful work when the dice count changes.",
                source: on_change_source,
                previous_href: walkthrough_href("state/combined-inputs"),
                next_href: walkthrough_href("side-effects/decoding"),
                example_number: 4,
                demo: on_change_view(model.dice, h),
            }),
            CommandSchemaRoute: () => ({
                title: "Command & Schema",
                lead: "The response is decoded inside the Command, so the Model only holds validated readings.",
                source: decoding_source,
                previous_href: walkthrough_href("side-effects/on-change"),
                next_href: walkthrough_href("side-effects/on-demand"),
                example_number: 5,
                demo: decoding_view(model.weather, h),
            }),
            CommandTriggerRoute: () => ({
                title: "Triggered Command",
                lead: "A Message starts the Command on demand and pending state prevents duplicate runs.",
                source: on_demand_source,
                previous_href: walkthrough_href("side-effects/decoding"),
                next_href: walkthrough_href("async/combining"),
                example_number: 6,
                demo: on_demand_view(model.roll, h),
            }),
            AsyncDataRoute: () => ({
                title: "AsyncData",
                lead: "Independent Commands combine into one derived AsyncData value while stale responses are ignored.",
                source: combining_source,
                previous_href: walkthrough_href("side-effects/on-demand"),
                next_href: walkthrough_href("async/optimistic-update"),
                example_number: 7,
                demo: combining_view(model.author, h),
            }),
            OptimisticUpdateRoute: () => ({
                title: "Optimistic Update",
                lead: "The pending value drives the view immediately; success commits it and failure falls back to server state.",
                source: optimistic_update_source,
                previous_href: walkthrough_href("async/combining"),
                next_href: walkthrough_href("lists/items"),
                example_number: 8,
                demo: optimistic_update_view(model.like, h),
            }),
            TodoListRoute: () => ({
                title: "Todo List",
                lead: "Messages update one replayable Model, including deterministic identifiers allocated from state.",
                source: items_source,
                previous_href: walkthrough_href("async/optimistic-update"),
                next_href: walkthrough_href("lists/filtering"),
                example_number: 9,
                demo: items_view(model.todos, false, h),
            }),
            TodoFilterRoute: () => ({
                title: "Todo List II",
                lead: "The filter is a Model field and the visible rows are derived from it, so no Message can leave the two out of step.",
                source: items_source,
                previous_href: walkthrough_href("lists/items"),
                next_href: walkthrough_href("components/embedding"),
                example_number: 10,
                demo: items_view(model.todos, true, h),
            }),
            SubmodelRoute: () => ({
                title: "Submodel",
                lead: "One composer module embedded twice. Each instance owns its Model and reports a post through an OutMessage the parent folds in.",
                source: composer_source,
                previous_href: walkthrough_href("lists/filtering"),
                next_href: walkthrough_href("async/streaming"),
                example_number: 11,
                demo: embedding_view(model.comments, h),
            }),
            SubscriptionRoute: () => ({
                title: "Subscription",
                lead: "Rows arriving from a Stream the runtime owns, beside the same rows pulled a page at a time by a Command.",
                source: streaming_source,
                previous_href: walkthrough_href("components/embedding"),
                next_href: undefined,
                example_number: 12,
                demo: streaming_view(model.search, h),
            }),
        }),
        M.orElse(() => ({
            title: "Foldkit",
            lead: "This example has not been migrated yet.",
            source: "",
            previous_href: undefined,
            next_href: undefined,
            example_number: 0,
            demo: h.empty,
        }))
    )

const sound_label = (audio: Audio.Model): string =>
    M.value(audio).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
            AudioOff: () => "Sound off",
            AudioStarting: () => "Sound starting",
            AudioReady: ({ maybe_diagnostic }) =>
                Option.match(maybe_diagnostic, {
                    onNone: () => "Sound on",
                    onSome: (diagnostic) => `Sound on — ${diagnostic}`,
                }),
            AudioFailed: ({ reason }) => `Sound failed — ${reason}`,
        })
    )

// The context is acquired by the Model reaching AudioStarting, not by this
// handler — the click only sends the Message that gets it there.
const sound_toggle = (audio: Audio.Model, h: HtmlBuilder<Message>): Html =>
    Ui.Button.view(
        {
            onClick: Audio.ToggledAudio(),
            isDisabled: false,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            Audio.is_ready(audio)
                                ? "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                                : "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                        ),
                        h.AriaLabel("Toggle sound"),
                    ],
                    [sound_label(audio)]
                ),
        },
        h
    )

const navigation_link = (
    label: string,
    aria_label: string,
    href: string | undefined,
    h: HtmlBuilder<Message>
): Html =>
    href === undefined
        ? h.span([h.Class("px-3 py-2 text-muted-foreground")], [label])
        : h.a(
              [
                  h.Href(href),
                  h.AriaLabel(aria_label),
                  h.Class(
                      "rounded-[var(--radius-surface)] px-3 py-2 hover:bg-muted"
                  ),
              ],
              [label]
          )

export const view = Submodel.defineView<Model, Message>((model, h) => {
    const page = page_for_model(model, h)
    return h.main(
        [h.Class("space-y-6")],
        [
            h.header(
                [
                    h.Class(
                        "flex flex-wrap items-center gap-4 border-b-(length:--surface-border-width) border-border pb-4"
                    ),
                ],
                [
                    h.div(
                        [],
                        [
                            h.h1([h.Class("text-2xl font-bold")], [page.title]),
                            h.p(
                                [h.Class("mt-1 text-sm text-muted-foreground")],
                                [page.lead]
                            ),
                        ]
                    ),
                    h.nav(
                        [
                            h.Class("ml-auto flex items-center gap-2"),
                            h.AriaLabel("Foldkit examples"),
                        ],
                        [
                            sound_toggle(model.audio, h),
                            h.span(
                                [h.Class("text-sm text-muted-foreground")],
                                [`${page.example_number} / 12`]
                            ),
                            navigation_link(
                                "←",
                                "Previous Foldkit example",
                                page.previous_href,
                                h
                            ),
                            navigation_link(
                                "→",
                                "Next Foldkit example",
                                page.next_href,
                                h
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-6 xl:grid-cols-2")],
                [
                    h.section([
                        h.Class(
                            "documentation-code-block documentation-shiki overflow-x-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"
                        ),
                        h.AriaLabel("Example source"),
                        h.InnerHTML(page.source),
                    ]),
                    h.section(
                        [h.AriaLabel("Interactive example")],
                        [page.demo]
                    ),
                ]
            ),
        ]
    )
})

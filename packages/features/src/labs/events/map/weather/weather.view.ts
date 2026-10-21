import { Match as M } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Message } from "./weather.message.ts"
import {
    SubmittedWeatherForm,
    UpdatedPostcodeInput,
} from "./weather.message.ts"
import type { Model, WeatherData } from "./weather.model.ts"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.div(
        [
            h.Class(
                "min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-6 text-foreground"
            ),
        ],
        [
            h.h1(
                [h.Class("text-4xl font-bold text-foreground mb-8")],
                ["Weather"]
            ),
            h.form(
                [
                    h.Class("flex flex-col gap-4 items-center w-full max-w-md"),
                    h.OnSubmit(toParentMessage(SubmittedWeatherForm())),
                ],
                [
                    h.label(
                        [h.For("location"), h.Class("sr-only")],
                        ["Postcode"]
                    ),
                    h.input([
                        h.Id("location"),
                        h.Class(
                            "w-full px-4 py-2 rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                        ),
                        h.Autocomplete("postal-code"),
                        h.DataAttribute("1p-ignore", ""),
                        h.Placeholder("Enter a UK postcode"),
                        h.Value(model.postcodeInput),
                        h.OnInput((value) =>
                            toParentMessage(UpdatedPostcodeInput({ value }))
                        ),
                    ]),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Disabled(model.weather._tag === "WeatherLoading"),
                            h.Class(
                                "px-6 py-2 bg-primary text-primary-foreground rounded-[var(--radius-control)] hover:bg-primary/90 transition disabled:opacity-50 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                            ),
                        ],
                        [
                            model.weather._tag === "WeatherLoading"
                                ? "Loading..."
                                : "Get Weather",
                        ]
                    ),
                ]
            ),
            M.value(model.weather).pipe(
                M.withReturnType<Html>(),
                M.tagsExhaustive({
                    WeatherInit: () => h.empty,
                    WeatherLoading: () =>
                        h.div(
                            [h.Class("text-primary font-semibold text-center")],
                            ["Fetching weather..."]
                        ),
                    WeatherFailure: ({ error }) =>
                        h.div(
                            [
                                h.Class(
                                    "p-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-destructive/10 text-destructive"
                                ),
                            ],
                            [error]
                        ),
                    WeatherSuccess: ({ data }) =>
                        weatherView<ParentMessage>(data, h),
                })
            ),
        ]
    )
}

const weatherView = <ParentMessage>(
    weather: WeatherData,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.article(
        [
            h.Class(
                "bg-card text-card-foreground rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border [box-shadow:var(--shadow-overlay)] p-8 max-w-md w-full"
            ),
        ],
        [
            h.h2(
                [
                    h.Class(
                        "text-2xl font-bold text-foreground mb-3 text-center"
                    ),
                ],
                [weather.postcode]
            ),
            h.p(
                [h.Class("text-center text-muted-foreground mb-6")],
                [weather.locationName + ", " + weather.region]
            ),
            h.div(
                [h.Class("text-center mb-6")],
                [
                    h.div(
                        [h.Class("text-6xl font-bold text-primary")],
                        [`${weather.temperature}°C`]
                    ),
                    h.div(
                        [h.Class("text-xl text-muted-foreground mt-2")],
                        [weather.description]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid grid-cols-2 gap-4 text-center")],
                [
                    h.div(
                        [
                            h.Class(
                                "bg-muted p-4 rounded-[var(--radius-surface)]"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("text-sm text-muted-foreground")],
                                ["Humidity"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "text-lg font-semibold text-foreground"
                                    ),
                                ],
                                [`${weather.humidity}%`]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "bg-muted p-4 rounded-[var(--radius-surface)]"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("text-sm text-muted-foreground")],
                                ["Wind Speed"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "text-lg font-semibold text-foreground"
                                    ),
                                ],
                                [`${weather.windSpeed} mph`]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

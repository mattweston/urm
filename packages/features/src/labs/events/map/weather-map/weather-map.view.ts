import { Option } from "effect"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"

import { aqi_band, type AirQuality } from "./air-quality.ts"
import type { Message } from "./weather-map.message.ts"
import type { Model } from "./weather-map.model.ts"
import { mountMap, weatherMapHostId } from "./weather-map.mount.ts"
import type { Forecast } from "./weather.ts"

const stat = <ParentMessage>(
    label: string,
    value: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("rounded-[var(--radius-surface)] bg-muted p-3 text-center")],
        [
            h.div([h.Class("text-xs text-muted-foreground")], [label]),
            h.div(
                [
                    h.Class(
                        "mt-0.5 text-base font-semibold tabular-nums text-foreground"
                    ),
                ],
                [value]
            ),
        ]
    )

const forecastView = <ParentMessage>(
    forecast: Forecast,
    isLoading: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class(isLoading ? "opacity-45" : "opacity-100")],
        [
            h.div(
                [h.Class("text-center")],
                [
                    h.div(
                        [
                            h.Class(
                                "text-5xl font-semibold tabular-nums text-primary"
                            ),
                        ],
                        [`${forecast.current.temperature}°C`]
                    ),
                    h.div(
                        [h.Class("mt-1 text-lg text-muted-foreground")],
                        [forecast.current.description]
                    ),
                    h.div(
                        [h.Class("mt-1 text-xs text-muted-foreground")],
                        [
                            `Feels like ${forecast.current.feels_like}°C · High ${forecast.today.high}° / Low ${forecast.today.low}°`,
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("mt-5 grid grid-cols-3 gap-2")],
                [
                    stat(
                        "Wind",
                        `${forecast.current.wind_speed} ${forecast.current.wind_compass}`,
                        h
                    ),
                    stat("Gusts", `${forecast.current.wind_gusts} mph`, h),
                    stat("Humidity", `${forecast.current.humidity}%`, h),
                    stat("Cloud", `${forecast.current.cloud_cover}%`, h),
                    stat("Pressure", `${forecast.current.pressure} hPa`, h),
                    stat("Rain", `${forecast.current.precipitation} mm`, h),
                ]
            ),
            h.div(
                [h.Class("mt-2 grid grid-cols-2 gap-2")],
                [
                    stat("Sunrise", forecast.today.sunrise, h),
                    stat("Sunset", forecast.today.sunset, h),
                ]
            ),
        ]
    )

const reading = <ParentMessage>(
    label: string,
    value: number | undefined,
    unit: string,
    h: HtmlBuilder<ParentMessage>
): Html => stat(label, value === undefined ? "—" : `${value}${unit}`, h)

const airQualityView = <ParentMessage>(
    air: AirQuality,
    isLoading: boolean,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const band =
        air.european_aqi === undefined ? undefined : aqi_band(air.european_aqi)
    const bandClass =
        band?.tone === "good"
            ? "border-success/40 bg-success/10"
            : band?.tone === "fair"
              ? "border-warning/40 bg-warning/10"
              : "border-destructive/40 bg-destructive/10"

    return h.div(
        [
            h.Class(
                `mt-3 transition-opacity ${isLoading ? "opacity-45" : "opacity-100"}`
            ),
        ],
        [
            band === undefined
                ? h.empty
                : h.div(
                      [
                          h.Class(
                              `rounded-lg border p-3 text-center ${bandClass}`
                          ),
                      ],
                      [
                          h.div(
                              [h.Class("text-2xl font-semibold tabular-nums")],
                              [`${air.european_aqi ?? "—"}`]
                          ),
                          h.div(
                              [h.Class("mt-0.5 text-xs text-muted-foreground")],
                              [`European AQI · ${band.label}`]
                          ),
                      ]
                  ),
            h.div(
                [h.Class("mt-2 grid grid-cols-3 gap-2")],
                [
                    reading("PM2.5", air.pm2_5, " µg", h),
                    reading("PM10", air.pm10, " µg", h),
                    reading("UV now", air.uv_index, "", h),
                ]
            ),
            air.grass_pollen === undefined && air.tree_pollen === undefined
                ? h.empty
                : h.div(
                      [h.Class("mt-2 grid grid-cols-2 gap-2")],
                      [
                          reading("Grass pollen", air.grass_pollen, "", h),
                          reading("Tree pollen", air.tree_pollen, "", h),
                      ]
                  ),
        ]
    )
}

const optionText = (value: Option.Option<string>, fallback: string): string =>
    Option.getOrElse(value, () => fallback)

export const view = <ParentMessage>(
    model: Model,
    _toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.main(
        [h.Class("mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6")],
        [
            h.header(
                [],
                [
                    h.h1([h.Class("text-3xl font-semibold")], ["Weather map"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Drag the marker or click the map to refresh weather, air quality, and place independently.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid gap-5 lg:grid-cols-2")],
                [
                    h.section(
                        [
                            h.Class(
                                "relative overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"
                            ),
                        ],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "border-b-(length:--surface-border-width) border-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                    ),
                                ],
                                ["Weather location"]
                            ),
                            h.div(
                                [
                                    h.Id(weatherMapHostId),
                                    h.Class("h-[26rem] w-full"),
                                    h.AriaLabel("Weather location map"),
                                    h.OnMount(
                                        Mount.mapMessage(
                                            mountMap(
                                                weatherMapHostId,
                                                model.position
                                            ),
                                            _toParentMessage
                                        )
                                    ),
                                ],
                                []
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "border-t-(length:--surface-border-width) border-border px-5 py-3 text-xs text-muted-foreground"
                                    ),
                                ],
                                [
                                    `Now at ${model.position.lat.toFixed(3)}, ${model.position.lng.toFixed(3)}.`,
                                ]
                            ),
                            Option.match(model.mapError, {
                                onNone: () => h.empty,
                                onSome: (reason) =>
                                    h.div(
                                        [
                                            h.Class(
                                                "absolute left-1/2 top-16 z-20 max-w-md -translate-x-1/2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) bg-card px-4 py-3 text-sm [box-shadow:var(--shadow-surface)]"
                                            ),
                                        ],
                                        [
                                            h.div(
                                                [h.Class("font-semibold")],
                                                ["Could not load the map."]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                [reason]
                                            ),
                                        ]
                                    ),
                            }),
                        ]
                    ),
                    h.section(
                        [
                            h.Class(
                                "min-h-[32rem] rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5"
                            ),
                        ],
                        [
                            Option.match(model.place, {
                                onNone: () =>
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            optionText(
                                                model.placeError,
                                                "Finding the nearest postcode…"
                                            ),
                                        ]
                                    ),
                                onSome: (place) =>
                                    place.kind === "outside_coverage"
                                        ? h.div(
                                              [],
                                              [
                                                  h.p(
                                                      [
                                                          h.Class(
                                                              "font-semibold"
                                                          ),
                                                      ],
                                                      [
                                                          "Outside UK postcode coverage",
                                                      ]
                                                  ),
                                                  h.p(
                                                      [
                                                          h.Class(
                                                              "text-xs text-muted-foreground"
                                                          ),
                                                      ],
                                                      [
                                                          "postcodes.io covers the United Kingdom only.",
                                                      ]
                                                  ),
                                              ]
                                          )
                                        : h.div(
                                              [
                                                  h.Class(
                                                      model.isPlaceLoading
                                                          ? "opacity-45"
                                                          : "opacity-100"
                                                  ),
                                              ],
                                              [
                                                  h.p(
                                                      [
                                                          h.Class(
                                                              "font-mono text-sm font-semibold"
                                                          ),
                                                      ],
                                                      [place.postcode]
                                                  ),
                                                  h.p(
                                                      [
                                                          h.Class(
                                                              "mt-1 text-sm text-muted-foreground"
                                                          ),
                                                      ],
                                                      [
                                                          `${place.ward}, ${place.district}${place.parish === undefined ? "" : ` · ${place.parish}`}`,
                                                      ]
                                                  ),
                                                  h.p(
                                                      [
                                                          h.Class(
                                                              "mt-1 text-xs text-muted-foreground"
                                                          ),
                                                      ],
                                                      [
                                                          `Nearest postcode centre is ${place.metres_away} m away.`,
                                                      ]
                                                  ),
                                              ]
                                          ),
                            }),
                            h.div(
                                [h.Class("mt-6")],
                                [
                                    Option.match(model.forecast, {
                                        onNone: () =>
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    optionText(
                                                        model.forecastError,
                                                        "Reading the forecast…"
                                                    ),
                                                ]
                                            ),
                                        onSome: (forecast) =>
                                            forecastView(
                                                forecast,
                                                model.isForecastLoading,
                                                h
                                            ),
                                    }),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-6 border-t-(length:--surface-border-width) border-border pt-5"
                                    ),
                                ],
                                [
                                    h.p(
                                        [
                                            h.Class(
                                                "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                            ),
                                        ],
                                        ["Air quality"]
                                    ),
                                    Option.match(model.airQuality, {
                                        onNone: () =>
                                            h.p(
                                                [
                                                    h.Class(
                                                        "mt-2 text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    optionText(
                                                        model.airQualityError,
                                                        "Reading the air…"
                                                    ),
                                                ]
                                            ),
                                        onSome: (air) =>
                                            airQualityView(
                                                air,
                                                model.isAirQualityLoading,
                                                h
                                            ),
                                    }),
                                ]
                            ),
                            Option.match(model.forecast, {
                                onNone: () => h.empty,
                                onSome: (forecast) =>
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-5 text-center text-xs text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            `${forecast.elevation_metres} m above sea level · ${forecast.timezone}`,
                                        ]
                                    ),
                            }),
                        ]
                    ),
                ]
            ),
        ]
    )

import { RegistryContext, useAtomValue } from "@effect/atom-solid"
import { Show, createMemo, type JSX } from "solid-js"

import { aqi_band } from "./air-quality.ts"
import { async_view } from "./async-view.ts"
import {
    air_quality_atom,
    place_atom,
    weather_atom,
    weather_map_registry,
} from "./state.ts"

const stat_class = "rounded-lg bg-muted p-3 text-center"
const section_label_class =
    "text-xs font-semibold tracking-wide text-muted-foreground uppercase"

// The site has named themes rather than a light/dark pair, so the air quality
// band is carried by a border and an alpha tint — which hold up in all of them
// — rather than by a colour token that only some themes define.
const band_class = (tone: "good" | "fair" | "poor"): string => {
    switch (tone) {
        case "good":
            return "border-emerald-500/40 bg-emerald-500/10"
        case "fair":
            return "border-amber-500/40 bg-amber-500/10"
        case "poor":
            return "border-destructive/40 bg-destructive/10"
    }
}

const Stat = (props: {
    readonly label: string
    readonly value: string
}): JSX.Element => (
    <div class={stat_class}>
        <div class="text-xs text-muted-foreground">{props.label}</div>
        <div class="mt-0.5 text-base font-semibold tabular-nums text-foreground">
            {props.value}
        </div>
    </div>
)

const Reading = (props: {
    readonly label: string
    readonly value: number | undefined
    readonly unit: string
}): JSX.Element => (
    <div class={stat_class}>
        <div class="text-xs text-muted-foreground">{props.label}</div>
        <div class="mt-0.5 text-base font-semibold tabular-nums text-foreground">
            <Show when={props.value !== undefined} fallback="—">
                {props.value}
                {props.unit}
            </Show>
        </div>
    </div>
)

// One island, three derived atoms. They are separate atoms rather than one
// combined request so that a slow or failing source only costs its own section:
// postcodes.io is both the slowest and the likeliest to fail, and the
// temperature should not wait behind it.
const WeatherIslandContent = (): JSX.Element => {
    const weather = async_view(useAtomValue(() => weather_atom))
    const place = async_view(useAtomValue(() => place_atom))
    const air = async_view(useAtomValue(() => air_quality_atom))

    // Every state of the lookup renders the same three lines, so the block has
    // one height and nothing below it moves when the answer changes. Reserving
    // blank space would do the same job, but this way the space carries an
    // answer instead of standing empty — and there is no line count to keep in
    // step with the font.
    const place_lines = createMemo(
        (): Readonly<{ code: string; area: string; note: string }> => {
            const current = place.value()

            if (current === undefined) {
                const reason = place.failure()

                return reason === undefined
                    ? {
                          code: "…",
                          area: "Finding the nearest postcode",
                          // Holds the line: an empty string would collapse it.
                          note: " ",
                      }
                    : {
                          code: "—",
                          area: "Could not look this point up",
                          note: reason,
                      }
            }

            if (current.kind === "outside_coverage") {
                return {
                    code: "—",
                    area: "Outside UK postcode coverage",
                    note: "postcodes.io covers the United Kingdom only.",
                }
            }

            return {
                code: current.postcode,
                area:
                    current.parish === undefined
                        ? `${current.ward}, ${current.district}`
                        : `${current.ward}, ${current.district} · ${current.parish}`,
                note: `Nearest postcode centre is ${current.metres_away} m away.`,
            }
        }
    )

    const band = createMemo(() => {
        const aqi = air.value()?.european_aqi

        return aqi === undefined ? undefined : aqi_band(aqi)
    })

    // Pollen is modelled for Europe only, so the row is dropped rather than
    // shown as a pair of dashes everywhere else in the world.
    const has_pollen = createMemo(() => {
        const current = air.value()

        return (
            current?.grass_pollen !== undefined ||
            current?.tree_pollen !== undefined
        )
    })

    return (
        // The floor is the map island's own height, so the two columns line up
        // at desktop and — more to the point — the panel does not grow from one
        // line to full height on first load and shove the page down with it.
        <section class="min-h-[32rem] rounded-lg border border-border bg-card">
            <p class="border-b border-border px-5 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Astro island 2 · derived from the marker
            </p>

            <div class="space-y-6 p-5">
                {/* Place ------------------------------------------------ */}
                {/* Each line truncates rather than wrapping, so a long ward
                    and parish cannot turn three lines into four. */}
                <div
                    class="transition-opacity duration-200"
                    style={{ opacity: place.is_waiting() ? 0.45 : 1 }}
                >
                    <p class="truncate font-mono text-sm font-semibold text-card-foreground">
                        {place_lines().code}
                    </p>
                    <p class="mt-1 truncate text-sm text-muted-foreground">
                        {place_lines().area}
                    </p>
                    <p class="mt-1 truncate text-xs text-muted-foreground">
                        {place_lines().note}
                    </p>
                </div>

                {/* Forecast --------------------------------------------- */}
                <Show
                    when={weather.value()}
                    fallback={
                        <p class="text-sm text-muted-foreground">
                            {weather.failure() ?? "Reading the forecast…"}
                        </p>
                    }
                >
                    {(forecast) => (
                        <div
                            class="transition-opacity duration-200"
                            style={{
                                opacity: weather.is_waiting() ? 0.45 : 1,
                            }}
                        >
                            <div class="text-center">
                                <div class="text-5xl font-semibold tabular-nums text-primary">
                                    {forecast().current.temperature}°C
                                </div>
                                <div class="mt-1 text-lg text-muted-foreground">
                                    {forecast().current.description}
                                </div>
                                <div class="mt-1 text-xs text-muted-foreground">
                                    Feels like {forecast().current.feels_like}°C
                                    · High {forecast().today.high}° / Low{" "}
                                    {forecast().today.low}°
                                </div>
                            </div>

                            <div class="mt-5 grid grid-cols-3 gap-2">
                                <Stat
                                    label="Wind"
                                    value={`${forecast().current.wind_speed} ${forecast().current.wind_compass}`}
                                />
                                <Stat
                                    label="Gusts"
                                    value={`${forecast().current.wind_gusts} mph`}
                                />
                                <Stat
                                    label="Humidity"
                                    value={`${forecast().current.humidity}%`}
                                />
                                <Stat
                                    label="Cloud"
                                    value={`${forecast().current.cloud_cover}%`}
                                />
                                <Stat
                                    label="Pressure"
                                    value={`${forecast().current.pressure} hPa`}
                                />
                                <Stat
                                    label="Rain"
                                    value={`${forecast().current.precipitation} mm`}
                                />
                            </div>

                            <div class="mt-2 grid grid-cols-2 gap-2">
                                <Stat
                                    label="Sunrise"
                                    value={forecast().today.sunrise}
                                />
                                <Stat
                                    label="Sunset"
                                    value={forecast().today.sunset}
                                />
                            </div>
                        </div>
                    )}
                </Show>

                {/* Air quality ------------------------------------------ */}
                <div class="border-t border-border pt-5">
                    <p class={section_label_class}>Air quality</p>

                    <Show
                        when={air.value()}
                        fallback={
                            <p class="mt-2 text-sm text-muted-foreground">
                                {air.failure() ?? "Reading the air…"}
                            </p>
                        }
                    >
                        {(current) => (
                            <div
                                class="mt-3 transition-opacity duration-200"
                                style={{ opacity: air.is_waiting() ? 0.45 : 1 }}
                            >
                                <Show when={band()}>
                                    {(current_band) => (
                                        <div
                                            class={`rounded-lg border p-3 text-center ${band_class(current_band().tone)}`}
                                        >
                                            <div class="text-2xl font-semibold tabular-nums text-foreground">
                                                {current().european_aqi}
                                            </div>
                                            <div class="mt-0.5 text-xs text-muted-foreground">
                                                European AQI ·{" "}
                                                {current_band().label}
                                            </div>
                                        </div>
                                    )}
                                </Show>

                                <div class="mt-2 grid grid-cols-3 gap-2">
                                    <Reading
                                        label="PM2.5"
                                        value={current().pm2_5}
                                        unit=" µg"
                                    />
                                    <Reading
                                        label="PM10"
                                        value={current().pm10}
                                        unit=" µg"
                                    />
                                    <Reading
                                        label="UV now"
                                        value={current().uv_index}
                                        unit=""
                                    />
                                </div>

                                <Show when={has_pollen()}>
                                    <div class="mt-2 grid grid-cols-2 gap-2">
                                        <Reading
                                            label="Grass pollen"
                                            value={current().grass_pollen}
                                            unit=""
                                        />
                                        <Reading
                                            label="Tree pollen"
                                            value={current().tree_pollen}
                                            unit=""
                                        />
                                    </div>
                                </Show>
                            </div>
                        )}
                    </Show>
                </div>

                {/* Elevation and timezone arrive in the forecast response
                    whether asked for or not, so they cost nothing to show. */}
                <Show when={weather.value()}>
                    {(forecast) => (
                        <p class="text-center text-xs text-muted-foreground">
                            {forecast().elevation_metres} m above sea level ·{" "}
                            {forecast().timezone}
                        </p>
                    )}
                </Show>
            </div>
        </section>
    )
}

const WeatherIsland = (): JSX.Element => (
    <RegistryContext.Provider value={weather_map_registry}>
        <WeatherIslandContent />
    </RegistryContext.Provider>
)

export default WeatherIsland

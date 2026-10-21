/// <reference lib="dom" />

type WeatherReading = Readonly<{
    temperature: number
    humidity: number
    wind_speed: number
    weather_code: number
}>

const weather_description = (code: number): string => {
    if (code === 0) return "Clear sky"
    if ([1, 2, 3].includes(code)) return "Partly cloudy"
    if ([45, 48].includes(code)) return "Foggy"
    if ([51, 53, 55].includes(code)) return "Drizzle"
    if ([61, 63, 65].includes(code)) return "Rain"
    if ([66, 67].includes(code)) return "Freezing rain"
    if ([71, 73, 75, 77].includes(code)) return "Snow"
    if ([80, 81, 82].includes(code)) return "Rain showers"
    if ([85, 86].includes(code)) return "Snow showers"
    if ([95, 96, 99].includes(code)) return "Thunderstorm"
    return "Unknown"
}

const coordinates = (
    root: HTMLElement
): Readonly<{ latitude: number; longitude: number }> | undefined => {
    const latitude = globalThis.Number(root.dataset.eventLatitude)
    const longitude = globalThis.Number(root.dataset.eventLongitude)
    return globalThis.Number.isFinite(latitude) &&
        globalThis.Number.isFinite(longitude)
        ? { latitude, longitude }
        : undefined
}

const mapbox_token = (): string =>
    document
        .querySelector<HTMLMetaElement>('meta[name="urm-mapbox-access-token"]')
        ?.content.trim() ?? ""

const set_text = (root: HTMLElement, selector: string, value: string): void => {
    const element = root.querySelector<HTMLElement>(selector)
    if (element !== null) element.textContent = value
}

const decode_weather = (value: unknown): WeatherReading | undefined => {
    if (typeof value !== "object" || value === null || !("current" in value))
        return undefined
    const current = value.current
    if (
        typeof current !== "object" ||
        current === null ||
        !("temperature_2m" in current) ||
        !("relative_humidity_2m" in current) ||
        !("wind_speed_10m" in current) ||
        !("weather_code" in current) ||
        typeof current.temperature_2m !== "number" ||
        typeof current.relative_humidity_2m !== "number" ||
        typeof current.wind_speed_10m !== "number" ||
        typeof current.weather_code !== "number"
    )
        return undefined

    return {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        wind_speed: current.wind_speed_10m,
        weather_code: current.weather_code,
    }
}

const enhance_map = (root: HTMLElement): void => {
    const host = root.querySelector<HTMLElement>("[data-event-map]")
    const status = root.querySelector<HTMLElement>("[data-event-map-status]")
    const point = coordinates(root)
    const token = mapbox_token()
    if (host === null || status === null || point === undefined || token === "")
        return

    import("./event-map.client.ts")
        .then(({ mount_event_map }) => {
            mount_event_map(host, token, point.longitude, point.latitude)
        })
        .catch(() => {
            host.hidden = true
            status.classList.remove("site-visually-hidden")
            status.textContent =
                "The interactive map is unavailable. Reload the page to try again."
        })
}

const enhance_weather = (root: HTMLElement): void => {
    const button = root.querySelector<HTMLButtonElement>(
        "[data-event-weather-button]"
    )
    const status = root.querySelector<HTMLElement>(
        "[data-event-weather-status]"
    )
    const reading = root.querySelector<HTMLElement>(
        "[data-event-weather-reading]"
    )
    const point = coordinates(root)
    if (
        button === null ||
        status === null ||
        reading === null ||
        point === undefined
    )
        return

    button.hidden = false
    button.addEventListener("click", () => {
        button.disabled = true
        status.textContent = "Checking current weather…"
        const url = new URL("https://api.open-meteo.com/v1/forecast")
        url.searchParams.set("latitude", globalThis.String(point.latitude))
        url.searchParams.set("longitude", globalThis.String(point.longitude))
        url.searchParams.set(
            "current",
            "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
        )
        url.searchParams.set("temperature_unit", "celsius")
        url.searchParams.set("wind_speed_unit", "mph")

        fetch(url)
            .then((response) => {
                if (!response.ok) throw new Error("Weather request failed")
                return response.json()
            })
            .then((value: unknown) => {
                const weather = decode_weather(value)
                if (weather === undefined)
                    throw new Error("Weather response was invalid")
                set_text(
                    root,
                    "[data-weather-description]",
                    weather_description(weather.weather_code)
                )
                set_text(
                    root,
                    "[data-weather-temperature]",
                    `${Math.round(weather.temperature)}°C`
                )
                set_text(
                    root,
                    "[data-weather-humidity]",
                    `${Math.round(weather.humidity)}%`
                )
                set_text(
                    root,
                    "[data-weather-wind]",
                    `${Math.round(weather.wind_speed)} mph`
                )
                reading.hidden = false
                status.textContent = "Current weather loaded."
            })
            .catch(() => {
                status.textContent = "Current weather is unavailable."
            })
            .finally(() => {
                button.disabled = false
                button.textContent = "Refresh current weather"
            })
    })
}

document
    .querySelectorAll<HTMLElement>("[data-event-enhancements]")
    .forEach((root) => {
        enhance_map(root)
        enhance_weather(root)
    })

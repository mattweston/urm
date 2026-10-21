import { describe, expect, it } from "vitest"

import {
    EventWeatherFailed,
    EventWeatherLoaded,
    EventsLoaded,
    RequestedEventWeather,
} from "../src/events/platform/app.message.ts"
import { init, update } from "../src/events/platform/app.update.ts"
import { Event } from "../src/events/platform/events.data.ts"
import { EventWeather } from "../src/events/platform/event-weather.model.ts"

const event = Event.make({
    id: "event-1",
    title: "Event",
    description: "",
    date: 0,
    start_time: "12:00",
    end_time: "",
    venue_name: "Venue",
    venue_url: "",
    latitude: "51.75",
    longitude: "-2.22",
    tickets_url: "",
    image_url: "",
    published: true,
    updated_at: 0,
})

describe("event weather", () => {
    it("loads coordinate weather only after it is requested", () => {
        const [detailModel] = init("/events/event-1/")
        const [readyModel, initialCommands] = update(
            detailModel,
            EventsLoaded({ events: [event] })
        )

        expect(readyModel.eventWeather._tag).toBe("Idle")
        expect(initialCommands).toHaveLength(0)

        const [loadingModel, commands] = update(
            readyModel,
            RequestedEventWeather({ eventId: event.id })
        )

        expect(loadingModel.eventWeather._tag).toBe("Loading")
        expect(commands).toHaveLength(1)

        const [listModel] = init("/events/")
        const [unchangedListModel, listCommands] = update(
            listModel,
            EventsLoaded({ events: [event] })
        )

        expect(unchangedListModel.eventWeather._tag).toBe("Idle")
        expect(listCommands).toHaveLength(0)

        const [ignoredListModel, ignoredCommands] = update(
            unchangedListModel,
            RequestedEventWeather({ eventId: event.id })
        )

        expect(ignoredListModel.eventWeather._tag).toBe("Idle")
        expect(ignoredCommands).toHaveLength(0)
    })

    it("stores weather only while its event is still selected", () => {
        const [model] = init("/events/event-1/")
        const [readyModel] = update(model, EventsLoaded({ events: [event] }))
        const [loadedModel] = update(
            readyModel,
            EventWeatherLoaded({
                eventId: event.id,
                weather: EventWeather.make({
                    temperature: 18,
                    description: "Partly cloudy",
                    humidity: 70,
                    wind_speed: 8,
                    updated_at: 1_000,
                }),
            })
        )

        expect(loadedModel.eventWeather._tag).toBe("Success")

        const [refreshingModel, refreshCommands] = update(
            loadedModel,
            RequestedEventWeather({ eventId: event.id })
        )

        expect(refreshingModel.eventWeather._tag).toBe("Refreshing")
        expect(refreshCommands).toHaveLength(1)

        const [stillRefreshingModel, duplicateCommands] = update(
            refreshingModel,
            RequestedEventWeather({ eventId: event.id })
        )

        expect(stillRefreshingModel).toBe(refreshingModel)
        expect(duplicateCommands).toHaveLength(0)

        const [staleModel] = update(
            refreshingModel,
            EventWeatherFailed({
                eventId: event.id,
                error: "Current weather is unavailable.",
            })
        )

        expect(staleModel.eventWeather).toEqual({
            _tag: "Stale",
            error: "Current weather is unavailable.",
            data: {
                temperature: 18,
                description: "Partly cloudy",
                humidity: 70,
                wind_speed: 8,
                updated_at: 1_000,
            },
        })

        const [ignoredModel] = update(
            readyModel,
            EventWeatherLoaded({
                eventId: "another-event",
                weather: EventWeather.make({
                    temperature: 12,
                    description: "Rain",
                    humidity: 90,
                    wind_speed: 14,
                    updated_at: 2_000,
                }),
            })
        )

        expect(ignoredModel.eventWeather._tag).toBe("Idle")
    })
})

import { describe, expect, it } from "vitest"
import {
    indexHref,
    isAppScope,
    urlToAppRoute,
    weatherMapHref,
} from "./route.ts"

describe("map labs routes", () => {
    it("round-trips the index route", () => {
        expect(urlToAppRoute(indexHref())).toEqual({ _tag: "Index" })
    })

    it("round-trips a demo route", () => {
        expect(urlToAppRoute(weatherMapHref())).toEqual({ _tag: "WeatherMap" })
    })

    it("falls through to NotFound outside the app", () => {
        expect(urlToAppRoute("/events/map/nope")).toEqual({
            _tag: "NotFound",
            path: "/events/map/nope",
        })
    })

    it("no longer claims the YouTube embed path", () => {
        expect(isAppScope("/media/youtube-embed")).toBe(false)
    })
})

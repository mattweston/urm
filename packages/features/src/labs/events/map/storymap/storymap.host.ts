import { Function, Option } from "effect"
import type { Map as MapInstance, Marker } from "mapbox-gl"
import type { RouteGroupId } from "../interactive-map/interactive-map.studio.ts"
import { CHAPTER_ROOT_MARGIN } from "./storymap.constant.ts"

export type MarkerEntry = Readonly<{
    studioId: string
    areaId: RouteGroupId
    marker: Marker
}>

// The story map and the inset globe, both built imperatively by the Mount and
// reached from Commands afterwards.
type MapEntry = Readonly<{
    map: MapInstance
    inset: Option.Option<{ map: MapInstance; marker: Marker }>
}>

const entriesByHostId = new Map<string, MapEntry>()

// Every studio's pin, built once and then shown an area at a time: a chapter
// puts its own valley's studios on the map and takes the previous one's off.
const markersByHostId = new Map<string, ReadonlyArray<MarkerEntry>>()
const shownStudioIdsByHostId = new Map<string, Set<string>>()

// Set by the subscription, called by the observer the story Mount installs.
type ChapterHandler = (chapterId: string) => void

const chapterHandlersByHostId = new Map<string, ChapterHandler>()
const observersByHostId = new Map<string, IntersectionObserver>()

export const HOST_ID = "storymap-host"

export const setEntry = (hostId: string, entry: MapEntry): void => {
    entriesByHostId.set(hostId, entry)
}

export const getEntry = (hostId: string): Option.Option<MapEntry> =>
    Option.fromNullishOr(entriesByHostId.get(hostId))

export const setMarkers = (
    hostId: string,
    entries: ReadonlyArray<MarkerEntry>
): void => {
    markersByHostId.set(hostId, entries)
    shownStudioIdsByHostId.set(hostId, new Set())
}

// Only the pins that actually change are touched: re-adding a marker already on
// the map detaches and reattaches its element, which would flicker the whole
// valley on every scroll tick.
export const showMarkersForArea = (
    hostId: string,
    areaId: RouteGroupId
): void =>
    Option.match(getEntry(hostId), {
        onNone: Function.constVoid,
        onSome: ({ map }) => {
            const entries = markersByHostId.get(hostId) ?? []
            const shownStudioIds =
                shownStudioIdsByHostId.get(hostId) ?? new Set<string>()

            entries.forEach((entry) => {
                const shouldShow = entry.areaId === areaId
                const isShown = shownStudioIds.has(entry.studioId)

                if (shouldShow && !isShown) {
                    entry.marker.addTo(map)
                    shownStudioIds.add(entry.studioId)
                    return
                }

                if (!shouldShow && isShown) {
                    entry.marker.remove()
                    shownStudioIds.delete(entry.studioId)
                }
            })

            shownStudioIdsByHostId.set(hostId, shownStudioIds)
        },
    })

export const setChapterHandler = (
    hostId: string,
    handler: ChapterHandler
): void => {
    chapterHandlersByHostId.set(hostId, handler)
}

export const clearChapterHandler = (hostId: string): void => {
    chapterHandlersByHostId.delete(hostId)
}

// One observer over the chapter elements, watching a zero-height band across
// the middle of the viewport. Whichever chapter last crossed it is the active
// one, which is what makes scrolling back up work as well as scrolling down.
//
// Each chapter registers itself as it mounts rather than the container querying
// for them: the container mounts before its children are reliably in the DOM,
// so a query there caught only whichever sections happened to exist and left
// the rest permanently inactive.
const ensureObserver = (hostId: string): IntersectionObserver => {
    const existing = observersByHostId.get(hostId)

    if (existing !== undefined) {
        return existing
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return
                }

                const chapterId =
                    entry.target instanceof HTMLElement
                        ? entry.target.dataset["chapterId"]
                        : undefined

                if (chapterId !== undefined) {
                    chapterHandlersByHostId.get(hostId)?.(chapterId)
                }
            })
        },
        { rootMargin: CHAPTER_ROOT_MARGIN, threshold: 0 }
    )

    observersByHostId.set(hostId, observer)

    return observer
}

export const observeChapterElement = (
    hostId: string,
    element: Element
): void => {
    ensureObserver(hostId).observe(element)
}

export const unobserveChapterElement = (
    hostId: string,
    element: Element
): void =>
    Option.match(Option.fromNullishOr(observersByHostId.get(hostId)), {
        onNone: Function.constVoid,
        onSome: (observer) => observer.unobserve(element),
    })

export const disconnectObserver = (hostId: string): void =>
    Option.match(Option.fromNullishOr(observersByHostId.get(hostId)), {
        onNone: Function.constVoid,
        onSome: (observer) => {
            observer.disconnect()
            observersByHostId.delete(hostId)
        },
    })

export const removeEntry = (hostId: string): void =>
    Option.match(getEntry(hostId), {
        onNone: Function.constVoid,
        onSome: ({ map, inset }) => {
            ;(markersByHostId.get(hostId) ?? []).forEach(({ marker }) =>
                marker.remove()
            )
            markersByHostId.delete(hostId)
            shownStudioIdsByHostId.delete(hostId)
            Option.match(inset, {
                onNone: Function.constVoid,
                onSome: ({ map: insetMap }) => insetMap.remove(),
            })
            map.remove()
            entriesByHostId.delete(hostId)
            chapterHandlersByHostId.delete(hostId)
            disconnectObserver(hostId)
        },
    })

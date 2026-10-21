// The five valleys around Stroud, told as a scroll-driven tour of the open
// studios trail. Ported from apps/docs/storymap.html, which embedded the
// GeoLibre viewer in an iframe and posted a project JSON into it; the chapter
// shape is the Mapbox Storytelling template's, which GeoLibre forked.
//
// Geography comes from the interactive-map demo rather than being copied here,
// so the two demos cannot drift apart: adding a studio there changes the count
// shown by a chapter here. This module owns only the narrative — camera, prose
// and running order.

import { Array, Option, Schema as S } from "effect"
import {
    RouteGroupId,
    routeGroups,
} from "../interactive-map/interactive-map.studio.ts"

export const ChapterAlignment = S.Literals(["left", "right", "center", "full"])

export type ChapterAlignment = typeof ChapterAlignment.Type

// easeTo is added to the template's two. flyTo arcs the camera out and back to
// cover distance, which is right between continents and wrong between valleys a
// few kilometres apart — there it reads as a lurch away from the subject.
export const MapAnimation = S.Literals(["flyTo", "easeTo", "jumpTo"])

export type MapAnimation = typeof MapAnimation.Type

export const CameraPosition = S.Struct({
    lng: S.Number,
    lat: S.Number,
    zoom: S.Number,
    pitch: S.Number,
    bearing: S.Number,
})

export type CameraPosition = typeof CameraPosition.Type

export const Chapter = S.Struct({
    id: RouteGroupId,
    title: S.String,
    color: S.String,
    paragraphs: S.Array(S.String),
    imageUrl: S.String,
    alignment: ChapterAlignment,
    location: CameraPosition,
    mapAnimation: MapAnimation,
    // The template's slow 180° turn once the camera settles. Off everywhere
    // here: each valley's bearing is chosen to look along its axis, so turning
    // away from it undoes the framing — and whether any of it is seen depends
    // on how fast the chapter is read, since the next move interrupts it.
    rotateAnimation: S.Boolean,
})

export type Chapter = typeof Chapter.Type

export const storyTitle = "The Five Valleys"
export const storySubtitle =
    "Open studios in Stroud and the five valleys that run out from it. Scroll to travel."
export const storyByline = "Built with Foldkit"

// Stroud opens the story: it is not a valley itself but the point all five
// meet, so the tour starts in the middle and works outwards — north up Slad,
// east to Bisley, south down the Golden Valley, then west through Nailsworth
// and back along the vale.
type Narrative = Readonly<{
    paragraphs: ReadonlyArray<string>
    alignment: ChapterAlignment
    zoom: number
    pitch: number
    bearing: number
    rotateAnimation: boolean
}>

const narrative: Readonly<Partial<Record<RouteGroupId, Narrative>>> = {
    "town-centre": {
        paragraphs: [
            "Stroud sits where the five valleys meet. John St Studios, Weven and Cacao Circle are within a few minutes of each other, with High St a short walk on.",
            "Every valley on this trail runs out from here, so it is the place to start and the easiest place to come back to.",
        ],
        alignment: "center",
        zoom: 13.6,
        pitch: 55,
        bearing: 0,
        rotateAnimation: false,
    },
    slad: {
        paragraphs: [
            "North-east out of town, the Slad valley climbs from Lansdown Hall through Stroud Pottery and the studios clustered around Jack Duplock, then out past Hawkwood towards The Camp.",
            "It is the longest leg of the trail, and the one that most rewards a whole afternoon.",
        ],
        alignment: "left",
        zoom: 12.2,
        pitch: 62,
        bearing: 20,
        rotateAnimation: false,
    },
    bisley: {
        paragraphs: [
            "East of Stroud the ground rises towards Bisley. Piccadilly Mill sits at the bottom of the hill, with Lower St and the studios along Horns Road strung out above it.",
            "Robert Garland's studio marks the far end, well clear of the town.",
        ],
        alignment: "right",
        zoom: 12,
        pitch: 58,
        bearing: 330,
        rotateAnimation: false,
    },
    "golden-valley": {
        paragraphs: [
            "The Golden Valley runs south-east along the canal and the old mills. Griffin Mill and Victoria Works are working buildings that still hold studios.",
            "Follow it far enough and it reaches Sarah Maingot's studio near Chalford.",
        ],
        alignment: "left",
        zoom: 12,
        pitch: 60,
        bearing: 70,
        rotateAnimation: false,
    },
    nailsworth: {
        paragraphs: [
            "South of Stroud the Nailsworth valley gathers the largest group outside the town — Frogmarsh Mill, Article Studio, The Hide and The Nutshell among them.",
            "Bath Road sits at the top of the valley, Three Storeys at the bottom.",
        ],
        alignment: "center",
        zoom: 11.9,
        pitch: 55,
        bearing: 340,
        rotateAnimation: false,
    },
    vale: {
        paragraphs: [
            "West of town the ground opens out towards the vale. Only two studios here: the Museum in the Park, and Studio Tuft further out.",
            "A short chapter, and the easiest way to end a day on the trail.",
        ],
        alignment: "full",
        zoom: 11.8,
        pitch: 50,
        bearing: 300,
        rotateAnimation: false,
    },
}

const chapterOrder: ReadonlyArray<RouteGroupId> = [
    "town-centre",
    "slad",
    "bisley",
    "golden-valley",
    "nailsworth",
    "vale",
]

export const chapters: ReadonlyArray<Chapter> = chapterOrder.flatMap(
    (areaId): ReadonlyArray<Chapter> => {
        const maybeArea = Array.findFirst(
            routeGroups,
            (group) => group.id === areaId
        )
        const entry = narrative[areaId]

        if (Option.isNone(maybeArea) || entry === undefined) {
            return []
        }

        const area = maybeArea.value

        return [
            {
                id: area.id,
                title: area.name,
                color: area.color,
                paragraphs: entry.paragraphs,
                imageUrl: `https://picsum.photos/seed/five-valleys-${area.id}/960/540`,
                alignment: entry.alignment,
                location: {
                    lng: area.lng,
                    lat: area.lat,
                    zoom: entry.zoom,
                    pitch: entry.pitch,
                    bearing: entry.bearing,
                },
                mapAnimation: "easeTo" as const,
                rotateAnimation: entry.rotateAnimation,
            },
        ]
    }
)

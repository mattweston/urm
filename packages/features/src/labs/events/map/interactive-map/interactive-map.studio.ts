// Ported from the vanilla app's data/waypoints.js, data/studio-markers.js and
// data/layers-to-match.js. There, a studio's identity was its display title,
// used at once as the marker label, the map layer id, the cookie name and the
// checkbox value — so renaming one meant renaming all four. Here `id` is the
// identity and `name` is only ever shown.

import { Schema as S } from "effect"
import { MAX_ROUTE_STUDIOS } from "./interactive-map.constant.ts"

export const RouteGroupId = S.Literals([
    "town-centre",
    "nailsworth",
    "vale",
    "slad",
    "bisley",
    "golden-valley",
])

export type RouteGroupId = typeof RouteGroupId.Type

export const RouteGroup = S.Struct({
    id: RouteGroupId,
    name: S.String,
    color: S.String,
    // Where the group's label sits on the map, which is a point in the middle of
    // the cluster rather than any one studio.
    lng: S.Number,
    lat: S.Number,
})

export type RouteGroup = typeof RouteGroup.Type

// The fields the printed directory and the My Maps version carry per studio.
// All optional: the vanilla app's data/popup-info/*.js held nothing but a title
// and a checkbox, so a studio ported from it has none of them, and the details
// panel shows only what is actually there.
export const Studio = S.Struct({
    id: S.String,
    name: S.String,
    routeGroupId: RouteGroupId,
    lng: S.Number,
    lat: S.Number,
    email: S.optionalKey(S.String),
    phone: S.optionalKey(S.String),
    address: S.optionalKey(S.String),
    directions: S.optionalKey(S.String),
    website: S.optionalKey(S.String),
    socialMedia: S.optionalKey(S.String),
    directoryText: S.optionalKey(S.String),
    profileImage: S.optionalKey(S.String),
    images: S.optionalKey(S.Array(S.String)),
})

export type Studio = typeof Studio.Type

export const routeGroups: ReadonlyArray<RouteGroup> = [
    {
        id: "town-centre",
        name: "Stroud",
        color: "#f84d4d",
        lng: -2.22,
        lat: 51.745,
    },
    {
        id: "nailsworth",
        name: "Nailsworth Valley",
        color: "#4264fb",
        lng: -2.25,
        lat: 51.726,
    },
    {
        id: "vale",
        name: "Valley and Vale",
        color: "#40546a",
        lng: -2.268437,
        lat: 51.768535,
    },
    {
        id: "slad",
        name: "Slad Valley",
        color: "#f79640",
        lng: -2.198,
        lat: 51.772,
    },
    {
        id: "bisley",
        name: "Bisley",
        color: "#7753eb",
        lng: -2.16,
        lat: 51.755,
    },
    {
        id: "golden-valley",
        name: "Golden Valley",
        color: "#207a4b",
        lng: -2.185,
        lat: 51.728,
    },
]

export const studios: ReadonlyArray<Studio> = [
    {
        id: "john-st-studios",
        name: "John St Studios",
        routeGroupId: "town-centre",
        lng: -2.2167788,
        lat: 51.7445037,
        email: "hello@john-st-studios.example.com",
        phone: "07700 900000",
        address: "1 Example Street, Stroud, GL5 1AA",
        directions: "In the town centre, a short walk from the bus station.",
        website: "www.john-st-studios.example.com",
        socialMedia: "@john_st_studios",
        directoryText:
            "Exhibition of recent drawing, sculpture, text and textile works.",
        profileImage:
            "https://picsum.photos/seed/john-st-studios-portrait/160/160",
        images: [
            "https://picsum.photos/seed/john-st-studios-1/640/400",
            "https://picsum.photos/seed/john-st-studios-2/640/400",
            "https://picsum.photos/seed/john-st-studios-3/640/400",
        ],
    },
    {
        id: "weven",
        name: "Weven",
        routeGroupId: "town-centre",
        lng: -2.21798684,
        lat: 51.74506395,
        email: "hello@weven.example.com",
        phone: "07700 900001",
        address: "2 Example Street, Stroud, GL5 2AA",
        directions: "In the town centre, a short walk from the bus station.",
        website: "www.weven.example.com",
        socialMedia: "@weven",
        directoryText:
            "New paintings and works on paper, with prints available.",
        profileImage: "https://picsum.photos/seed/weven-portrait/160/160",
        images: [
            "https://picsum.photos/seed/weven-1/640/400",
            "https://picsum.photos/seed/weven-2/640/400",
            "https://picsum.photos/seed/weven-3/640/400",
        ],
    },
    {
        id: "cacao-circle",
        name: "Cacao Circle",
        routeGroupId: "town-centre",
        lng: -2.2170453,
        lat: 51.7451129,
        email: "hello@cacao-circle.example.com",
        phone: "07700 900002",
        address: "3 Example Street, Stroud, GL5 3AA",
        directions: "In the town centre, a short walk from the bus station.",
        website: "www.cacao-circle.example.com",
        socialMedia: "@cacao_circle",
        directoryText: "Ceramics and slipware thrown and fired on site.",
        profileImage:
            "https://picsum.photos/seed/cacao-circle-portrait/160/160",
        images: [
            "https://picsum.photos/seed/cacao-circle-1/640/400",
            "https://picsum.photos/seed/cacao-circle-2/640/400",
            "https://picsum.photos/seed/cacao-circle-3/640/400",
        ],
    },
    {
        id: "high-st",
        name: "High St",
        routeGroupId: "town-centre",
        lng: -2.21523121,
        lat: 51.7451931,
        email: "hello@high-st.example.com",
        phone: "07700 900003",
        address: "4 Example Street, Stroud, GL5 4AA",
        directions: "In the town centre, a short walk from the bus station.",
        website: "www.high-st.example.com",
        socialMedia: "@high_st",
        directoryText:
            "Printmaking studio open for demonstrations through the weekend.",
        profileImage: "https://picsum.photos/seed/high-st-portrait/160/160",
        images: [
            "https://picsum.photos/seed/high-st-1/640/400",
            "https://picsum.photos/seed/high-st-2/640/400",
            "https://picsum.photos/seed/high-st-3/640/400",
        ],
    },
    {
        id: "bath-road",
        name: "Bath Road",
        routeGroupId: "nailsworth",
        lng: -2.2306,
        lat: 51.73928,
        email: "hello@bath-road.example.com",
        phone: "07700 900004",
        address: "5 Example Street, Nailsworth, GL5 5AA",
        directions: "Off the A46 south of Stroud; parking on site.",
        website: "www.bath-road.example.com",
        socialMedia: "@bath_road",
        directoryText:
            "Mixed show of photography, collage and experimental film.",
        profileImage: "https://picsum.photos/seed/bath-road-portrait/160/160",
        images: [
            "https://picsum.photos/seed/bath-road-1/640/400",
            "https://picsum.photos/seed/bath-road-2/640/400",
            "https://picsum.photos/seed/bath-road-3/640/400",
        ],
    },
    {
        id: "morven-st-chloe",
        name: "Morven St Chloe",
        routeGroupId: "nailsworth",
        lng: -2.2185467,
        lat: 51.7101307,
        email: "hello@morven-st-chloe.example.com",
        phone: "07700 900005",
        address: "6 Example Street, Nailsworth, GL5 6AA",
        directions: "Off the A46 south of Stroud; parking on site.",
        website: "www.morven-st-chloe.example.com",
        socialMedia: "@morven_st_chloe",
        directoryText:
            "Furniture and woodwork, with the workshop open to visitors.",
        profileImage:
            "https://picsum.photos/seed/morven-st-chloe-portrait/160/160",
        images: [
            "https://picsum.photos/seed/morven-st-chloe-1/640/400",
            "https://picsum.photos/seed/morven-st-chloe-2/640/400",
            "https://picsum.photos/seed/morven-st-chloe-3/640/400",
        ],
    },
    {
        id: "frogmarsh-mill",
        name: "Frogmarsh Mill",
        routeGroupId: "nailsworth",
        lng: -2.2325759,
        lat: 51.7154552,
        email: "hello@frogmarsh-mill.example.com",
        phone: "07700 900006",
        address: "7 Example Street, Nailsworth, GL5 7AA",
        directions: "Off the A46 south of Stroud; parking on site.",
        website: "www.frogmarsh-mill.example.com",
        socialMedia: "@frogmarsh_mill",
        directoryText:
            "Jewellery and small metalwork, plus a bench demonstration.",
        profileImage:
            "https://picsum.photos/seed/frogmarsh-mill-portrait/160/160",
        images: [
            "https://picsum.photos/seed/frogmarsh-mill-1/640/400",
            "https://picsum.photos/seed/frogmarsh-mill-2/640/400",
            "https://picsum.photos/seed/frogmarsh-mill-3/640/400",
        ],
    },
    {
        id: "article-studio",
        name: "Article Studio",
        routeGroupId: "nailsworth",
        lng: -2.2279565,
        lat: 51.7085009,
        email: "hello@article-studio.example.com",
        phone: "07700 900007",
        address: "8 Example Street, Nailsworth, GL5 8AA",
        directions: "Off the A46 south of Stroud; parking on site.",
        website: "www.article-studio.example.com",
        socialMedia: "@article_studio",
        directoryText: "Weaving, dyeing and stitched textile pieces.",
        profileImage:
            "https://picsum.photos/seed/article-studio-portrait/160/160",
        images: [
            "https://picsum.photos/seed/article-studio-1/640/400",
            "https://picsum.photos/seed/article-studio-2/640/400",
            "https://picsum.photos/seed/article-studio-3/640/400",
        ],
    },
    {
        id: "the-hide",
        name: "The Hide",
        routeGroupId: "nailsworth",
        lng: -2.2190762,
        lat: 51.7071444,
        email: "hello@the-hide.example.com",
        phone: "07700 900008",
        address: "9 Example Street, Nailsworth, GL5 9AA",
        directions: "Off the A46 south of Stroud; parking on site.",
        website: "www.the-hide.example.com",
        socialMedia: "@the_hide",
        directoryText:
            "Exhibition of recent drawing, sculpture, text and textile works.",
        profileImage: "https://picsum.photos/seed/the-hide-portrait/160/160",
        images: [
            "https://picsum.photos/seed/the-hide-1/640/400",
            "https://picsum.photos/seed/the-hide-2/640/400",
            "https://picsum.photos/seed/the-hide-3/640/400",
        ],
    },
    {
        id: "the-nutshell-studios",
        name: "The Nutshell Studios",
        routeGroupId: "nailsworth",
        lng: -2.2191816,
        lat: 51.695219,
        email: "hello@the-nutshell-studios.example.com",
        phone: "07700 900009",
        address: "10 Example Street, Nailsworth, GL5 1AA",
        directions: "Off the A46 south of Stroud; parking on site.",
        website: "www.the-nutshell-studios.example.com",
        socialMedia: "@the_nutshell_studios",
        directoryText:
            "New paintings and works on paper, with prints available.",
        profileImage:
            "https://picsum.photos/seed/the-nutshell-studios-portrait/160/160",
        images: [
            "https://picsum.photos/seed/the-nutshell-studios-1/640/400",
            "https://picsum.photos/seed/the-nutshell-studios-2/640/400",
            "https://picsum.photos/seed/the-nutshell-studios-3/640/400",
        ],
    },
    {
        id: "three-storeys",
        name: "Three Storeys",
        routeGroupId: "nailsworth",
        lng: -2.22,
        lat: 51.692,
        email: "hello@three-storeys.example.com",
        phone: "07700 900010",
        address: "11 Example Street, Nailsworth, GL5 2AA",
        directions: "Off the A46 south of Stroud; parking on site.",
        website: "www.three-storeys.example.com",
        socialMedia: "@three_storeys",
        directoryText: "Ceramics and slipware thrown and fired on site.",
        profileImage:
            "https://picsum.photos/seed/three-storeys-portrait/160/160",
        images: [
            "https://picsum.photos/seed/three-storeys-1/640/400",
            "https://picsum.photos/seed/three-storeys-2/640/400",
            "https://picsum.photos/seed/three-storeys-3/640/400",
        ],
    },
    {
        id: "museum-in-the-park",
        name: "Museum In The Park",
        routeGroupId: "vale",
        lng: -2.22542,
        lat: 51.7506206,
        email: "hello@museum-in-the-park.example.com",
        phone: "07700 900011",
        address: "12 Example Street, Stroud, GL5 3AA",
        directions:
            "West out of town along the valley road; look for the gate.",
        website: "www.museum-in-the-park.example.com",
        socialMedia: "@museum_in_the_park",
        directoryText:
            "Printmaking studio open for demonstrations through the weekend.",
        profileImage:
            "https://picsum.photos/seed/museum-in-the-park-portrait/160/160",
        images: [
            "https://picsum.photos/seed/museum-in-the-park-1/640/400",
            "https://picsum.photos/seed/museum-in-the-park-2/640/400",
            "https://picsum.photos/seed/museum-in-the-park-3/640/400",
        ],
    },
    {
        id: "studio-tuft",
        name: "Studio Tuft",
        routeGroupId: "vale",
        lng: -2.2809237,
        lat: 51.7460296,
        email: "hello@studio-tuft.example.com",
        phone: "07700 900012",
        address: "13 Example Street, Stroud, GL5 4AA",
        directions:
            "West out of town along the valley road; look for the gate.",
        website: "www.studio-tuft.example.com",
        socialMedia: "@studio_tuft",
        directoryText:
            "Mixed show of photography, collage and experimental film.",
        profileImage: "https://picsum.photos/seed/studio-tuft-portrait/160/160",
        images: [
            "https://picsum.photos/seed/studio-tuft-1/640/400",
            "https://picsum.photos/seed/studio-tuft-2/640/400",
            "https://picsum.photos/seed/studio-tuft-3/640/400",
        ],
    },
    {
        id: "houseworkwork",
        name: "Houseworkwork",
        routeGroupId: "slad",
        lng: -2.21443438,
        lat: 51.7465302,
        email: "hello@houseworkwork.example.com",
        phone: "07700 900013",
        address: "14 Example Street, Slad, GL5 5AA",
        directions: "Up the Slad road; the entrance is signed from the lane.",
        website: "www.houseworkwork.example.com",
        socialMedia: "@houseworkwork",
        directoryText:
            "Furniture and woodwork, with the workshop open to visitors.",
        profileImage:
            "https://picsum.photos/seed/houseworkwork-portrait/160/160",
        images: [
            "https://picsum.photos/seed/houseworkwork-1/640/400",
            "https://picsum.photos/seed/houseworkwork-2/640/400",
            "https://picsum.photos/seed/houseworkwork-3/640/400",
        ],
    },
    {
        id: "lansdown-hall",
        name: "Lansdown Hall",
        routeGroupId: "slad",
        lng: -2.2165839,
        lat: 51.7463608,
        email: "hello@lansdown-hall.example.com",
        phone: "07700 900014",
        address: "15 Example Street, Slad, GL5 6AA",
        directions: "Up the Slad road; the entrance is signed from the lane.",
        website: "www.lansdown-hall.example.com",
        socialMedia: "@lansdown_hall",
        directoryText:
            "Jewellery and small metalwork, plus a bench demonstration.",
        profileImage:
            "https://picsum.photos/seed/lansdown-hall-portrait/160/160",
        images: [
            "https://picsum.photos/seed/lansdown-hall-1/640/400",
            "https://picsum.photos/seed/lansdown-hall-2/640/400",
            "https://picsum.photos/seed/lansdown-hall-3/640/400",
        ],
    },
    {
        id: "jack-duplock",
        name: "Jack Duplock",
        routeGroupId: "slad",
        lng: -2.21457,
        lat: 51.74698,
        email: "hello@jack-duplock.example.com",
        phone: "07700 900015",
        address: "16 Example Street, Slad, GL5 7AA",
        directions: "Up the Slad road; the entrance is signed from the lane.",
        website: "www.jack-duplock.example.com",
        socialMedia: "@jack_duplock",
        directoryText: "Weaving, dyeing and stitched textile pieces.",
        profileImage:
            "https://picsum.photos/seed/jack-duplock-portrait/160/160",
        images: [
            "https://picsum.photos/seed/jack-duplock-1/640/400",
            "https://picsum.photos/seed/jack-duplock-2/640/400",
            "https://picsum.photos/seed/jack-duplock-3/640/400",
        ],
    },
    {
        id: "stroud-pottery",
        name: "Stroud Pottery",
        routeGroupId: "slad",
        lng: -2.2157922,
        lat: 51.7472264,
        email: "hello@stroud-pottery.example.com",
        phone: "07700 900016",
        address: "17 Example Street, Slad, GL5 8AA",
        directions: "Up the Slad road; the entrance is signed from the lane.",
        website: "www.stroud-pottery.example.com",
        socialMedia: "@stroud_pottery",
        directoryText:
            "Exhibition of recent drawing, sculpture, text and textile works.",
        profileImage:
            "https://picsum.photos/seed/stroud-pottery-portrait/160/160",
        images: [
            "https://picsum.photos/seed/stroud-pottery-1/640/400",
            "https://picsum.photos/seed/stroud-pottery-2/640/400",
            "https://picsum.photos/seed/stroud-pottery-3/640/400",
        ],
    },
    {
        id: "may-derbyshire",
        name: "May Derbyshire",
        routeGroupId: "slad",
        lng: -2.214519,
        lat: 51.747221,
        email: "hello@may-derbyshire.example.com",
        phone: "07700 900017",
        address: "18 Example Street, Slad, GL5 9AA",
        directions: "Up the Slad road; the entrance is signed from the lane.",
        website: "www.may-derbyshire.example.com",
        socialMedia: "@may_derbyshire",
        directoryText:
            "New paintings and works on paper, with prints available.",
        profileImage:
            "https://picsum.photos/seed/may-derbyshire-portrait/160/160",
        images: [
            "https://picsum.photos/seed/may-derbyshire-1/640/400",
            "https://picsum.photos/seed/may-derbyshire-2/640/400",
            "https://picsum.photos/seed/may-derbyshire-3/640/400",
        ],
    },
    {
        id: "mark-derbyshire",
        name: "Mark Derbyshire",
        routeGroupId: "slad",
        lng: -2.214591,
        lat: 51.747239,
        email: "hello@mark-derbyshire.example.com",
        phone: "07700 900018",
        address: "19 Example Street, Slad, GL5 1AA",
        directions: "Up the Slad road; the entrance is signed from the lane.",
        website: "www.mark-derbyshire.example.com",
        socialMedia: "@mark_derbyshire",
        directoryText: "Ceramics and slipware thrown and fired on site.",
        profileImage:
            "https://picsum.photos/seed/mark-derbyshire-portrait/160/160",
        images: [
            "https://picsum.photos/seed/mark-derbyshire-1/640/400",
            "https://picsum.photos/seed/mark-derbyshire-2/640/400",
            "https://picsum.photos/seed/mark-derbyshire-3/640/400",
        ],
    },
    {
        id: "lucy-inder",
        name: "Lucy Inder",
        routeGroupId: "slad",
        lng: -2.2165653,
        lat: 51.7487422,
        email: "hello@lucy-inder.example.com",
        phone: "07700 900019",
        address: "20 Example Street, Slad, GL5 2AA",
        directions: "Up the Slad road; the entrance is signed from the lane.",
        website: "www.lucy-inder.example.com",
        socialMedia: "@lucy_inder",
        directoryText:
            "Printmaking studio open for demonstrations through the weekend.",
        profileImage: "https://picsum.photos/seed/lucy-inder-portrait/160/160",
        images: [
            "https://picsum.photos/seed/lucy-inder-1/640/400",
            "https://picsum.photos/seed/lucy-inder-2/640/400",
            "https://picsum.photos/seed/lucy-inder-3/640/400",
        ],
    },
    {
        id: "sam-marsh",
        name: "Sam Marsh",
        routeGroupId: "slad",
        lng: -2.2121959,
        lat: 51.7504326,
        email: "hello@sam-marsh.example.com",
        phone: "07700 900020",
        address: "21 Example Street, Slad, GL5 3AA",
        directions: "Up the Slad road; the entrance is signed from the lane.",
        website: "www.sam-marsh.example.com",
        socialMedia: "@sam_marsh",
        directoryText:
            "Mixed show of photography, collage and experimental film.",
        profileImage: "https://picsum.photos/seed/sam-marsh-portrait/160/160",
        images: [
            "https://picsum.photos/seed/sam-marsh-1/640/400",
            "https://picsum.photos/seed/sam-marsh-2/640/400",
            "https://picsum.photos/seed/sam-marsh-3/640/400",
        ],
    },
    {
        id: "andy-bradley",
        name: "Andy Bradley",
        routeGroupId: "slad",
        lng: -2.20618,
        lat: 51.75065,
        email: "hello@andy-bradley.example.com",
        phone: "07700 900021",
        address: "22 Example Street, Slad, GL5 4AA",
        directions: "Up the Slad road; the entrance is signed from the lane.",
        website: "www.andy-bradley.example.com",
        socialMedia: "@andy_bradley",
        directoryText:
            "Furniture and woodwork, with the workshop open to visitors.",
        profileImage:
            "https://picsum.photos/seed/andy-bradley-portrait/160/160",
        images: [
            "https://picsum.photos/seed/andy-bradley-1/640/400",
            "https://picsum.photos/seed/andy-bradley-2/640/400",
            "https://picsum.photos/seed/andy-bradley-3/640/400",
        ],
    },
    {
        id: "hawkwood",
        name: "Hawkwood",
        routeGroupId: "slad",
        lng: -2.209216,
        lat: 51.757352,
        email: "hello@hawkwood.example.com",
        phone: "07700 900022",
        address: "23 Example Street, Slad, GL5 5AA",
        directions: "Up the Slad road; the entrance is signed from the lane.",
        website: "www.hawkwood.example.com",
        socialMedia: "@hawkwood",
        directoryText:
            "Jewellery and small metalwork, plus a bench demonstration.",
        profileImage: "https://picsum.photos/seed/hawkwood-portrait/160/160",
        images: [
            "https://picsum.photos/seed/hawkwood-1/640/400",
            "https://picsum.photos/seed/hawkwood-2/640/400",
            "https://picsum.photos/seed/hawkwood-3/640/400",
        ],
    },
    {
        id: "the-camp",
        name: "The Camp",
        routeGroupId: "slad",
        lng: -2.1268,
        lat: 51.782792,
        email: "hello@the-camp.example.com",
        phone: "07700 900023",
        address: "24 Example Street, Slad, GL5 6AA",
        directions: "Up the Slad road; the entrance is signed from the lane.",
        website: "www.the-camp.example.com",
        socialMedia: "@the_camp",
        directoryText: "Weaving, dyeing and stitched textile pieces.",
        profileImage: "https://picsum.photos/seed/the-camp-portrait/160/160",
        images: [
            "https://picsum.photos/seed/the-camp-1/640/400",
            "https://picsum.photos/seed/the-camp-2/640/400",
            "https://picsum.photos/seed/the-camp-3/640/400",
        ],
    },
    {
        id: "studio-3",
        name: "Studio 3",
        routeGroupId: "bisley",
        lng: -2.214399,
        lat: 51.744668,
        email: "hello@studio-3.example.com",
        phone: "07700 900024",
        address: "25 Example Street, Bisley, GL5 7AA",
        directions: "Up Bisley Road; follow the signs once past the cemetery.",
        website: "www.studio-3.example.com",
        socialMedia: "@studio_3",
        directoryText:
            "Exhibition of recent drawing, sculpture, text and textile works.",
        profileImage: "https://picsum.photos/seed/studio-3-portrait/160/160",
        images: [
            "https://picsum.photos/seed/studio-3-1/640/400",
            "https://picsum.photos/seed/studio-3-2/640/400",
            "https://picsum.photos/seed/studio-3-3/640/400",
        ],
    },
    {
        id: "melvyn-warren-smith",
        name: "Melvyn Warren-Smith",
        routeGroupId: "bisley",
        lng: -2.21411838,
        lat: 51.74450015,
        email: "hello@melvyn-warren-smith.example.com",
        phone: "07700 900025",
        address: "26 Example Street, Bisley, GL5 8AA",
        directions: "Up Bisley Road; follow the signs once past the cemetery.",
        website: "www.melvyn-warren-smith.example.com",
        socialMedia: "@melvyn_warren_smith",
        directoryText:
            "New paintings and works on paper, with prints available.",
        profileImage:
            "https://picsum.photos/seed/melvyn-warren-smith-portrait/160/160",
        images: [
            "https://picsum.photos/seed/melvyn-warren-smith-1/640/400",
            "https://picsum.photos/seed/melvyn-warren-smith-2/640/400",
            "https://picsum.photos/seed/melvyn-warren-smith-3/640/400",
        ],
    },
    {
        id: "kath-williams",
        name: "Kath Williams",
        routeGroupId: "bisley",
        lng: -2.21247244,
        lat: 51.7440431,
        email: "hello@kath-williams.example.com",
        phone: "07700 900026",
        address: "27 Example Street, Bisley, GL5 9AA",
        directions: "Up Bisley Road; follow the signs once past the cemetery.",
        website: "www.kath-williams.example.com",
        socialMedia: "@kath_williams",
        directoryText: "Ceramics and slipware thrown and fired on site.",
        profileImage:
            "https://picsum.photos/seed/kath-williams-portrait/160/160",
        images: [
            "https://picsum.photos/seed/kath-williams-1/640/400",
            "https://picsum.photos/seed/kath-williams-2/640/400",
            "https://picsum.photos/seed/kath-williams-3/640/400",
        ],
    },
    {
        id: "piccadilly-mill-east",
        name: "Piccadilly Mill East",
        routeGroupId: "bisley",
        lng: -2.209,
        lat: 51.7436,
        email: "hello@piccadilly-mill-east.example.com",
        phone: "07700 900027",
        address: "28 Example Street, Bisley, GL5 1AA",
        directions: "Up Bisley Road; follow the signs once past the cemetery.",
        website: "www.piccadilly-mill-east.example.com",
        socialMedia: "@piccadilly_mill_east",
        directoryText:
            "Printmaking studio open for demonstrations through the weekend.",
        profileImage:
            "https://picsum.photos/seed/piccadilly-mill-east-portrait/160/160",
        images: [
            "https://picsum.photos/seed/piccadilly-mill-east-1/640/400",
            "https://picsum.photos/seed/piccadilly-mill-east-2/640/400",
            "https://picsum.photos/seed/piccadilly-mill-east-3/640/400",
        ],
    },
    {
        id: "piccadilly-mill-west",
        name: "Piccadilly Mill West",
        routeGroupId: "bisley",
        lng: -2.21001,
        lat: 51.74349,
        email: "hello@piccadilly-mill-west.example.com",
        phone: "07700 900028",
        address: "29 Example Street, Bisley, GL5 2AA",
        directions: "Up Bisley Road; follow the signs once past the cemetery.",
        website: "www.piccadilly-mill-west.example.com",
        socialMedia: "@piccadilly_mill_west",
        directoryText:
            "Mixed show of photography, collage and experimental film.",
        profileImage:
            "https://picsum.photos/seed/piccadilly-mill-west-portrait/160/160",
        images: [
            "https://picsum.photos/seed/piccadilly-mill-west-1/640/400",
            "https://picsum.photos/seed/piccadilly-mill-west-2/640/400",
            "https://picsum.photos/seed/piccadilly-mill-west-3/640/400",
        ],
    },
    {
        id: "lower-st",
        name: "Lower St",
        routeGroupId: "bisley",
        lng: -2.2103256,
        lat: 51.7431577,
        email: "hello@lower-st.example.com",
        phone: "07700 900029",
        address: "30 Example Street, Bisley, GL5 3AA",
        directions: "Up Bisley Road; follow the signs once past the cemetery.",
        website: "www.lower-st.example.com",
        socialMedia: "@lower_st",
        directoryText:
            "Furniture and woodwork, with the workshop open to visitors.",
        profileImage: "https://picsum.photos/seed/lower-st-portrait/160/160",
        images: [
            "https://picsum.photos/seed/lower-st-1/640/400",
            "https://picsum.photos/seed/lower-st-2/640/400",
            "https://picsum.photos/seed/lower-st-3/640/400",
        ],
    },
    {
        id: "nigel-noyes",
        name: "Nigel Noyes",
        routeGroupId: "bisley",
        lng: -2.20697,
        lat: 51.74316,
        email: "hello@nigel-noyes.example.com",
        phone: "07700 900030",
        address: "31 Example Street, Bisley, GL5 4AA",
        directions: "Up Bisley Road; follow the signs once past the cemetery.",
        website: "www.nigel-noyes.example.com",
        socialMedia: "@nigel_noyes",
        directoryText:
            "Jewellery and small metalwork, plus a bench demonstration.",
        profileImage: "https://picsum.photos/seed/nigel-noyes-portrait/160/160",
        images: [
            "https://picsum.photos/seed/nigel-noyes-1/640/400",
            "https://picsum.photos/seed/nigel-noyes-2/640/400",
            "https://picsum.photos/seed/nigel-noyes-3/640/400",
        ],
    },
    {
        id: "clare-bonnet",
        name: "Clare Bonnet",
        routeGroupId: "bisley",
        lng: -2.20673,
        lat: 51.74301,
        email: "hello@clare-bonnet.example.com",
        phone: "07700 900031",
        address: "32 Example Street, Bisley, GL5 5AA",
        directions: "Up Bisley Road; follow the signs once past the cemetery.",
        website: "www.clare-bonnet.example.com",
        socialMedia: "@clare_bonnet",
        directoryText: "Weaving, dyeing and stitched textile pieces.",
        profileImage:
            "https://picsum.photos/seed/clare-bonnet-portrait/160/160",
        images: [
            "https://picsum.photos/seed/clare-bonnet-1/640/400",
            "https://picsum.photos/seed/clare-bonnet-2/640/400",
            "https://picsum.photos/seed/clare-bonnet-3/640/400",
        ],
    },
    {
        id: "caroline-jamfrey",
        name: "Caroline Jamfrey",
        routeGroupId: "bisley",
        lng: -2.20706,
        lat: 51.74235,
        email: "hello@caroline-jamfrey.example.com",
        phone: "07700 900032",
        address: "33 Example Street, Bisley, GL5 6AA",
        directions: "Up Bisley Road; follow the signs once past the cemetery.",
        website: "www.caroline-jamfrey.example.com",
        socialMedia: "@caroline_jamfrey",
        directoryText:
            "Exhibition of recent drawing, sculpture, text and textile works.",
        profileImage:
            "https://picsum.photos/seed/caroline-jamfrey-portrait/160/160",
        images: [
            "https://picsum.photos/seed/caroline-jamfrey-1/640/400",
            "https://picsum.photos/seed/caroline-jamfrey-2/640/400",
            "https://picsum.photos/seed/caroline-jamfrey-3/640/400",
        ],
    },
    {
        id: "robert-garland",
        name: "Robert Garland",
        routeGroupId: "bisley",
        lng: -2.19346,
        lat: 51.74321,
        email: "hello@robert-garland.example.com",
        phone: "07700 900033",
        address: "34 Example Street, Bisley, GL5 7AA",
        directions: "Up Bisley Road; follow the signs once past the cemetery.",
        website: "www.robert-garland.example.com",
        socialMedia: "@robert_garland",
        directoryText:
            "New paintings and works on paper, with prints available.",
        profileImage:
            "https://picsum.photos/seed/robert-garland-portrait/160/160",
        images: [
            "https://picsum.photos/seed/robert-garland-1/640/400",
            "https://picsum.photos/seed/robert-garland-2/640/400",
            "https://picsum.photos/seed/robert-garland-3/640/400",
        ],
    },
    {
        id: "trixter-studios",
        name: "Trixter Studios",
        routeGroupId: "golden-valley",
        lng: -2.2071928,
        lat: 51.7377367,
        email: "hello@trixter-studios.example.com",
        phone: "07700 900034",
        address: "35 Example Street, Chalford, GL5 8AA",
        directions: "East along the canal; park in the mill yard.",
        website: "www.trixter-studios.example.com",
        socialMedia: "@trixter_studios",
        directoryText: "Ceramics and slipware thrown and fired on site.",
        profileImage:
            "https://picsum.photos/seed/trixter-studios-portrait/160/160",
        images: [
            "https://picsum.photos/seed/trixter-studios-1/640/400",
            "https://picsum.photos/seed/trixter-studios-2/640/400",
            "https://picsum.photos/seed/trixter-studios-3/640/400",
        ],
    },
    {
        id: "griffin-mill",
        name: "Griffin Mill",
        routeGroupId: "golden-valley",
        lng: -2.2046,
        lat: 51.73191,
        email: "hello@griffin-mill.example.com",
        phone: "07700 900035",
        address: "36 Example Street, Chalford, GL5 9AA",
        directions: "East along the canal; park in the mill yard.",
        website: "www.griffin-mill.example.com",
        socialMedia: "@griffin_mill",
        directoryText:
            "Printmaking studio open for demonstrations through the weekend.",
        profileImage:
            "https://picsum.photos/seed/griffin-mill-portrait/160/160",
        images: [
            "https://picsum.photos/seed/griffin-mill-1/640/400",
            "https://picsum.photos/seed/griffin-mill-2/640/400",
            "https://picsum.photos/seed/griffin-mill-3/640/400",
        ],
    },
    {
        id: "polly-lyster",
        name: "Polly Lyster",
        routeGroupId: "golden-valley",
        lng: -2.174177,
        lat: 51.732944,
        email: "hello@polly-lyster.example.com",
        phone: "07700 900036",
        address: "37 Example Street, Chalford, GL5 1AA",
        directions: "East along the canal; park in the mill yard.",
        website: "www.polly-lyster.example.com",
        socialMedia: "@polly_lyster",
        directoryText:
            "Mixed show of photography, collage and experimental film.",
        profileImage:
            "https://picsum.photos/seed/polly-lyster-portrait/160/160",
        images: [
            "https://picsum.photos/seed/polly-lyster-1/640/400",
            "https://picsum.photos/seed/polly-lyster-2/640/400",
            "https://picsum.photos/seed/polly-lyster-3/640/400",
        ],
    },
    {
        id: "victoria-works",
        name: "Victoria Works",
        routeGroupId: "golden-valley",
        lng: -2.15227962,
        lat: 51.72098032,
        email: "hello@victoria-works.example.com",
        phone: "07700 900037",
        address: "38 Example Street, Chalford, GL5 2AA",
        directions: "East along the canal; park in the mill yard.",
        website: "www.victoria-works.example.com",
        socialMedia: "@victoria_works",
        directoryText:
            "Furniture and woodwork, with the workshop open to visitors.",
        profileImage:
            "https://picsum.photos/seed/victoria-works-portrait/160/160",
        images: [
            "https://picsum.photos/seed/victoria-works-1/640/400",
            "https://picsum.photos/seed/victoria-works-2/640/400",
            "https://picsum.photos/seed/victoria-works-3/640/400",
        ],
    },
    {
        id: "sarah-maingot",
        name: "Sarah Maingot",
        routeGroupId: "golden-valley",
        lng: -2.108463,
        lat: 51.73154,
        email: "hello@sarah-maingot.example.com",
        phone: "07700 900038",
        address: "39 Example Street, Chalford, GL5 3AA",
        directions: "East along the canal; park in the mill yard.",
        website: "www.sarah-maingot.example.com",
        socialMedia: "@sarah_maingot",
        directoryText:
            "Jewellery and small metalwork, plus a bench demonstration.",
        profileImage:
            "https://picsum.photos/seed/sarah-maingot-portrait/160/160",
        images: [
            "https://picsum.photos/seed/sarah-maingot-1/640/400",
            "https://picsum.photos/seed/sarah-maingot-2/640/400",
            "https://picsum.photos/seed/sarah-maingot-3/640/400",
        ],
    },
]

// Areas are the unit the route is built from, so "which studios does this area
// hold" is asked in several places and answered once here. Selection order is
// the caller's, which is what makes the route reflect the order areas were
// added rather than the order they happen to be declared in.
export const studiosInAreas = (
    areaIds: ReadonlyArray<RouteGroupId>
): ReadonlyArray<Studio> =>
    areaIds.flatMap((areaId) =>
        studios.filter((studio) => studio.routeGroupId === areaId)
    )

export const studiosInArea = (areaId: RouteGroupId): ReadonlyArray<Studio> =>
    studios.filter((studio) => studio.routeGroupId === areaId)

// A first visit opens with every area that a single route can actually hold,
// taken in order, so the map arrives with a route already drawn instead of a
// blank basemap or a message about the limit. Derived rather than listed, so
// adding or moving studios cannot leave it claiming more than 25.
//
// Only consulted when storage holds nothing at all: someone who unticks every
// area comes back to an empty map, not to this.
export const defaultAreaIds: ReadonlyArray<RouteGroupId> = routeGroups.reduce<{
    readonly areaIds: ReadonlyArray<RouteGroupId>
    readonly total: number
}>(
    (accumulator, { id }) => {
        const total = accumulator.total + studiosInArea(id).length

        return total > MAX_ROUTE_STUDIOS
            ? accumulator
            : { areaIds: [...accumulator.areaIds, id], total }
    },
    { areaIds: [], total: 0 }
).areaIds

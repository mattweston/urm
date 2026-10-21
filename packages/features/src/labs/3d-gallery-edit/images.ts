import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"

export const GOLDEN_RATIO = 1.61803398875

export const FrameDef = S.Struct({
    key: S.String,
    position: S.Tuple([S.Number, S.Number, S.Number]),
    rotation: S.Tuple([S.Number, S.Number, S.Number]),
    url: S.String,
    label: S.String,
})
export type FrameDef = typeof FrameDef.Type

export const ForSale = taggedStruct("ForSale", { amount: S.Number })
export const NotForSale = taggedStruct("NotForSale")
export const Price = S.Union([ForSale, NotForSale])
export type Price = typeof Price.Type

export interface FrameDetails {
    artist: string
    year: string
    medium: string
    dimensions: string
    description: string
    price: Price
}

export const GalleryText = S.Struct({
    title: S.String,
    artist: S.String,
    year: S.String,
    medium: S.String,
    dimensions: S.String,
    price: S.String,
    description: S.String,
})
export type GalleryText = typeof GalleryText.Type

export const frameDetails: Record<string, FrameDetails> = {
    bridge: {
        artist: "Claude Monet",
        year: "1899",
        medium: "Oil on canvas",
        dimensions: "73 × 92 cm",
        description:
            "A serene depiction of a Japanese-style bridge over a water lily pond at Monet's garden in Giverny. The soft reflections and vibrant flora capture the essence of Impressionism.",
        price: { _tag: "NotForSale" },
    },
    city: {
        artist: "Piet Mondrian",
        year: "1942",
        medium: "Oil on canvas",
        dimensions: "80 × 80 cm",
        description:
            "A geometric abstraction of Broadway boogie-woogie. The rhythmic grid of primary colors against a white ground evokes the energy of New York City.",
        price: { _tag: "NotForSale" },
    },
    ocean: {
        artist: "Katsushika Hokusai",
        year: "1831",
        medium: "Woodblock print",
        dimensions: "26 × 38 cm",
        description:
            "The iconic Great Wave off Kanagawa, part of Hokusai's Thirty-six Views of Mount Fuji. The curling wave and distant Mount Fuji epitomize ukiyo-e art.",
        price: { _tag: "ForSale", amount: 45000 },
    },
    river: {
        artist: "J.M.W. Turner",
        year: "1810",
        medium: "Oil on canvas",
        dimensions: "91 × 122 cm",
        description:
            "A dramatic riverscape with a storm gathering on the horizon. Turner's mastery of light and atmosphere is evident in the turbulent sky and shimmering water.",
        price: { _tag: "NotForSale" },
    },
    forest: {
        artist: "Henri Rousseau",
        year: "1905",
        medium: "Oil on canvas",
        dimensions: "100 × 81 cm",
        description:
            "A lush, dreamlike jungle scene with exotic foliage and hidden wildlife. Rousseau's naive style lends the forest an enchanting, otherworldly quality.",
        price: { _tag: "ForSale", amount: 120000 },
    },
    landscape: {
        artist: "John Constable",
        year: "1821",
        medium: "Oil on canvas",
        dimensions: "130 × 185 cm",
        description:
            "A sweeping view of the Suffolk countryside. Constable's meticulous study of clouds and light captures the pastoral beauty of the English landscape.",
        price: { _tag: "NotForSale" },
    },
    lake: {
        artist: "Caspar David Friedrich",
        year: "1818",
        medium: "Oil on canvas",
        dimensions: "55 × 71 cm",
        description:
            "A lone figure contemplates a mountain lake at twilight. Friedrich's Romantic masterpiece uses the sublime landscape to evoke introspection and awe.",
        price: { _tag: "ForSale", amount: 95000 },
    },
    mountain: {
        artist: "Georgia O'Keeffe",
        year: "1930",
        medium: "Oil on canvas",
        dimensions: "61 × 46 cm",
        description:
            "An intimate close-up of a mountain peak rendered in O'Keeffe's signature bold forms and earthy palette. The painting bridges abstraction and representation.",
        price: { _tag: "NotForSale" },
    },
}

export const frames: ReadonlyArray<FrameDef> = [
    {
        key: "bridge",
        position: [-0.75, 0, -3],
        rotation: [0, 0, 0],
        url: "https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg",
        label: "Bridge at Giverny",
    },
    {
        key: "city",
        position: [0.75, 0, -3],
        rotation: [0, 0, 0],
        url: "https://images.pexels.com/photos/1103971/pexels-photo-1103971.jpeg",
        label: "Broadway Boogie-Woogie",
    },
    {
        key: "ocean",
        position: [3, 0, -0.75],
        rotation: [0, -Math.PI / 2, 0],
        url: "https://images.pexels.com/photos/1103976/pexels-photo-1103976.jpeg",
        label: "The Great Wave",
    },
    {
        key: "river",
        position: [3, 0, 0.75],
        rotation: [0, -Math.PI / 2, 0],
        url: "https://images.pexels.com/photos/1103977/pexels-photo-1103977.jpeg",
        label: "River Storm",
    },
    {
        key: "forest",
        position: [0.75, 0, 3],
        rotation: [0, Math.PI, 0],
        url: "https://images.pexels.com/photos/1103973/pexels-photo-1103973.jpeg",
        label: "The Enchanted Forest",
    },
    {
        key: "landscape",
        position: [-0.75, 0, 3],
        rotation: [0, Math.PI, 0],
        url: "https://images.pexels.com/photos/1103972/pexels-photo-1103972.jpeg",
        label: "Suffolk Countryside",
    },
    {
        key: "lake",
        position: [-3, 0, 0.75],
        rotation: [0, Math.PI / 2, 0],
        url: "https://images.pexels.com/photos/1103974/pexels-photo-1103974.jpeg",
        label: "Mountain Lake",
    },
    {
        key: "mountain",
        position: [-3, 0, -0.75],
        rotation: [0, Math.PI / 2, 0],
        url: "https://images.pexels.com/photos/1103975/pexels-photo-1103975.jpeg",
        label: "Peak",
    },
]

export const getGalleryText = (frameKey: string): GalleryText | undefined => {
    const frame = frames.find((frameDef) => frameDef.key === frameKey)
    const details = frameDetails[frameKey]
    if (frame === undefined || details === undefined) {
        return undefined
    }

    return {
        title: frame.label,
        artist: details.artist,
        year: details.year,
        medium: details.medium,
        dimensions: details.dimensions,
        price:
            details.price._tag === "ForSale"
                ? `£${details.price.amount.toLocaleString()}`
                : "Not for sale",
        description: details.description,
    }
}

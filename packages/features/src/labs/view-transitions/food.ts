import { Array, Option, Schema as S } from "effect"

export const Food = S.Struct({
    slug: S.String,
    name: S.String,
    eyebrow: S.String,
    summary: S.String,
    storage: S.String,
    keeps: S.String,
    cardColor: S.String,
    pageColor: S.String,
    inkColor: S.String,
    mark: S.String,
})
export type Food = typeof Food.Type

export const foods: ReadonlyArray<Food> = [
    {
        slug: "acorn-squash",
        name: "Acorn Squash",
        eyebrow: "Winter squash",
        summary: "Keep whole squash somewhere cool, dry, and dark.",
        storage:
            "Store uncut on a shelf with airflow. Refrigerate after cutting.",
        keeps: "1–2 months whole",
        cardColor: "#9c5f1e",
        pageColor: "#cd853f",
        inkColor: "#fff1e7",
        mark: "AS",
    },
    {
        slug: "alfalfa-sprouts",
        name: "Alfalfa Sprouts",
        eyebrow: "Fresh sprouts",
        summary: "Refrigerate and use within a few days.",
        storage:
            "Keep in the original container or a breathable container in the refrigerator.",
        keeps: "3–5 days",
        cardColor: "#61b362",
        pageColor: "#90ee90",
        inkColor: "#001e08",
        mark: "AL",
    },
    {
        slug: "aloe-vera",
        name: "Aloe Vera",
        eyebrow: "Succulent leaf",
        summary: "Wrap cut leaves and keep them cold.",
        storage:
            "Refrigerate whole leaves in a breathable bag. Seal cut gel separately.",
        keeps: "1–2 weeks",
        cardColor: "#367d4a",
        pageColor: "#78c58c",
        inkColor: "#071d0d",
        mark: "AV",
    },
    {
        slug: "anaheim-peppers",
        name: "Anaheim Peppers",
        eyebrow: "Fresh pepper",
        summary: "Refrigerate dry and unwashed until needed.",
        storage:
            "Keep loose in the crisper drawer or in a partly open produce bag.",
        keeps: "1–2 weeks",
        cardColor: "#006704",
        pageColor: "#228b22",
        inkColor: "#f0ffee",
        mark: "AP",
    },
]

export const foodSlugs: ReadonlyArray<string> = Array.map(
    foods,
    (food) => food.slug
)

export const findFood = (slug: string): Option.Option<Food> =>
    Array.findFirst(foods, (food) => food.slug === slug)

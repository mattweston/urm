import type { MenuItem } from "./events.data.ts"
export const category_key = (category: string): string =>
    category.trim().toLowerCase() === "appetizer"
        ? "appetisers"
        : category.trim().toLowerCase()
export const category_label = (category: string): string =>
    category_key(category).replace(/(^|[-\s])\S/g, (letter) =>
        letter.replace("-", " ").toUpperCase()
    )
const defaults = ["main", "condiments", "appetisers"]
export const menu_categories = (
    items: ReadonlyArray<MenuItem>
): ReadonlyArray<string> => [
    ...defaults,
    ...[...new Set(items.map((item) => category_key(item.category)))]
        .filter((category) => !defaults.includes(category))
        .sort(),
]

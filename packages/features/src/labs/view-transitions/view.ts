import { Array, Option, String } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ChangedViewTransitionsRoute,
    FocusedViewTransitionsFood,
    UpdatedViewTransitionsFilterText,
    type ViewTransitionsMessage,
} from "./message.ts"
import { findFood, foods, type Food } from "./food.ts"

// The gallery and its detail route are hosted at paths the application owns,
// so the view receives its links instead of importing the app's routes.
export type ViewTransitionsHrefs = Readonly<{
    gallery: () => string
    food: (foodSlug: string) => string
}>

// Styling is Tailwind, but five class names are kept as bare hooks because the
// stylesheet still needs them: the `:has()` rule that strips
// `view-transition-name` from the non-selected cards cannot be expressed as a
// utility, and neither can the `::view-transition-*` pseudo-element rules.
const GRID_HOOK = "food-vt-grid"
const CARD_HOOK = "food-vt-card"
const CARD_BG_HOOK = "food-vt-card-bg"
const MARK_HOOK = "food-vt-mark"
const CARD_NAME_HOOK = "food-vt-card-name"

const shellClassName =
    "min-h-full p-[clamp(2rem,5vw,5rem)] max-sm:p-5 bg-background text-foreground"

const detailClassName =
    "relative isolate min-h-full overflow-hidden p-[clamp(2rem,5vw,5rem)] max-sm:p-5 text-foreground " +
    "bg-[color-mix(in_oklab,var(--background)_84%,var(--food-vt-page-color))]"

const displayHeadingClassName =
    "mt-[0.35rem] mb-0 text-[clamp(2.5rem,7vw,6.5rem)] font-[850] tracking-[-0.075em] leading-[0.94]"

const proseClassName =
    "max-w-[42rem] text-[clamp(1rem,2vw,1.25rem)] leading-[1.6]"

const kickerClassName =
    "m-0 text-xs font-extrabold tracking-[0.16em] text-primary"

const linkClassName =
    "mt-4 inline-block border-b border-current text-sm font-bold no-underline text-primary"

const searchClassName =
    "mx-auto mt-8 block w-[min(100%,68rem)] rounded-full border-(length:--surface-border-width) border-border px-[1.2rem] py-[0.9rem] font-[inherit] text-foreground outline-none " +
    "bg-[color-mix(in_oklab,var(--card)_78%,transparent)] placeholder:text-muted-foreground " +
    "focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_28%,transparent)]"

const gridClassName = `${GRID_HOOK} mx-auto mt-8 grid w-[min(100%,68rem)] grid-cols-2 max-sm:grid-cols-1 gap-[clamp(0.75rem,2vw,1.5rem)]`

const cardClassName =
    `${CARD_HOOK} group relative isolate grid min-h-[clamp(13rem,28vw,22rem)] max-sm:min-h-48 content-end overflow-hidden rounded-3xl p-[clamp(1rem,3vw,2rem)] no-underline text-card-foreground ` +
    "border-(length:--surface-border-width) border-[color-mix(in_oklab,var(--border)_72%,var(--food-vt-card-color))] " +
    "bg-[color-mix(in_oklab,var(--card)_72%,var(--food-vt-card-color))] " +
    "focus-visible:outline-[3px] focus-visible:outline-ring focus-visible:outline-offset-[3px]"

const backdropClassName =
    "absolute inset-0 -z-10 rounded-[inherit] bg-[inherit]"

// The blobby border-radius and the hover nudge both come from the reference
// page; the nudge keys off the card's `group` rather than a descendant hover.
const markClassName =
    `${MARK_HOOK} grid aspect-square place-items-center justify-self-end rounded-[48%_52%_45%_55%/55%_42%_58%_45%] border-2 text-[clamp(1.4rem,4vw,2.75rem)] font-black tracking-[-0.08em] transition-transform duration-[180ms] ease-out ` +
    "group-hover:-translate-y-[0.35rem] group-hover:-rotate-3 " +
    "border-card-foreground text-card-foreground " +
    "bg-[color-mix(in_oklab,var(--card)_62%,var(--food-vt-card-color,var(--food-vt-page-color)))]"

const galleryMarkClassName = `${markClassName} w-[clamp(5rem,13vw,9rem)]`

const heroMarkClassName = `${markClassName} w-full max-sm:w-32 justify-self-start`

const cardNameClassName = `${CARD_NAME_HOOK} mt-6 mb-0 w-fit text-[clamp(1.25rem,3vw,2.25rem)] font-[850] tracking-[-0.045em] leading-none`

const cardKindClassName = "mt-[0.4rem] mb-0 text-[0.8rem] opacity-75"

const heroClassName =
    "mx-auto my-[clamp(3rem,8vw,7rem)] grid w-[min(100%,68rem)] grid-cols-[minmax(7rem,18rem)_minmax(0,1fr)] max-sm:grid-cols-1 items-center gap-[clamp(1.5rem,6vw,6rem)]"

const methodClassName =
    "mx-auto w-[min(100%,46rem)] rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-[clamp(1.5rem,4vw,3rem)]  bg-card text-card-foreground [box-shadow:var(--shadow-surface)]" +
    "bg-[color-mix(in_oklab,var(--card)_76%,transparent)]"

const methodHeadingClassName = "mt-[0.4rem] mb-4 text-[clamp(1.8rem,4vw,3rem)]"

const transitionStyle = (food: Food, part: "bg" | "image" | "name") => ({
    viewTransitionName: `item-${part}--${food.slug}`,
    viewTransitionClass: `food-${part}`,
})

const filteredFoods = (filterText: string): ReadonlyArray<Food> => {
    const query = filterText.trim().toLowerCase()

    return String.isEmpty(query)
        ? foods
        : Array.filter(foods, (food) =>
              String.includes(query)(
                  `${food.name} ${food.eyebrow}`.toLowerCase()
              )
          )
}

const foodMark = <ParentMessage>(
    food: Food,
    className: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class(className), h.Style(transitionStyle(food, "image"))],
        [food.mark]
    )

const foodCard = <ParentMessage>(
    food: Food,
    isTransitionActive: boolean,
    hrefs: ViewTransitionsHrefs,
    toViewTransitionsMessage: (
        message: ViewTransitionsMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("a")(
        food.slug,
        [
            h.Href(hrefs.food(food.slug)),
            h.OnClick(
                toViewTransitionsMessage(
                    ChangedViewTransitionsRoute({
                        maybeFoodSlug: Option.some(food.slug),
                    })
                )
            ),
            h.Class(cardClassName),
            h.OnFocus(
                toViewTransitionsMessage(
                    FocusedViewTransitionsFood({ foodSlug: food.slug })
                )
            ),
            ...(isTransitionActive
                ? [h.DataAttribute("transition-active", "true")]
                : []),
            h.Style({
                "--food-vt-card-color": food.cardColor,
            }),
        ],
        [
            h.div([
                h.Class(`${CARD_BG_HOOK} ${backdropClassName}`),
                h.Style(transitionStyle(food, "bg")),
            ]),
            foodMark(food, galleryMarkClassName, h),
            h.p(
                [
                    h.Class(cardNameClassName),
                    h.Style(transitionStyle(food, "name")),
                ],
                [food.name]
            ),
            h.p([h.Class(cardKindClassName)], [food.eyebrow]),
        ]
    )

const gallery = <ParentMessage>(
    filterText: string,
    maybeActiveFoodSlug: Option.Option<string>,
    hrefs: ViewTransitionsHrefs,
    toViewTransitionsMessage: (
        message: ViewTransitionsMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(shellClassName)],
        [
            h.div(
                [h.Class("mx-auto max-w-[68rem]")],
                [
                    h.p([h.Class(kickerClassName)], ["ASTRO × FOLDKIT"]),
                    h.h2(
                        [h.Class(displayHeadingClassName)],
                        ["Browse all foods"]
                    ),
                    h.p(
                        [h.Class(proseClassName)],
                        [
                            "Select an item to learn about the best methods for storing it.",
                        ]
                    ),
                ]
            ),
            h.input([
                h.Type("search"),
                h.Value(filterText),
                h.Placeholder("Search food items"),
                h.OnInput((filterText) =>
                    toViewTransitionsMessage(
                        UpdatedViewTransitionsFilterText({ filterText })
                    )
                ),
                h.Class(searchClassName),
            ]),
            Array.match(filteredFoods(filterText), {
                onEmpty: () =>
                    h.p(
                        [h.Class(proseClassName)],
                        ["No foods match your search."]
                    ),
                onNonEmpty: (matched) =>
                    h.div(
                        [h.Class(gridClassName)],
                        Array.map(matched, (food) =>
                            foodCard(
                                food,
                                Option.match(maybeActiveFoodSlug, {
                                    onNone: () => false,
                                    onSome: (foodSlug) =>
                                        foodSlug === food.slug,
                                }),
                                hrefs,
                                toViewTransitionsMessage,
                                h
                            )
                        )
                    ),
            }),
        ]
    )

const detail = <ParentMessage>(
    food: Food,
    hrefs: ViewTransitionsHrefs,
    toViewTransitionsMessage: (
        message: ViewTransitionsMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [
            h.Class(detailClassName),
            h.Style({
                "--food-vt-page-color": food.pageColor,
            }),
        ],
        [
            h.div([
                h.Class(backdropClassName),
                h.Style(transitionStyle(food, "bg")),
            ]),
            h.a(
                [
                    h.Href(hrefs.gallery()),
                    h.OnClick(
                        toViewTransitionsMessage(
                            ChangedViewTransitionsRoute({
                                maybeFoodSlug: Option.none(),
                            })
                        )
                    ),
                    h.Class(linkClassName),
                ],
                ["Back to all foods"]
            ),
            h.div(
                [h.Class(heroClassName)],
                [
                    foodMark(food, heroMarkClassName, h),
                    h.div(
                        [],
                        [
                            h.p([h.Class(kickerClassName)], [food.eyebrow]),
                            h.h2(
                                [
                                    h.Class(displayHeadingClassName),
                                    h.Style(transitionStyle(food, "name")),
                                ],
                                [food.name]
                            ),
                            h.p(
                                [h.Class(`${proseClassName} mb-0`)],
                                [food.summary]
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class(methodClassName)],
                [
                    h.p([h.Class(kickerClassName)], ["BEST METHOD"]),
                    h.h3([h.Class(methodHeadingClassName)], ["Refrigerated"]),
                    h.p([h.Class(proseClassName)], [food.storage]),
                    h.strong([h.Class("mt-4 inline-block")], [food.keeps]),
                ]
            ),
        ]
    )

export const view = <ParentMessage>(
    maybeFoodSlug: Option.Option<string>,
    maybeActiveFoodSlug: Option.Option<string>,
    filterText: string,
    hrefs: ViewTransitionsHrefs,
    toViewTransitionsMessage: (
        message: ViewTransitionsMessage
    ) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(maybeFoodSlug, {
        onNone: () =>
            gallery(
                filterText,
                maybeActiveFoodSlug,
                hrefs,
                toViewTransitionsMessage,
                h
            ),
        onSome: (foodSlug) =>
            Option.match(findFood(foodSlug), {
                onNone: () =>
                    h.div(
                        [h.Class(shellClassName)],
                        [
                            h.h2(
                                [h.Class(displayHeadingClassName)],
                                ["Food not found"]
                            ),
                            h.a(
                                [
                                    h.Href(hrefs.gallery()),
                                    h.OnClick(
                                        toViewTransitionsMessage(
                                            ChangedViewTransitionsRoute({
                                                maybeFoodSlug: Option.none(),
                                            })
                                        )
                                    ),
                                    h.Class(linkClassName),
                                ],
                                ["Back to all foods"]
                            ),
                        ]
                    ),
                onSome: (food) =>
                    detail(food, hrefs, toViewTransitionsMessage, h),
            }),
    })

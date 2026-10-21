/** # Combobox view */
import clsx from "clsx"
import { Array, Option } from "effect"
import * as Ui from "@foldkit/ui"
import { childAttributes } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Icon from "../_shared/icon.ts"
import { type City } from "./city.ts"
import {
    GotBasicMessage,
    GotMultiMessage,
    GotNullableMessage,
    GotSelectOnFocusMessage,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"

const CITIES: ReadonlyArray<City> = [
    "Johannesburg",
    "Kyiv",
    "Oxford",
    "Plymouth",
    "Quito",
    "Wellington",
    "Zurich",
]

const inputClassName =
    "w-full rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background text-foreground pl-3 pr-10 py-2 text-base outline-none focus:ring-2 focus:ring-ring"

const buttonClassName =
    "absolute inset-y-0 right-0 flex items-center px-4 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"

const itemsClassName =
    "w-(--button-width) rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] overflow-hidden z-10 outline-none"

const COMBOBOX_ANCHOR = {
    placement: "bottom-start" as const,
    gap: 8,
    padding: 8,
}

const itemClassName =
    "px-3 py-2 text-base text-muted-foreground cursor-pointer data-[active]:bg-accent data-[active]:text-accent-foreground data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const backdropClassName = "fixed inset-0 z-0"

const wrapperClassName = "relative w-full max-w-72"

const tagClassName =
    "inline-flex items-center gap-1 px-2 py-0.5 text-sm rounded-[var(--radius-control)] bg-muted text-foreground [box-shadow:var(--shadow-control)]"

const emptyTagClassName = "text-sm py-0.5 text-muted-foreground"

const SingleCombobox = Ui.Combobox.create<City>()
const MultiCombobox = Ui.Combobox.Multi.create<City>()

const filterCities = (inputValue: string): ReadonlyArray<City> =>
    inputValue === ""
        ? CITIES
        : Array.filter(CITIES, (city) =>
              city.toLowerCase().includes(inputValue.toLowerCase())
          )

const comboboxConfig = <ParentMessage>(
    maybeSelectedValue: Option.Option<City>,
    inputValue: string,
    h: HtmlBuilder<ParentMessage>
) => {
    const filteredCities = filterCities(inputValue)

    return {
        maybeSelectedValue,
        restingInputValue: Option.getOrElse(maybeSelectedValue, () => ""),
        items: filteredCities,
        itemToConfig: (city: City, context: { isSelected: boolean }) => ({
            className: itemClassName,
            content: h.div(
                [h.Class("flex items-center gap-2")],
                [
                    Icon.check(
                        clsx(
                            "w-4 h-4 shrink-0 text-foreground",
                            context.isSelected ? "visible" : "invisible"
                        )
                    ),
                    h.span([], [city]),
                ]
            ),
        }),
        itemToValue: (city: City) => city,
        itemToDisplayText: (city: City) => city,
        inputAttributes: childAttributes([
            h.Class(inputClassName),
            h.Placeholder("Search cities..."),
        ]),
        itemsAttributes: childAttributes([h.Class(itemsClassName)]),
        backdropAttributes: childAttributes([h.Class(backdropClassName)]),
        attributes: childAttributes([h.Class(wrapperClassName)]),
        inputWrapperAttributes: childAttributes([h.Class("relative")]),
        buttonContent: Icon.chevronDown("w-4 h-4"),
        buttonAttributes: childAttributes([h.Class(buttonClassName)]),
        anchor: COMBOBOX_ANCHOR,
    }
}

/**
 * Compare four combobox configurations backed by the same local city list.
 * Selections are stored in the parent model while each combobox independently
 * owns its input, focus, and highlighted-option state.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const {
        basic: comboboxBasic,
        maybeBasicValue,
        nullable: comboboxNullable,
        maybeNullableValue,
        selectOnFocus: comboboxSelectOnFocus,
        maybeSelectOnFocusValue,
        multi: comboboxMulti,
        multiValues,
    } = model

    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Combobox"]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Single-Select"]
            ),
            h.div(
                [h.Class("relative")],
                [
                    h.submodel({
                        slotId: comboboxBasic.id,
                        model: comboboxBasic,
                        view: SingleCombobox.view,
                        viewInputs: comboboxConfig<ParentMessage>(
                            maybeBasicValue,
                            Option.getOrElse(maybeBasicValue, () => ""),
                            h
                        ),
                        toParentMessage: (message) =>
                            toParentMessage(GotBasicMessage({ message })),
                    }),
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Nullable"]
            ),
            h.div(
                [h.Class("relative")],
                [
                    h.submodel({
                        slotId: comboboxNullable.id,
                        model: comboboxNullable,
                        view: SingleCombobox.view,
                        viewInputs: comboboxConfig<ParentMessage>(
                            maybeNullableValue,
                            Option.getOrElse(maybeNullableValue, () => ""),
                            h
                        ),
                        toParentMessage: (message) =>
                            toParentMessage(GotNullableMessage({ message })),
                    }),
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Select on Focus"]
            ),
            h.div(
                [h.Class("relative")],
                [
                    h.submodel({
                        slotId: comboboxSelectOnFocus.id,
                        model: comboboxSelectOnFocus,
                        view: SingleCombobox.view,
                        viewInputs: comboboxConfig<ParentMessage>(
                            maybeSelectOnFocusValue,
                            Option.getOrElse(maybeSelectOnFocusValue, () => ""),
                            h
                        ),
                        toParentMessage: (message) =>
                            toParentMessage(
                                GotSelectOnFocusMessage({ message })
                            ),
                    }),
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Multi-Select"]
            ),
            h.div(
                [h.Class("relative")],
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-1.5 mb-2")],
                        Array.match(multiValues, {
                            onEmpty: () => [
                                h.span(
                                    [h.Class(emptyTagClassName)],
                                    ["No selection"]
                                ),
                            ],
                            onNonEmpty: (selectedItems) =>
                                selectedItems.map((item) =>
                                    h.span([h.Class(tagClassName)], [item])
                                ),
                        })
                    ),
                    h.submodel({
                        slotId: comboboxMulti.id,
                        model: comboboxMulti,
                        view: MultiCombobox.view,
                        viewInputs: {
                            selectedValues: multiValues,
                            restingInputValue: "",
                            items: filterCities(comboboxMulti.inputValue),
                            itemToConfig: (
                                city: City,
                                context: { isSelected: boolean }
                            ) => ({
                                className: itemClassName,
                                content: h.div(
                                    [h.Class("flex items-center gap-2")],
                                    [
                                        Icon.check(
                                            clsx(
                                                "w-4 h-4 shrink-0 text-foreground",
                                                context.isSelected
                                                    ? "visible"
                                                    : "invisible"
                                            )
                                        ),
                                        h.span([], [city]),
                                    ]
                                ),
                            }),
                            itemToValue: (city: City) => city,
                            itemToDisplayText: (city: City) => city,
                            inputAttributes: childAttributes([
                                h.Class(inputClassName),
                                h.Placeholder("Search cities..."),
                            ]),
                            itemsAttributes: childAttributes([
                                h.Class(itemsClassName),
                            ]),
                            backdropAttributes: childAttributes([
                                h.Class(backdropClassName),
                            ]),
                            attributes: childAttributes([
                                h.Class(wrapperClassName),
                            ]),
                            inputWrapperAttributes: childAttributes([
                                h.Class("relative"),
                            ]),
                            buttonContent: Icon.chevronDown("w-4 h-4"),
                            buttonAttributes: childAttributes([
                                h.Class(buttonClassName),
                            ]),
                            anchor: COMBOBOX_ANCHOR,
                        },
                        toParentMessage: (message) =>
                            toParentMessage(GotMultiMessage({ message })),
                    }),
                ]
            ),
        ]
    )
}

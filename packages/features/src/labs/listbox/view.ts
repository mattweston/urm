/** # Listbox view */
import { Array, Option } from "effect"
import * as Ui from "@foldkit/ui"
import { childAttributes } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Icon from "../_shared/icon.ts"
import {
    GotBasicMessage,
    GotGroupedMessage,
    GotMultiMessage,
    type Message,
} from "./message.ts"
import type { Model } from "./model.ts"
import type { ListboxItem } from "./item.ts"

const LISTBOX_ITEMS: ReadonlyArray<ListboxItem> = [
    "Michael Bluth",
    "Lindsay Funke",
    "Gob Bluth",
    "George Michael",
    "Maeby Funke",
    "Buster Bluth",
    "Tobias Funke",
    "Lucille Bluth",
]

type Character = Readonly<{
    firstName: string
    lastName: string
}>

const characterName = (character: Character): string =>
    `${character.firstName} ${character.lastName}`

const GROUPED_CHARACTERS: ReadonlyArray<Character> = [
    { firstName: "Michael", lastName: "Bluth" },
    { firstName: "Gob", lastName: "Bluth" },
    { firstName: "George Michael", lastName: "Bluth" },
    { firstName: "Buster", lastName: "Bluth" },
    { firstName: "Lucille", lastName: "Bluth" },
    { firstName: "Lindsay", lastName: "Funke" },
    { firstName: "Maeby", lastName: "Funke" },
    { firstName: "Tobias", lastName: "Funke" },
]

const triggerClassName =
    "inline-flex items-center justify-between gap-2 min-w-48 px-4 py-2 text-base font-normal cursor-pointer transition rounded-[var(--radius-control)] border-(length:--field-border-width) border-input bg-background text-foreground hover:bg-accent select-none [box-shadow:var(--shadow-control)]"

const itemsClassName =
    "absolute mt-1 w-56 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-overlay)] overflow-hidden z-10 outline-none"

const itemClassName =
    "group px-3 py-2 text-base text-muted-foreground cursor-pointer data-[active]:bg-accent data-[active]:text-accent-foreground border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const groupHeadingClassName =
    "px-3 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"

const separatorClassName =
    "border-t-(length:--surface-border-width) border-border"

const backdropClassName = "fixed inset-0 z-0"

const wrapperClassName = "relative inline-block"

const SingleListbox = Ui.Listbox.create<ListboxItem>()
const MultiListbox = Ui.Listbox.Multi.create<ListboxItem>()
const GroupedListbox = Ui.Listbox.create<Character>()

const LISTBOX_ANCHOR = {
    placement: "bottom-start" as const,
    gap: 4,
    padding: 8,
}

/**
 * Compare single, multi-select, and grouped listboxes. Each instance owns its
 * focus and active-option state while selected values are reflected in the
 * parent example model.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const {
        basic: listboxBasic,
        maybeSelectedItem,
        multi: listboxMulti,
        selectedMultiItems: multiItems,
        grouped: listboxGrouped,
        maybeSelectedGroupedItem: maybeSelectedGrouped,
    } = model
    const basicToMessage = (message: Ui.Listbox.Message): ParentMessage =>
        toParentMessage(GotBasicMessage({ message }))
    const multiToMessage = (message: Ui.Listbox.Message): ParentMessage =>
        toParentMessage(GotMultiMessage({ message }))
    const groupedToMessage = (message: Ui.Listbox.Message): ParentMessage =>
        toParentMessage(GotGroupedMessage({ message }))
    const singleButtonLabel = Option.getOrElse(
        maybeSelectedItem,
        () => "Select a Bluth"
    )

    const multiButtonLabel = Array.match(multiItems, {
        onEmpty: () => "Select Bluths",
        onNonEmpty: (items) =>
            items.length === 1 ? items[0] : `${items.length} selected`,
    })

    const groupedButtonLabel = Option.getOrElse(
        maybeSelectedGrouped,
        () => "Select a character"
    )

    return h.div(
        [],
        [
            h.h2(
                [h.Class("text-2xl font-bold text-foreground mb-6")],
                ["Listbox"]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Single-Select"]
            ),
            h.div(
                [h.Class("relative")],
                [
                    h.submodel({
                        slotId: listboxBasic.id,
                        model: listboxBasic,
                        view: SingleListbox.view,
                        viewInputs: {
                            maybeSelectedValue: maybeSelectedItem,
                            anchor: LISTBOX_ANCHOR,
                            items: LISTBOX_ITEMS,
                            itemToConfig: (item) => ({
                                className: itemClassName,
                                content: h.div(
                                    [h.Class("flex items-center gap-2")],
                                    [
                                        Icon.check(
                                            "w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-foreground"
                                        ),
                                        h.span([], [item]),
                                    ]
                                ),
                            }),
                            buttonContent: h.div(
                                [
                                    h.Class(
                                        "flex w-full items-center justify-between gap-4"
                                    ),
                                ],
                                [
                                    h.span([], [singleButtonLabel]),
                                    Icon.chevronDown("w-4 h-4"),
                                ]
                            ),
                            buttonAttributes: childAttributes([
                                h.Class(triggerClassName),
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
                        },
                        toParentMessage: basicToMessage,
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
                    h.submodel({
                        slotId: listboxMulti.id,
                        model: listboxMulti,
                        view: MultiListbox.view,
                        viewInputs: {
                            selectedValues: multiItems,
                            anchor: LISTBOX_ANCHOR,
                            items: LISTBOX_ITEMS,
                            itemToConfig: (item) => ({
                                className: itemClassName,
                                content: h.div(
                                    [h.Class("flex items-center gap-2")],
                                    [
                                        Icon.check(
                                            "w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-foreground"
                                        ),
                                        h.span([], [item]),
                                    ]
                                ),
                            }),
                            buttonContent: h.div(
                                [
                                    h.Class(
                                        "flex w-full items-center justify-between gap-4"
                                    ),
                                ],
                                [
                                    h.span([], [multiButtonLabel]),
                                    Icon.chevronDown("w-4 h-4"),
                                ]
                            ),
                            buttonAttributes: childAttributes([
                                h.Class(triggerClassName),
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
                        },
                        toParentMessage: multiToMessage,
                    }),
                ]
            ),

            h.h3(
                [h.Class("text-lg font-semibold text-foreground mt-8 mb-4")],
                ["Grouped"]
            ),
            h.div(
                [h.Class("relative")],
                [
                    h.submodel({
                        slotId: listboxGrouped.id,
                        model: listboxGrouped,
                        view: GroupedListbox.view,
                        viewInputs: {
                            maybeSelectedValue: maybeSelectedGrouped,
                            anchor: LISTBOX_ANCHOR,
                            items: GROUPED_CHARACTERS,
                            itemToValue: characterName,
                            itemGroupKey: (character) => character.lastName,
                            groupToHeading: (lastName) => ({
                                content: h.span([], [`${lastName}s`]),
                                className: groupHeadingClassName,
                            }),
                            separatorAttributes: childAttributes([
                                h.Class(separatorClassName),
                            ]),
                            itemToConfig: (character) => ({
                                className: itemClassName,
                                content: h.div(
                                    [h.Class("flex items-center gap-2")],
                                    [
                                        Icon.check(
                                            "w-4 h-4 shrink-0 invisible group-data-[selected]:visible text-foreground"
                                        ),
                                        h.span([], [characterName(character)]),
                                    ]
                                ),
                            }),
                            buttonContent: h.div(
                                [
                                    h.Class(
                                        "flex w-full items-center justify-between gap-4"
                                    ),
                                ],
                                [
                                    h.span([], [groupedButtonLabel]),
                                    Icon.chevronDown("w-4 h-4"),
                                ]
                            ),
                            buttonAttributes: childAttributes([
                                h.Class(triggerClassName),
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
                        },
                        toParentMessage: groupedToMessage,
                    }),
                ]
            ),
        ]
    )
}

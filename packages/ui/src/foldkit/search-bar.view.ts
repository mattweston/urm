import { type Html, type HtmlBuilder } from "foldkit/html"
import { IconFile, IconSearch } from "./icons/view.ts"
import { Button } from "./button/button.view.ts"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "./command.view.ts"

export type SearchBarItem = Readonly<{
    group: string
    title: string
    href: string
}>

type SearchBarProps<ParentMessage> = Readonly<{
    isOpen: boolean
    query: string
    items: ReadonlyArray<SearchBarItem>
    onToggleOpen: ParentMessage
    onClose: ParentMessage
    onMounted: ParentMessage
    onQueryChanged: (value: string) => ParentMessage
    onSelectItem: (href: string) => ParentMessage
}>

const triggerClassName =
    "relative flex h-10 w-auto items-center gap-2 bg-muted/50 px-2.5 text-muted-foreground"

const panelClassName = "max-w-2xl"

const itemClassName =
    "flex items-center rounded-[var(--radius-control)] px-3 py-2 text-sm text-foreground transition-[background-color,color] duration-150 motion-reduce:transition-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground active:bg-accent active:text-accent-foreground"

export const SearchBar = <ParentMessage>(
    props: SearchBarProps<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const normalizedQuery = props.query.trim().toLowerCase()
    const filteredItems =
        normalizedQuery === ""
            ? props.items
            : props.items.filter(
                  (item) =>
                      item.title.toLowerCase().includes(normalizedQuery) ||
                      item.group.toLowerCase().includes(normalizedQuery)
              )

    const groupedItems = filteredItems.reduce<
        Readonly<Record<string, ReadonlyArray<SearchBarItem>>>
    >((groups, item) => {
        const maybeGroup = groups[item.group]

        return {
            ...groups,
            [item.group]:
                maybeGroup === undefined ? [item] : [...maybeGroup, item],
        }
    }, {})

    const groupNames = Object.keys(groupedItems)

    return h.div(
        [],
        [
            Button<ParentMessage>(
                {
                    variant: "outline",
                    class: triggerClassName,
                    onClick: props.onToggleOpen,
                    attributes: [h.AriaLabel("Search pages")],
                    children: [
                        IconSearch({ class: "size-4 shrink-0" }),
                        h.kbd(
                            [
                                h.AriaHidden(true),
                                h.Class(
                                    "font-sans text-xs font-medium text-muted-foreground"
                                ),
                            ],
                            ["⌘ K"]
                        ),
                    ],
                },
                h
            ),
            CommandDialog<ParentMessage>(
                {
                    open: props.isOpen,
                    onOpenChange: props.onClose,
                    onMounted: props.onMounted,
                    label: "Search pages",
                    class: panelClassName,
                    children: [
                        CommandInput<ParentMessage>(
                            {
                                value: props.query,
                                onInput: props.onQueryChanged,
                                placeholder: "Search pages...",
                                autofocus: true,
                            },
                            h
                        ),
                        CommandList({
                            class: "p-2",
                            children:
                                groupNames.length === 0
                                    ? [
                                          CommandEmpty({
                                              class: "py-6 text-muted-foreground",
                                              children: ["No results found."],
                                          }),
                                      ]
                                    : groupNames.flatMap((groupName, index) => {
                                          const maybeGroupItems =
                                              groupedItems[groupName]

                                          if (maybeGroupItems === undefined) {
                                              return []
                                          }

                                          return [
                                              CommandGroup({
                                                  heading: groupName,
                                                  children: maybeGroupItems.map(
                                                      (item) =>
                                                          CommandItem<ParentMessage>(
                                                              {
                                                                  href: item.href,
                                                                  onClick:
                                                                      props.onSelectItem(
                                                                          item.href
                                                                      ),
                                                                  class: itemClassName,
                                                                  children: [
                                                                      IconFile({
                                                                          class: "me-2 size-4 shrink-0 opacity-70",
                                                                      }),
                                                                      h.span(
                                                                          [
                                                                              h.Class(
                                                                                  "min-w-0 [overflow-wrap:anywhere] text-start"
                                                                              ),
                                                                          ],
                                                                          [
                                                                              item.title,
                                                                          ]
                                                                      ),
                                                                  ],
                                                              },
                                                              h
                                                          )
                                                  ),
                                              }),
                                              ...(index < groupNames.length - 1
                                                  ? [
                                                        CommandSeparator({
                                                            class: "my-1",
                                                        }),
                                                    ]
                                                  : []),
                                          ]
                                      }),
                        }),
                    ],
                },
                h
            ),
        ]
    )
}

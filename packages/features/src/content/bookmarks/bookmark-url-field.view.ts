import type { Html, HtmlBuilder } from "foldkit/html"
import type { LinkSuggestion } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"

type BookmarkUrlFieldProps<Message> = Readonly<{
    id: string
    label: string
    value: string
    form_id?: string
    suggestions: ReadonlyArray<LinkSuggestion>
    on_input: (value: string) => Message
}>

export const bookmark_url_field_view = <Message>(
    props: BookmarkUrlFieldProps<Message>,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("grid min-w-0 gap-2")],
        [
            h.label(
                [h.For(props.id), h.Class("text-sm font-medium")],
                [props.label]
            ),
            h.input([
                h.Id(props.id),
                h.Name(props.id),
                ...(props.form_id === undefined
                    ? []
                    : [h.Attribute("form", props.form_id)]),
                h.Type("url"),
                h.Value(props.value),
                h.List(`${props.id}-bookmarks`),
                h.AriaDescribedBy(`${props.id}-help`),
                h.OnInput(props.on_input),
                h.Class(
                    "min-h-12 w-full min-w-0 rounded border border-input bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                ),
            ]),
            h.datalist(
                [h.Id(`${props.id}-bookmarks`)],
                props.suggestions.map((suggestion) =>
                    h.option(
                        [h.Key(suggestion.id), h.Value(suggestion.href)],
                        [[suggestion.title, ...suggestion.tags].join(" · ")]
                    )
                )
            ),
            h.p(
                [
                    h.Id(`${props.id}-help`),
                    h.Class("text-xs text-muted-foreground"),
                ],
                [
                    props.suggestions.length === 0
                        ? "Enter a URL. Save links in Content > Bookmarks to use them here."
                        : "Type to find a saved Bookmark or enter a URL. The selected URL is copied into this draft.",
                ]
            ),
        ]
    )

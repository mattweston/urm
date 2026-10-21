/** # Stateless publication layout slots */
import type { Html, HtmlBuilder } from "foldkit/html"

type Props = Readonly<{
    header: Html
    main: Html
    footer: Html
}>

/**
 * Composes caller-owned header, main and footer slots without editor state.
 * Publication selection, appearance and document authorization belong to the
 * host; rendering this layout does not establish that content may be published.
 */
export const view = <ParentMessage>(
    props: Props,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("flex min-h-96 flex-col bg-background text-foreground")],
        [
            h.header([h.Class("border-b border-border")], [props.header]),
            h.main([h.Class("min-h-0 flex-1")], [props.main]),
            h.footer([h.Class("border-t border-border")], [props.footer]),
        ]
    )

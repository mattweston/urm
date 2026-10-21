import { type Html, type HtmlBuilder } from "foldkit/html"

type PortalShellProps = Readonly<{
    mobileSidebar: Html
    desktopSidebar: Html
    header: Html
    content: Html
}>

export const portalShellView = <Message>(
    props: PortalShellProps,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "flex h-dvh flex-col overflow-hidden bg-background text-foreground"
            ),
        ],
        [
            h.a(
                [
                    h.Href("#main-content"),
                    h.Class(
                        "sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius-control)] focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
                    ),
                ],
                ["Skip to content"]
            ),
            props.mobileSidebar,
            h.div(
                [h.Class("flex min-h-0 flex-1")],
                [
                    props.desktopSidebar,
                    h.main(
                        [
                            h.Id("main-content"),
                            h.Tabindex(-1),
                            h.Class(
                                "flex min-w-0 flex-1 flex-col overflow-hidden bg-background"
                            ),
                        ],
                        [
                            props.header,
                            h.div(
                                [h.Class("min-h-0 flex-1 overflow-y-auto")],
                                [props.content]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

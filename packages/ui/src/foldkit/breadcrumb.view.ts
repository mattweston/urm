import { type Html, inertHtml } from "foldkit/html"

type WithClassProps = Readonly<{
    class?: string
}>

type BreadcrumbRootProps = Readonly<{
    class?: string
    children?: ReadonlyArray<Html>
}>

type BreadcrumbLinkProps = Readonly<{
    class?: string
    href: string
    children?: ReadonlyArray<Html>
}>

type BreadcrumbPageProps = Readonly<{
    class?: string
    children?: ReadonlyArray<Html>
}>

type BreadcrumbSeparatorProps = Readonly<{
    class?: string
    children?: ReadonlyArray<Html>
}>

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

const breadcrumb_h = inertHtml

const ChevronRightIcon = (): Html =>
    breadcrumb_h.svg(
        [
            breadcrumb_h.Xmlns("http://www.w3.org/2000/svg"),
            breadcrumb_h.ViewBox("0 0 24 24"),
            breadcrumb_h.Fill("none"),
            breadcrumb_h.Stroke("currentColor"),
            breadcrumb_h.StrokeWidth("2"),
            breadcrumb_h.StrokeLinecap("round"),
            breadcrumb_h.StrokeLinejoin("round"),
            breadcrumb_h.Class("size-3.5"),
        ],
        [breadcrumb_h.path([breadcrumb_h.Attribute("d", "M9 6l6 6l-6 6")], [])]
    )

const MoreHorizontalIcon = (): Html =>
    breadcrumb_h.svg(
        [
            breadcrumb_h.Xmlns("http://www.w3.org/2000/svg"),
            breadcrumb_h.ViewBox("0 0 24 24"),
            breadcrumb_h.Fill("none"),
            breadcrumb_h.Stroke("currentColor"),
            breadcrumb_h.StrokeWidth("2"),
            breadcrumb_h.StrokeLinecap("round"),
            breadcrumb_h.StrokeLinejoin("round"),
            breadcrumb_h.Class("size-4"),
        ],
        [
            breadcrumb_h.path(
                [
                    breadcrumb_h.Attribute(
                        "d",
                        "M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
                    ),
                ],
                []
            ),
            breadcrumb_h.path(
                [
                    breadcrumb_h.Attribute(
                        "d",
                        "M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
                    ),
                ],
                []
            ),
            breadcrumb_h.path(
                [
                    breadcrumb_h.Attribute(
                        "d",
                        "M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
                    ),
                ],
                []
            ),
        ]
    )

export const Breadcrumb = (props: BreadcrumbRootProps): Html =>
    breadcrumb_h.nav(
        [
            breadcrumb_h.AriaLabel("breadcrumb"),
            breadcrumb_h.Class(joinClassName("block", props.class)),
        ],
        props.children ?? []
    )

export const BreadcrumbList = (props: BreadcrumbRootProps): Html =>
    breadcrumb_h.ol(
        [
            breadcrumb_h.Class(
                joinClassName(
                    "text-muted-foreground flex flex-wrap items-center gap-1.5 break-words text-sm sm:gap-2.5",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )

export const BreadcrumbItem = (props: BreadcrumbRootProps): Html =>
    breadcrumb_h.li(
        [
            breadcrumb_h.Class(
                joinClassName("inline-flex items-center gap-1.5", props.class)
            ),
        ],
        props.children ?? []
    )

export const BreadcrumbLink = (props: BreadcrumbLinkProps): Html =>
    breadcrumb_h.a(
        [
            breadcrumb_h.Href(props.href),
            breadcrumb_h.Class(
                joinClassName(
                    "transition-colors hover:text-foreground",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )

export const BreadcrumbPage = (props: BreadcrumbPageProps): Html =>
    breadcrumb_h.span(
        [
            breadcrumb_h.Role("link"),
            breadcrumb_h.AriaDisabled(true),
            breadcrumb_h.AriaCurrent("page"),
            breadcrumb_h.Class(
                joinClassName("text-foreground font-normal", props.class)
            ),
        ],
        props.children ?? []
    )

export const BreadcrumbSeparator = (
    props: BreadcrumbSeparatorProps = {}
): Html =>
    breadcrumb_h.li(
        [
            breadcrumb_h.Role("presentation"),
            breadcrumb_h.AriaHidden(true),
            breadcrumb_h.Class(joinClassName("[&>svg]:size-3.5", props.class)),
        ],
        props.children ?? [ChevronRightIcon()]
    )

export const BreadcrumbEllipsis = (props: WithClassProps = {}): Html =>
    breadcrumb_h.span(
        [
            breadcrumb_h.Role("presentation"),
            breadcrumb_h.AriaHidden(true),
            breadcrumb_h.Class(
                joinClassName(
                    "flex size-9 items-center justify-center",
                    props.class
                )
            ),
        ],
        [
            MoreHorizontalIcon(),
            breadcrumb_h.span([breadcrumb_h.Class("sr-only")], ["More"]),
        ]
    )

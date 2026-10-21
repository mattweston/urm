import { type Html, inertHtml } from "foldkit/html"

type WithClassProps = Readonly<{
    class?: string
    children?: ReadonlyArray<Html | string>
}>

type TableProps = WithClassProps

type TableHeadProps = WithClassProps &
    Readonly<{
        ariaSort?: "none" | "ascending" | "descending" | "other"
    }>

type TableRowProps = WithClassProps &
    Readonly<{
        key?: string
    }>

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

export const Table = (props: TableProps): Html => {
    const h = inertHtml

    return h.div(
        [h.Class("relative min-w-0 w-full max-w-full overflow-auto overscroll-x-contain")],
        [
            h.table(
                [
                    h.Class(
                        joinClassName(
                            "w-full caption-bottom text-sm",
                            props.class
                        )
                    ),
                ],
                props.children ?? []
            ),
        ]
    )
}

export const TableHeader = (props: TableProps): Html => {
    const h = inertHtml

    return h.thead(
        [
            h.Class(
                joinClassName(
                    "[&_tr]:border-b-(length:--surface-border-width)",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}

export const TableBody = (props: TableProps): Html => {
    const h = inertHtml

    return h.tbody(
        [h.Class(joinClassName("[&_tr:last-child]:border-0", props.class))],
        props.children ?? []
    )
}

export const TableFooter = (props: TableProps): Html => {
    const h = inertHtml

    return h.tfoot(
        [
            h.Class(
                joinClassName(
                    "bg-primary font-medium text-primary-foreground",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}

export const TableRow = (props: TableRowProps): Html => {
    const h = inertHtml

    if (props.key !== undefined) {
        return h.keyed("tr")(
            props.key,
            [
                h.Class(
                    joinClassName(
                        "border-b-(length:--surface-border-width) transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                        props.class
                    )
                ),
            ],
            props.children ?? []
        )
    }

    return h.tr(
        [
            h.Class(
                joinClassName(
                    "border-b-(length:--surface-border-width) transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}

export const TableHead = (props: TableHeadProps): Html => {
    const h = inertHtml

    return h.th(
        [
            ...(props.ariaSort ? [h.AriaSort(props.ariaSort)] : []),
            h.Class(
                joinClassName(
                    "h-10 px-2 text-start align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pe-0",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}

export const TableCell = (props: TableProps): Html => {
    const h = inertHtml

    return h.td(
        [
            h.Class(
                joinClassName(
                    "p-2 align-middle [&:has([role=checkbox])]:pe-0",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}

export const TableCaption = (props: TableProps): Html => {
    const h = inertHtml

    return h.caption(
        [
            h.Class(
                joinClassName("mt-4 text-sm text-muted-foreground", props.class)
            ),
        ],
        props.children ?? []
    )
}

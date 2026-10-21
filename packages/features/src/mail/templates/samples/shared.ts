import { inertHtml } from "foldkit/html"
import type { Html } from "foldkit/html"

const h = inertHtml

// CONTAINER
// jsx-email Container renders as a centered table with default width and padding.
// We preserve that behavior with theme-aware defaults.

export const emailContainer = (
    extraStyle: Record<string, string>,
    children: ReadonlyArray<Html>,
    cellStyle?: Record<string, string>
): Html =>
    h.table(
        [
            h.Class("bg-card"),
            h.Style({
                width: "100%",
                borderCollapse: "collapse",
                borderSpacing: "0",
                margin: "0 auto",
                maxWidth: "600px",
                ...extraStyle,
            }),
        ],
        [
            h.tr(
                [],
                [h.td([h.Style({ padding: "0 48px", ...cellStyle })], children)]
            ),
        ]
    )

// SECTION
// jsx-email Section is a wrapper that applies padding and background.

export const emailSection = (
    props: {
        style?: Record<string, string>
        className?: string
        cellStyle?: Record<string, string>
        cellClassName?: string
    },
    children: ReadonlyArray<Html>
): Html =>
    h.table(
        [
            h.Class(props.className ?? ""),
            h.Style({
                width: "100%",
                borderCollapse: "collapse",
                borderSpacing: "0",
                ...props.style,
            }),
        ],
        [
            h.tr(
                [],
                [
                    h.td(
                        [
                            h.Class(props.cellClassName ?? ""),
                            h.Style({ ...props.cellStyle }),
                        ],
                        children
                    ),
                ]
            ),
        ]
    )

// TEXT
// jsx-email Text renders as a <p> with sensible defaults for email clients.

export const emailText = (
    props: {
        className?: string
        style?: Record<string, string>
    },
    children: ReadonlyArray<string | Html>
): Html =>
    h.p(
        [
            h.Class(props.className ?? "text-muted-foreground"),
            h.Style({
                fontSize: "16px",
                lineHeight: "24px",
                margin: "0 0 16px 0",
                ...props.style,
            }),
        ],
        children as ReadonlyArray<string>
    )

// HR

export const emailHr = (style?: Record<string, string>): Html =>
    h.hr([
        h.Class("border-border"),
        h.Style({
            border: "none",
            borderTop: "1px solid",
            margin: "20px 0",
            ...style,
        }),
    ])

// BUTTON

export const emailButton = (
    props: {
        href: string
        borderRadius?: number
        width?: number
        height?: number
        fontSize?: number
    },
    children: ReadonlyArray<string>
): Html => {
    const style: Record<string, string> = {
        borderRadius: `${props.borderRadius ?? 6}px`,
        width: props.width ? `${props.width}px` : "auto",
        height: props.height ? `${props.height}px` : "auto",
        lineHeight: props.height ? `${props.height}px` : "1.5",
        fontSize: `${props.fontSize ?? 14}px`,
        display: "inline-block",
        textAlign: "center",
        fontWeight: "500",
        textDecoration: "none",
    }

    if (props.width === undefined) {
        style.padding = "10px 24px"
    }

    return h.a(
        [
            h.Href(props.href),
            h.Class("bg-primary text-primary-foreground no-underline"),
            h.Style(style),
        ],
        children
    )
}

// ROW

export const emailRow = (
    cells: ReadonlyArray<{
        style?: Record<string, string>
        children: ReadonlyArray<Html>
    }>
): Html =>
    h.tr(
        [],
        cells.map((cell) =>
            h.td(
                [
                    h.Style({
                        verticalAlign: "top",
                        padding: "0",
                        ...cell.style,
                    }),
                ],
                cell.children
            )
        )
    )

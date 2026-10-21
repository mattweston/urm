import { type Html, inertHtml } from "foldkit/html"

export type TimelinePropsItem = Readonly<{
    title: Html
    description?: Html
    bullet?: Html
    class?: string
    bulletSize?: number
}>

export type TimelineProps = Readonly<{
    items: ReadonlyArray<TimelinePropsItem>
    activeItem: number
    bulletSize?: number
    lineSize?: number
}>

const DEFAULT_BULLET_SIZE = 16
const DEFAULT_LINE_SIZE = 2

const timelineItemBulletView = (
    bullet: Html | undefined,
    bulletSize: number,
    lineSize: number,
    isActive: boolean
): Html => {
    const h = inertHtml

    return h.div(
        [
            h.Class(
                `absolute top-0 flex items-center justify-center rounded-full border bg-background ${isActive ? "border-primary" : "border-border"}`
            ),
            h.Style({
                width: `${bulletSize}px`,
                height: `${bulletSize}px`,
                left: `${-bulletSize / 2 - lineSize / 2}px`,
                borderWidth: `${lineSize}px`,
            }),
            h.AriaHidden(true),
        ],
        bullet ? [bullet] : []
    )
}

const timelineItemView = (
    item: TimelinePropsItem,
    bulletSize: number,
    lineSize: number,
    isLast: boolean,
    isActive: boolean,
    isActiveBullet: boolean
): Html => {
    const h = inertHtml
    const resolvedBulletSize = item.bulletSize ?? bulletSize

    return h.li(
        [
            h.Class(
                `relative border-l pb-8 pl-8 ${isLast ? "border-l-transparent pb-0" : ""} ${isActive && !isLast ? "border-l-primary" : ""} ${item.class ?? ""}`.trim()
            ),
            h.Style({
                borderLeftWidth: `${lineSize}px`,
            }),
        ],
        [
            timelineItemBulletView(
                item.bullet,
                resolvedBulletSize,
                lineSize,
                isActiveBullet
            ),
            h.div(
                [h.Class("mb-1 text-base font-semibold leading-none")],
                [item.title]
            ),
            ...(item.description
                ? [
                      h.p(
                          [h.Class("text-sm text-muted-foreground")],
                          [item.description]
                      ),
                  ]
                : []),
        ]
    )
}

export const Timeline = (props: TimelineProps): Html => {
    const h = inertHtml
    const bulletSize = props.bulletSize ?? DEFAULT_BULLET_SIZE
    const lineSize = props.lineSize ?? DEFAULT_LINE_SIZE

    return h.ul(
        [
            h.Style({
                paddingLeft: `${bulletSize / 2}px`,
            }),
        ],
        props.items.map((item, index) =>
            timelineItemView(
                item,
                bulletSize,
                lineSize,
                index === props.items.length - 1,
                props.activeItem !== -1 && props.activeItem >= index + 1,
                props.activeItem !== -1 && props.activeItem >= index
            )
        )
    )
}

import { type Html, inertHtml as h } from "foldkit/html"
import { chart_card, type Datum } from "../../charting/bar-chart.view.ts"

export type StatsInput = Readonly<{
    domain_name: string | undefined
    projects: ReadonlyArray<Readonly<{ status: "backlog" | "active" | "done" }>>
    issues: ReadonlyArray<
        Readonly<{
            status: "open" | "in_progress" | "closed" | "archived" | "on_hold"
            priority: "low" | "medium" | "high" | "urgent" | undefined
        }>
    >
    events: ReadonlyArray<Readonly<{ published: boolean }>>
    media: ReadonlyArray<Readonly<{ kind: "image" | "video" }>>
    sites: ReadonlyArray<
        Readonly<{
            status: "draft" | "live" | "disabled"
            purpose:
                | "production"
                | "staging"
                | "prototype"
                | "survey"
                | "document"
        }>
    >
    tags: ReadonlyArray<
        Readonly<{
            id: string
            name: string
            color: string
            usage_count: number
        }>
    >
}>

export const emptyStatsInput = (): StatsInput => ({
    domain_name: undefined,
    projects: [],
    issues: [],
    events: [],
    media: [],
    sites: [],
    tags: [],
})

const count_where = <Item>(
    items: ReadonlyArray<Item>,
    predicate: (item: Item) => boolean
): number => items.filter(predicate).length

const datum = (label: string, value: number, color: string): Datum => ({
    label,
    value,
    color,
})

const project_data = (input: StatsInput): ReadonlyArray<Datum> => [
    datum(
        "Backlog",
        count_where(input.projects, (item) => item.status === "backlog"),
        "var(--muted-foreground)"
    ),
    datum(
        "Active",
        count_where(input.projects, (item) => item.status === "active"),
        "var(--chart-1)"
    ),
    datum(
        "Done",
        count_where(input.projects, (item) => item.status === "done"),
        "var(--chart-3)"
    ),
]

const issue_status_data = (input: StatsInput): ReadonlyArray<Datum> => [
    datum(
        "Open",
        count_where(input.issues, (item) => item.status === "open"),
        "var(--chart-1)"
    ),
    datum(
        "In progress",
        count_where(input.issues, (item) => item.status === "in_progress"),
        "var(--chart-2)"
    ),
    datum(
        "On hold",
        count_where(input.issues, (item) => item.status === "on_hold"),
        "var(--chart-5)"
    ),
    datum(
        "Closed",
        count_where(input.issues, (item) => item.status === "closed"),
        "var(--chart-3)"
    ),
    datum(
        "Archived",
        count_where(input.issues, (item) => item.status === "archived"),
        "var(--muted-foreground)"
    ),
]

const issue_priority_data = (input: StatsInput): ReadonlyArray<Datum> => [
    datum(
        "Urgent",
        count_where(input.issues, (item) => item.priority === "urgent"),
        "var(--chart-4)"
    ),
    datum(
        "High",
        count_where(input.issues, (item) => item.priority === "high"),
        "var(--destructive)"
    ),
    datum(
        "Medium",
        count_where(input.issues, (item) => item.priority === "medium"),
        "var(--chart-5)"
    ),
    datum(
        "Low",
        count_where(input.issues, (item) => item.priority === "low"),
        "var(--chart-1)"
    ),
    datum(
        "Unprioritized",
        count_where(input.issues, (item) => item.priority === undefined),
        "var(--muted-foreground)"
    ),
]

const publishing_data = (input: StatsInput): ReadonlyArray<Datum> => [
    datum(
        "Published events",
        count_where(input.events, (item) => item.published),
        "var(--chart-3)"
    ),
    datum(
        "Draft events",
        count_where(input.events, (item) => !item.published),
        "var(--chart-5)"
    ),
    datum(
        "Live sites",
        count_where(input.sites, (item) => item.status === "live"),
        "var(--chart-1)"
    ),
    datum(
        "Draft sites",
        count_where(input.sites, (item) => item.status === "draft"),
        "var(--chart-2)"
    ),
    datum(
        "Disabled sites",
        count_where(input.sites, (item) => item.status === "disabled"),
        "var(--muted-foreground)"
    ),
]

const media_data = (input: StatsInput): ReadonlyArray<Datum> => [
    datum(
        "Images",
        count_where(input.media, (item) => item.kind === "image"),
        "var(--chart-1)"
    ),
    datum(
        "Videos",
        count_where(input.media, (item) => item.kind === "video"),
        "var(--chart-2)"
    ),
    datum(
        "Tag assignments",
        input.tags.reduce((sum, tag) => sum + tag.usage_count, 0),
        "var(--chart-4)"
    ),
]

const site_purpose_data = (input: StatsInput): ReadonlyArray<Datum> => [
    datum(
        "Production",
        count_where(input.sites, (item) => item.purpose === "production"),
        "var(--chart-1)"
    ),
    datum(
        "Staging",
        count_where(input.sites, (item) => item.purpose === "staging"),
        "var(--chart-2)"
    ),
    datum(
        "Prototypes",
        count_where(input.sites, (item) => item.purpose === "prototype"),
        "var(--chart-3)"
    ),
    datum(
        "Surveys",
        count_where(input.sites, (item) => item.purpose === "survey"),
        "var(--chart-4)"
    ),
    datum(
        "Documents",
        count_where(input.sites, (item) => item.purpose === "document"),
        "var(--chart-5)"
    ),
]

const tag_data = (input: StatsInput): ReadonlyArray<Datum> =>
    [...input.tags]
        .sort((left, right) => right.usage_count - left.usage_count)
        .slice(0, 5)
        .map((tag) => datum(tag.name, tag.usage_count, tag.color))

export const chartsView = (input: StatsInput): Html =>
    h.div(
        [h.Class("grid gap-4 lg:grid-cols-2")],
        [
            chart_card(
                "Projects by status",
                "Current project pipeline.",
                project_data(input)
            ),
            chart_card(
                "Issues by status",
                "Current visible issue workflow.",
                issue_status_data(input)
            ),
            chart_card(
                "Issues by priority",
                "Priority assigned to visible issues.",
                issue_priority_data(input)
            ),
            chart_card(
                "Publishing state",
                "Events and domain sites available for publishing.",
                publishing_data(input)
            ),
            chart_card(
                "Media and tagging",
                "Library assets and entity-tag relationships.",
                media_data(input)
            ),
            chart_card(
                "Site purposes",
                "How domain sub-sites are being used.",
                site_purpose_data(input)
            ),
            chart_card(
                "Most-used tags",
                "The five tags with the most entity relationships.",
                tag_data(input)
            ),
        ]
    )

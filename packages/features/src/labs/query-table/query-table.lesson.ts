import { Array as Arr, Option } from "effect"
import { qualify } from "./query-table.data.ts"
import type { Query } from "./query-table.query.ts"
import { COUNT_STAR, JoinOn, NoJoin, empty_query } from "./query-table.query.ts"

export type Lesson = Readonly<{
    id: string
    keyword: string
    title: string
    brief: string
    takeaway: string
    query: Query
}>

const contact = (column: string) => qualify("contacts", column)
const company = (column: string) => qualify("companies", column)
const deal = (column: string) => qualify("deals", column)

const from_contacts = (overrides: Partial<Query>): Query => ({
    ...empty_query,
    ...overrides,
})

export const lessons: ReadonlyArray<Lesson> = [
    {
        id: "select",
        keyword: "SELECT",
        title: "Pick columns",
        brief: "SELECT chooses which columns come back. It never changes how many rows you get — only how wide each row is.",
        takeaway:
            "Untick a column and the row count stays at 24. Tick DISTINCT and rows collapse only when the remaining columns repeat.",
        query: from_contacts({
            selected_columns: [
                contact("first_name"),
                contact("last_name"),
                contact("city"),
                contact("country"),
            ],
        }),
    },
    {
        id: "where-and",
        keyword: "WHERE + AND",
        title: "Filter rows with AND",
        brief: "WHERE runs once per row and keeps the rows the test returns true for. Two conditions joined by AND must both hold.",
        takeaway:
            "Switch the combinator to OR and the result grows — AND narrows, OR widens.",
        query: from_contacts({
            conditions: [
                {
                    id: "c1",
                    column: contact("status"),
                    operator: "=",
                    value: "active",
                },
                {
                    id: "c2",
                    column: contact("country"),
                    operator: "=",
                    value: "USA",
                },
            ],
            combinator: "AND",
        }),
    },
    {
        id: "where-comparison",
        keyword: "WHERE >=",
        title: "Compare numbers",
        brief: "Comparison operators work on numeric columns. The value is read as a number, not as text.",
        takeaway:
            "lifetime_value >= 10000 keeps the big accounts. Change it to a text column and > compares alphabetically instead.",
        query: from_contacts({
            conditions: [
                {
                    id: "c1",
                    column: contact("lifetime_value"),
                    operator: ">=",
                    value: "10000",
                },
            ],
        }),
    },
    {
        id: "like",
        keyword: "LIKE",
        title: "Match text patterns",
        brief: "LIKE matches a pattern. % stands for any run of characters, _ for exactly one.",
        takeaway:
            "'%@kestrel.example' finds everyone at one domain. Swap to NOT LIKE for the complement.",
        query: from_contacts({
            selected_columns: [
                contact("first_name"),
                contact("last_name"),
                contact("email"),
            ],
            conditions: [
                {
                    id: "c1",
                    column: contact("email"),
                    operator: "LIKE",
                    value: "%@kestrel.example",
                },
            ],
        }),
    },
    {
        id: "is-null",
        keyword: "IS NULL",
        title: "Find missing values",
        brief: "NULL is not a value — it is the absence of one. `company_id = NULL` matches nothing, which is why SQL has a dedicated IS NULL test.",
        takeaway:
            "Four contacts have no company. Remember them: the next three lessons are about what joins do with these rows.",
        query: from_contacts({
            selected_columns: [
                contact("first_name"),
                contact("last_name"),
                contact("company_id"),
                contact("city"),
            ],
            conditions: [
                {
                    id: "c1",
                    column: contact("company_id"),
                    operator: "IS NULL",
                    value: "",
                },
            ],
        }),
    },
    {
        id: "inner-join",
        keyword: "INNER JOIN",
        title: "Keep only matches",
        brief: "A join pairs each row of one table with matching rows of another. INNER keeps only the pairs that matched.",
        takeaway:
            "24 contacts in, 20 rows out. The four with a NULL company_id vanished — an inner join silently drops them.",
        query: from_contacts({
            selected_columns: [
                contact("first_name"),
                contact("last_name"),
                company("name"),
                company("industry"),
            ],
            join: JoinOn({
                kind: "INNER",
                table: "companies",
                left_column: contact("company_id"),
                right_column: company("id"),
            }),
        }),
    },
    {
        id: "left-join",
        keyword: "LEFT JOIN",
        title: "Keep every left row",
        brief: "LEFT JOIN keeps every row of the left table. Where nothing matched, the right-hand columns come back NULL.",
        takeaway:
            "Back to 24 rows. The four company-less contacts return with an empty company name instead of disappearing.",
        query: from_contacts({
            selected_columns: [
                contact("first_name"),
                contact("last_name"),
                company("name"),
                company("industry"),
            ],
            join: JoinOn({
                kind: "LEFT",
                table: "companies",
                left_column: contact("company_id"),
                right_column: company("id"),
            }),
        }),
    },
    {
        id: "right-join",
        keyword: "RIGHT JOIN",
        title: "Keep every right row",
        brief: "RIGHT JOIN mirrors LEFT: every row of the joined table survives, even with no partner on the left.",
        takeaway:
            "Halcyon Robotics appears with a NULL contact. It has no contacts at all, so only a RIGHT or FULL join can show it.",
        query: from_contacts({
            selected_columns: [
                contact("first_name"),
                contact("last_name"),
                company("name"),
                company("country"),
            ],
            join: JoinOn({
                kind: "RIGHT",
                table: "companies",
                left_column: contact("company_id"),
                right_column: company("id"),
            }),
        }),
    },
    {
        id: "group-count",
        keyword: "GROUP BY + COUNT",
        title: "Count per group",
        brief: "GROUP BY collapses rows that share a value into one row, and aggregates summarise each group. COUNT(*) counts the rows that fell into it.",
        takeaway:
            "Once you group, a column may only be selected if it is in GROUP BY or wrapped in an aggregate — the panel will warn you.",
        query: from_contacts({
            selected_columns: [],
            group_by: [contact("country")],
            aggregates: [{ id: "a1", fn: "COUNT", column: COUNT_STAR }],
            order_by: Option.some({
                column: "COUNT(*)",
                direction: "DESC",
            }),
        }),
    },
    {
        id: "group-sum",
        keyword: "SUM / AVG",
        title: "Total per company",
        brief: "Join first, then group. The join widens the rows; the group collapses them along whichever column you name.",
        takeaway:
            "SUM adds a column across each group; AVG, MIN and MAX read the same rows a different way. NULLs are skipped, not counted as zero.",
        query: from_contacts({
            selected_columns: [],
            join: JoinOn({
                kind: "INNER",
                table: "companies",
                left_column: contact("company_id"),
                right_column: company("id"),
            }),
            group_by: [company("name")],
            aggregates: [
                { id: "a1", fn: "COUNT", column: COUNT_STAR },
                { id: "a2", fn: "SUM", column: contact("lifetime_value") },
                { id: "a3", fn: "AVG", column: contact("lifetime_value") },
            ],
            order_by: Option.some({
                column: "SUM(contacts.lifetime_value)",
                direction: "DESC",
            }),
        }),
    },
    {
        id: "having",
        keyword: "HAVING",
        title: "Filter the groups",
        brief: "WHERE filters rows before grouping; HAVING filters groups after. That is the only difference, and it is why you cannot put an aggregate in WHERE.",
        takeaway:
            "Watch the pipeline: WHERE and HAVING sit on opposite sides of GROUP BY, and the row count drops at different steps.",
        query: from_contacts({
            selected_columns: [],
            join: JoinOn({
                kind: "INNER",
                table: "companies",
                left_column: contact("company_id"),
                right_column: company("id"),
            }),
            group_by: [company("name")],
            aggregates: [{ id: "a1", fn: "COUNT", column: COUNT_STAR }],
            having: Option.some({
                fn: "COUNT",
                column: COUNT_STAR,
                operator: ">",
                value: "3",
            }),
        }),
    },
    {
        id: "order-limit",
        keyword: "ORDER BY + LIMIT",
        title: "Sort and take the top",
        brief: "ORDER BY runs last but one, over the rows SELECT produced. LIMIT then slices off the first n, and OFFSET skips ahead for the next page.",
        takeaway:
            "Without ORDER BY, LIMIT gives you an arbitrary handful — the database is free to return rows in any order.",
        query: from_contacts({
            selected_columns: [
                contact("first_name"),
                contact("last_name"),
                contact("country"),
                contact("lifetime_value"),
            ],
            order_by: Option.some({
                column: contact("lifetime_value"),
                direction: "DESC",
            }),
            limit: Option.some(5),
        }),
    },
    {
        id: "deals-join",
        keyword: "JOIN (one-to-many)",
        title: "Follow a second key",
        brief: "Joins are not limited to one shape. Here contacts join deals on the other side of the relationship: one contact, many deals.",
        takeaway:
            "A one-to-many join multiplies rows. 24 contacts become 22 rows here: only 19 of them have deals, and three of those have two.",
        query: from_contacts({
            selected_columns: [
                contact("first_name"),
                contact("last_name"),
                deal("title"),
                deal("amount"),
                deal("stage"),
            ],
            join: JoinOn({
                kind: "INNER",
                table: "deals",
                left_column: contact("id"),
                right_column: deal("contact_id"),
            }),
            order_by: Option.some({
                column: deal("amount"),
                direction: "DESC",
            }),
        }),
    },
]

export const lesson_by_id = (id: string): Option.Option<Lesson> =>
    Arr.findFirst(lessons, (lesson) => lesson.id === id)

export const reset_query: Query = { ...empty_query, join: NoJoin() }

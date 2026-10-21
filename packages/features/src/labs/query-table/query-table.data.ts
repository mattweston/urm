import { Array as Arr, Option, Schema as S, String as Str } from "effect"

export const TableName = S.Literals(["contacts", "companies", "deals"])
export type TableName = typeof TableName.Type

// Every cell is one of three shapes so the engine can compare, group, and
// render without knowing which table it came from. `null` is SQL NULL.
export type Cell = string | number | null

export type Row = Readonly<Record<string, Cell>>

export type ColumnKind = "text" | "number" | "date"

export type ColumnDef = Readonly<{
    name: string
    kind: ColumnKind
}>

export type TableDef = Readonly<{
    name: TableName
    columns: ReadonlyArray<ColumnDef>
    rows: ReadonlyArray<Row>
    note: string
}>

const contacts_columns: ReadonlyArray<ColumnDef> = [
    { name: "id", kind: "number" },
    { name: "first_name", kind: "text" },
    { name: "last_name", kind: "text" },
    { name: "email", kind: "text" },
    { name: "company_id", kind: "number" },
    { name: "city", kind: "text" },
    { name: "country", kind: "text" },
    { name: "status", kind: "text" },
    { name: "lifetime_value", kind: "number" },
    { name: "signed_up", kind: "date" },
]

// Four contacts carry a NULL company_id and company 7 has no contacts at all,
// so INNER / LEFT / RIGHT joins each produce a visibly different row count.
const contacts_rows: ReadonlyArray<Row> = [
    {
        id: 1,
        first_name: "Ada",
        last_name: "Whitfield",
        email: "ada.whitfield@northwind.example",
        company_id: 1,
        city: "Portland",
        country: "USA",
        status: "active",
        lifetime_value: 8400,
        signed_up: "2023-01-14",
    },
    {
        id: 2,
        first_name: "Marcus",
        last_name: "Bell",
        email: "marcus.bell@northwind.example",
        company_id: 1,
        city: "Portland",
        country: "USA",
        status: "active",
        lifetime_value: 3200,
        signed_up: "2023-02-02",
    },
    {
        id: 3,
        first_name: "Priya",
        last_name: "Raman",
        email: "priya.raman@acmelogistics.example",
        company_id: 2,
        city: "Chicago",
        country: "USA",
        status: "churned",
        lifetime_value: 15600,
        signed_up: "2022-11-30",
    },
    {
        id: 4,
        first_name: "Tomas",
        last_name: "Lindqvist",
        email: "tomas.lindqvist@acmelogistics.example",
        company_id: 2,
        city: "Chicago",
        country: "USA",
        status: "active",
        lifetime_value: 2400,
        signed_up: "2024-03-19",
    },
    {
        id: 5,
        first_name: "Nadia",
        last_name: "Okafor",
        email: "nadia.okafor@blueharbour.example",
        company_id: 3,
        city: "Bristol",
        country: "UK",
        status: "active",
        lifetime_value: 19800,
        signed_up: "2022-06-08",
    },
    {
        id: 6,
        first_name: "Ellis",
        last_name: "Grant",
        email: "ellis.grant@blueharbour.example",
        company_id: 3,
        city: "Bristol",
        country: "UK",
        status: "lead",
        lifetime_value: 0,
        signed_up: "2025-01-22",
    },
    {
        id: 7,
        first_name: "Sofia",
        last_name: "Marchetti",
        email: "sofia.marchetti@meridian.example",
        company_id: 4,
        city: "Perth",
        country: "Australia",
        status: "active",
        lifetime_value: 42500,
        signed_up: "2021-09-05",
    },
    {
        id: 8,
        first_name: "Ben",
        last_name: "Aoki",
        email: "ben.aoki@meridian.example",
        company_id: 4,
        city: "Perth",
        country: "Australia",
        status: "active",
        lifetime_value: 7300,
        signed_up: "2023-07-11",
    },
    {
        id: 9,
        first_name: "Hana",
        last_name: "Fujimoto",
        email: "hana.fujimoto@kestrel.example",
        company_id: 5,
        city: "Toronto",
        country: "Canada",
        status: "active",
        lifetime_value: 5100,
        signed_up: "2024-01-08",
    },
    {
        id: 10,
        first_name: "Owen",
        last_name: "Baptiste",
        email: "owen.baptiste@kestrel.example",
        company_id: 5,
        city: "Montreal",
        country: "Canada",
        status: "lead",
        lifetime_value: 0,
        signed_up: "2025-04-02",
    },
    {
        id: 11,
        first_name: "Ciara",
        last_name: "Doyle",
        email: "ciara.doyle@vantagefoods.example",
        company_id: 6,
        city: "Cork",
        country: "Ireland",
        status: "active",
        lifetime_value: 11200,
        signed_up: "2022-08-17",
    },
    {
        id: 12,
        first_name: "Liam",
        last_name: "Ferris",
        email: "liam.ferris@vantagefoods.example",
        company_id: 6,
        city: "Cork",
        country: "Ireland",
        status: "churned",
        lifetime_value: 6400,
        signed_up: "2021-12-01",
    },
    {
        id: 13,
        first_name: "Rosa",
        last_name: "Delgado",
        email: "rosa.delgado@northwind.example",
        company_id: 1,
        city: "Seattle",
        country: "USA",
        status: "lead",
        lifetime_value: 0,
        signed_up: "2025-05-13",
    },
    {
        id: 14,
        first_name: "Jonah",
        last_name: "Krieger",
        email: "jonah.krieger@acmelogistics.example",
        company_id: 2,
        city: "Denver",
        country: "USA",
        status: "active",
        lifetime_value: 9700,
        signed_up: "2023-10-27",
    },
    {
        id: 15,
        first_name: "Mei Lin",
        last_name: "Chow",
        email: "meilin.chow@blueharbour.example",
        company_id: 3,
        city: "London",
        country: "UK",
        status: "active",
        lifetime_value: 23400,
        signed_up: "2023-03-30",
    },
    {
        id: 16,
        first_name: "Felix",
        last_name: "Sandoval",
        email: "felix.sandoval@meridian.example",
        company_id: 4,
        city: "Brisbane",
        country: "Australia",
        status: "churned",
        lifetime_value: 3800,
        signed_up: "2022-02-14",
    },
    {
        id: 17,
        first_name: "Greta",
        last_name: "Halvorsen",
        email: "greta.halvorsen@kestrel.example",
        company_id: 5,
        city: "Vancouver",
        country: "Canada",
        status: "active",
        lifetime_value: 6600,
        signed_up: "2024-06-21",
    },
    {
        id: 18,
        first_name: "Ayo",
        last_name: "Balogun",
        email: "ayo.balogun@vantagefoods.example",
        company_id: 6,
        city: "Dublin",
        country: "Ireland",
        status: "active",
        lifetime_value: 14100,
        signed_up: "2023-05-04",
    },
    {
        id: 19,
        first_name: "Iris",
        last_name: "Novak",
        email: "iris.novak@freelance.example",
        company_id: null,
        city: "Ljubljana",
        country: "Slovenia",
        status: "lead",
        lifetime_value: 0,
        signed_up: "2025-02-11",
    },
    {
        id: 20,
        first_name: "Dmitri",
        last_name: "Sokolov",
        email: "dmitri.sokolov@freelance.example",
        company_id: null,
        city: "Riga",
        country: "Latvia",
        status: "active",
        lifetime_value: 2100,
        signed_up: "2024-09-16",
    },
    {
        id: 21,
        first_name: "Amara",
        last_name: "Nwosu",
        email: "amara.nwosu@freelance.example",
        company_id: null,
        city: "Lagos",
        country: "Nigeria",
        status: "active",
        lifetime_value: 4700,
        signed_up: "2024-11-05",
    },
    {
        id: 22,
        first_name: "Caleb",
        last_name: "Yates",
        email: "caleb.yates@northwind.example",
        company_id: 1,
        city: "Austin",
        country: "USA",
        status: "active",
        lifetime_value: 5300,
        signed_up: "2024-04-23",
    },
    {
        id: 23,
        first_name: "Yuki",
        last_name: "Tanabe",
        email: "yuki.tanabe@kestrel.example",
        company_id: 5,
        city: "Ottawa",
        country: "Canada",
        status: "lead",
        lifetime_value: 0,
        signed_up: "2025-06-30",
    },
    {
        id: 24,
        first_name: "Paulo",
        last_name: "Cardoso",
        email: "paulo.cardoso@freelance.example",
        company_id: null,
        city: "Lisbon",
        country: "Portugal",
        status: "churned",
        lifetime_value: 900,
        signed_up: "2022-04-19",
    },
]

const companies_columns: ReadonlyArray<ColumnDef> = [
    { name: "id", kind: "number" },
    { name: "name", kind: "text" },
    { name: "industry", kind: "text" },
    { name: "employees", kind: "number" },
    { name: "country", kind: "text" },
]

const companies_rows: ReadonlyArray<Row> = [
    {
        id: 1,
        name: "Northwind Traders",
        industry: "Retail",
        employees: 240,
        country: "USA",
    },
    {
        id: 2,
        name: "Acme Logistics",
        industry: "Logistics",
        employees: 1200,
        country: "USA",
    },
    {
        id: 3,
        name: "Blue Harbour Labs",
        industry: "Biotech",
        employees: 85,
        country: "UK",
    },
    {
        id: 4,
        name: "Meridian Energy",
        industry: "Energy",
        employees: 4300,
        country: "Australia",
    },
    {
        id: 5,
        name: "Kestrel Software",
        industry: "Software",
        employees: 60,
        country: "Canada",
    },
    {
        id: 6,
        name: "Vantage Foods",
        industry: "Food",
        employees: 900,
        country: "Ireland",
    },
    {
        id: 7,
        name: "Halcyon Robotics",
        industry: "Manufacturing",
        employees: 150,
        country: "Germany",
    },
]

const deals_columns: ReadonlyArray<ColumnDef> = [
    { name: "id", kind: "number" },
    { name: "contact_id", kind: "number" },
    { name: "title", kind: "text" },
    { name: "amount", kind: "number" },
    { name: "stage", kind: "text" },
    { name: "closed_on", kind: "date" },
]

// Won deal amounts add up to each contact's lifetime_value, so
// SUM(deals.amount) GROUP BY contact reproduces a column already in the data.
const deals_rows: ReadonlyArray<Row> = [
    {
        id: 1,
        contact_id: 1,
        title: "Q1 Retail Rollout",
        amount: 4800,
        stage: "won",
        closed_on: "2023-03-30",
    },
    {
        id: 2,
        contact_id: 1,
        title: "Loyalty Add-on",
        amount: 3600,
        stage: "won",
        closed_on: "2023-11-12",
    },
    {
        id: 3,
        contact_id: 2,
        title: "Signage Refresh",
        amount: 3200,
        stage: "open",
        closed_on: null,
    },
    {
        id: 4,
        contact_id: 3,
        title: "Fleet Analytics",
        amount: 15600,
        stage: "won",
        closed_on: "2022-12-15",
    },
    {
        id: 5,
        contact_id: 4,
        title: "Route Optimisation",
        amount: 2400,
        stage: "open",
        closed_on: null,
    },
    {
        id: 6,
        contact_id: 5,
        title: "Sequencing Pilot",
        amount: 9800,
        stage: "won",
        closed_on: "2022-09-01",
    },
    {
        id: 7,
        contact_id: 5,
        title: "Lab Expansion",
        amount: 10000,
        stage: "won",
        closed_on: "2023-05-20",
    },
    {
        id: 8,
        contact_id: 7,
        title: "Grid Monitoring",
        amount: 28000,
        stage: "won",
        closed_on: "2021-11-19",
    },
    {
        id: 9,
        contact_id: 7,
        title: "Turbine Retrofit",
        amount: 14500,
        stage: "won",
        closed_on: "2022-08-08",
    },
    {
        id: 10,
        contact_id: 8,
        title: "Site Survey",
        amount: 7300,
        stage: "won",
        closed_on: "2023-08-30",
    },
    {
        id: 11,
        contact_id: 9,
        title: "Team Licences",
        amount: 5100,
        stage: "won",
        closed_on: "2024-02-14",
    },
    {
        id: 12,
        contact_id: 11,
        title: "Cold Chain Audit",
        amount: 11200,
        stage: "won",
        closed_on: "2022-10-05",
    },
    {
        id: 13,
        contact_id: 12,
        title: "Packaging Redesign",
        amount: 6400,
        stage: "lost",
        closed_on: "2022-01-28",
    },
    {
        id: 14,
        contact_id: 14,
        title: "Depot Automation",
        amount: 9700,
        stage: "won",
        closed_on: "2023-12-01",
    },
    {
        id: 15,
        contact_id: 15,
        title: "Assay Platform",
        amount: 23400,
        stage: "won",
        closed_on: "2023-06-15",
    },
    {
        id: 16,
        contact_id: 16,
        title: "Solar Feasibility",
        amount: 3800,
        stage: "lost",
        closed_on: "2022-05-09",
    },
    {
        id: 17,
        contact_id: 17,
        title: "Editor Seats",
        amount: 6600,
        stage: "won",
        closed_on: "2024-08-02",
    },
    {
        id: 18,
        contact_id: 18,
        title: "Traceability Suite",
        amount: 14100,
        stage: "won",
        closed_on: "2023-07-19",
    },
    {
        id: 19,
        contact_id: 20,
        title: "Consulting Retainer",
        amount: 2100,
        stage: "won",
        closed_on: "2024-10-30",
    },
    {
        id: 20,
        contact_id: 21,
        title: "Onboarding Sprint",
        amount: 4700,
        stage: "won",
        closed_on: "2025-01-15",
    },
    {
        id: 21,
        contact_id: 22,
        title: "Store Pilot",
        amount: 5300,
        stage: "won",
        closed_on: "2024-06-11",
    },
    {
        id: 22,
        contact_id: 24,
        title: "Menu Analytics",
        amount: 900,
        stage: "lost",
        closed_on: "2022-06-24",
    },
]

export const tables: Readonly<Record<TableName, TableDef>> = {
    contacts: {
        name: "contacts",
        columns: contacts_columns,
        rows: contacts_rows,
        note: "People. Four have no company_id.",
    },
    companies: {
        name: "companies",
        columns: companies_columns,
        rows: companies_rows,
        note: "Organisations. Halcyon Robotics has no contacts.",
    },
    deals: {
        name: "deals",
        columns: deals_columns,
        rows: deals_rows,
        note: "Opportunities. Open deals have a NULL closed_on.",
    },
}

export const table_names: ReadonlyArray<TableName> = [
    "contacts",
    "companies",
    "deals",
]

export const table_of = (name: TableName): TableDef => tables[name]

export const qualify = (table: TableName, column: string): string =>
    `${table}.${column}`

export const qualified_columns = (table: TableName): ReadonlyArray<string> =>
    Arr.map(table_of(table).columns, (column) => qualify(table, column.name))

const decode_table_name = S.decodeUnknownOption(TableName)

type QualifiedParts = Readonly<{
    table: TableName
    column: string
}>

const split_qualified = (
    qualified_column: string
): Option.Option<QualifiedParts> => {
    const parts = Str.split(qualified_column, ".")

    return Option.all({
        table: Option.flatMap(Arr.get(parts, 0), decode_table_name),
        column: Arr.get(parts, 1),
    })
}

export const kind_of = (qualified_column: string): ColumnKind =>
    Option.match(split_qualified(qualified_column), {
        onNone: () => "text",
        onSome: ({ table, column }) =>
            Option.match(
                Arr.findFirst(
                    table_of(table).columns,
                    (candidate) => candidate.name === column
                ),
                {
                    onNone: () => "text",
                    onSome: (definition) => definition.kind,
                }
            ),
    })

export const is_known_column = (qualified_column: string): boolean =>
    Option.match(split_qualified(qualified_column), {
        onNone: () => false,
        onSome: ({ table, column }) =>
            Arr.some(
                table_of(table).columns,
                (candidate) => candidate.name === column
            ),
    })

const cell_to_text = (cell: Cell): string => (cell === null ? "" : String(cell))

// Powers the value picker in WHERE: low-cardinality columns get a dropdown so
// learners spend their attention on the operator, not on spelling.
export const distinct_values = (
    qualified_column: string
): ReadonlyArray<string> =>
    Option.match(split_qualified(qualified_column), {
        onNone: () => [],
        onSome: ({ table, column }) =>
            Arr.sort(
                Arr.dedupe(
                    Arr.filter(
                        Arr.map(table_of(table).rows, (row) =>
                            cell_to_text(row[column] ?? null)
                        ),
                        (value) => value !== ""
                    )
                ),
                Str.Order
            ),
    })

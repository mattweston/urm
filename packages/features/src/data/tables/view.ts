import { Option } from "effect"
import * as Spreadsheet from "../../spreadsheet/index.ts"
import type { RawRow } from "@urm/domain/schemas/data-tables"
import { normalize_contact } from "@urm/domain/contact-import"
import { data_templates } from "@urm/domain/data-templates"
import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Model } from "./model.ts"
import * as Msg from "./message.ts"
import { mapped_rows, preview_errors, selected_table } from "./update.ts"

const control =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground"
const button_class =
    "rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
const button = (
    h: HtmlBuilder<Msg.Message>,
    label: string,
    message: Msg.Message,
    disabled = false
) =>
    h.button(
        [
            h.Type("button"),
            h.Class(button_class),
            h.Disabled(disabled),
            h.OnClick(message),
        ],
        [label]
    )
const field = (
    h: HtmlBuilder<Msg.Message>,
    id: string,
    label: string,
    value: string,
    changed: (value: string) => Msg.Message
) =>
    h.div(
        [h.Class("space-y-1")],
        [
            h.label([h.For(id), h.Class("block text-sm font-medium")], [label]),
            h.input([
                h.Id(id),
                h.Name(id),
                h.Class(control),
                h.Value(value),
                h.OnInput(changed),
            ]),
        ]
    )
const select = (
    h: HtmlBuilder<Msg.Message>,
    id: string,
    label: string,
    value: string,
    options: ReadonlyArray<readonly [string, string]>,
    changed: (value: string) => Msg.Message
) =>
    h.div(
        [h.Class("space-y-1")],
        [
            h.label([h.For(id), h.Class("block text-sm font-medium")], [label]),
            h.select(
                [
                    h.Id(id),
                    h.Name(id),
                    h.Class(control),
                    h.Value(value),
                    h.OnInput(changed),
                ],
                options.map(([value, label]) =>
                    h.option([h.Value(value)], [label])
                )
            ),
        ]
    )
const schema_form = (model: Model, h: HtmlBuilder<Msg.Message>): Html =>
    h.form(
        [
            h.OnSubmit(Msg.SubmittedCreate()),
            h.AriaLabel("Table schema"),
            h.Class("space-y-4 rounded-lg border border-border p-4"),
        ],
        [
            h.h2([h.Class("text-lg font-semibold")], ["Create a table"]),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                data_templates.map((template) =>
                    button(
                        h,
                        `Use ${template.name} template`,
                        Msg.SelectedTemplate({ id: template.id })
                    )
                )
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Templates create editable custom tables. They do not create Mail contacts, calendar events, or shop products. Review the fields before saving.",
                ]
            ),
            field(h, "table-name", "Table name", model.name, (value) =>
                Msg.ChangedName({ value })
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Define up to 32 columns. Keys use lowercase letters, numbers, and underscores, starting with a letter. Saved column definitions are fixed in this first version.",
                ]
            ),
            ...model.columns.map((column, index) =>
                h.fieldset(
                    [h.Class("space-y-3 rounded-md border border-border p-3")],
                    [
                        h.legend(
                            [h.Class("px-1 text-sm font-medium")],
                            [`Column ${index + 1}`]
                        ),
                        h.div(
                            [h.Class("grid gap-3 md:grid-cols-3")],
                            [
                                field(
                                    h,
                                    `column-name-${index}`,
                                    "Name",
                                    column.name,
                                    (value) =>
                                        Msg.ChangedColumn({
                                            index,
                                            field: "name",
                                            value,
                                        })
                                ),
                                field(
                                    h,
                                    `column-key-${index}`,
                                    "Key",
                                    column.key,
                                    (value) =>
                                        Msg.ChangedColumn({
                                            index,
                                            field: "key",
                                            value,
                                        })
                                ),
                                select(
                                    h,
                                    `column-type-${index}`,
                                    "Type",
                                    column.type,
                                    [
                                        ["text", "Text"],
                                        ["number", "Number"],
                                        ["boolean", "Boolean"],
                                        ["date", "Date"],
                                        ["choice", "Choice"],
                                    ],
                                    (value) =>
                                        Msg.ChangedColumn({
                                            index,
                                            field: "type",
                                            value,
                                        })
                                ),
                                select(
                                    h,
                                    `column-required-${index}`,
                                    "Required",
                                    String(column.required),
                                    [
                                        ["false", "Optional"],
                                        ["true", "Required"],
                                    ],
                                    (value) =>
                                        Msg.ChangedColumn({
                                            index,
                                            field: "required",
                                            value,
                                        })
                                ),
                                field(
                                    h,
                                    `column-default-${index}`,
                                    "Default value (optional)",
                                    column.default_value,
                                    (value) =>
                                        Msg.ChangedColumn({
                                            index,
                                            field: "default_value",
                                            value,
                                        })
                                ),
                                ...(column.type === "choice"
                                    ? [
                                          field(
                                              h,
                                              `column-choices-${index}`,
                                              "Choices (comma separated)",
                                              column.choices,
                                              (value) =>
                                                  Msg.ChangedColumn({
                                                      index,
                                                      field: "choices",
                                                      value,
                                                  })
                                          ),
                                      ]
                                    : []),
                            ]
                        ),
                        button(
                            h,
                            "Remove column",
                            Msg.RemovedColumn({ index }),
                            model.columns.length === 1 || model.busy
                        ),
                    ]
                )
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                [
                    button(
                        h,
                        "Add column",
                        Msg.AddedColumn(),
                        model.columns.length >= 32 || model.busy
                    ),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Class(button_class),
                            h.Disabled(model.busy),
                        ],
                        [model.busy ? "Creating…" : "Create table"]
                    ),
                    button(h, "Cancel", Msg.CancelledEdit(), model.busy),
                ]
            ),
        ]
    )
const row_form = (model: Model, h: HtmlBuilder<Msg.Message>): Html => {
    const table = selected_table(model)
    return h.form(
        [
            h.OnSubmit(Msg.SubmittedRow()),
            h.AriaLabel("Table row"),
            h.Class("space-y-4 rounded-md border border-border p-4"),
        ],
        [
            h.h3(
                [h.Class("font-semibold")],
                [model.editing_id === "new" ? "Add row" : "Edit row"]
            ),
            h.div(
                [h.Class("grid gap-3 md:grid-cols-3")],
                (table?.columns ?? []).map((column) => {
                    const label = `${column.name}${column.required ? " (required)" : ""}`
                    const value = model.draft[column.key] ?? ""
                    const changed = (value: string) =>
                        Msg.ChangedCell({ key: column.key, value })
                    if (column.type === "choice" || column.type === "boolean") {
                        const options: ReadonlyArray<
                            readonly [string, string]
                        > =
                            column.type === "boolean"
                                ? [
                                      ["true", "True"],
                                      ["false", "False"],
                                  ]
                                : column.choices.map((choice) => [
                                      choice,
                                      choice,
                                  ])
                        return select(
                            h,
                            `cell-${column.key}`,
                            label,
                            value,
                            [["", "Empty / default"], ...options],
                            changed
                        )
                    }
                    return field(
                        h,
                        `cell-${column.key}`,
                        `${label} · ${column.type === "date" ? "YYYY-MM-DD" : column.type}`,
                        value,
                        changed
                    )
                })
            ),
            h.div(
                [h.Class("flex gap-2")],
                [
                    h.button(
                        [
                            h.Type("submit"),
                            h.Class(button_class),
                            h.Disabled(model.busy),
                        ],
                        [model.busy ? "Saving…" : "Save row"]
                    ),
                    button(h, "Cancel", Msg.CancelledEdit(), model.busy),
                ]
            ),
        ]
    )
}
const import_view = (
    model: Model,
    h: HtmlBuilder<Msg.Message>,
    source_locked = false
): Html => {
    const table = selected_table(model)
    const headers = Object.keys(model.source_rows[0] ?? {})
    const errors = model.previewed ? preview_errors(model) : []
    return h.section(
        [h.Class("space-y-3 rounded-md border border-border p-4")],
        [
            h.h3(
                [h.Class("font-semibold")],
                [
                    source_locked
                        ? "Column mapping"
                        : "Import an existing CSV upload",
                ]
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Map source columns to table columns. Each import supports up to 200 rows and 100,000 characters. Imports append rows; they do not replace existing records.",
                ]
            ),
            ...(model.contact_import
                ? [
                      h.p(
                          [],
                          [
                              "Destination: Mail contacts. Name and email are required. Text fields are trimmed and email is lowercased. Duplicate emails in the file block validation; existing emails are checked when saving. Any conflict rejects the entire batch. No existing contact is overwritten.",
                          ]
                      ),
                  ]
                : []),
            ...(headers.length > 0
                ? [
                      h.p(
                          [],
                          [
                              `Columns excluded from import: ${headers.filter((header) => !Object.values(model.mapping).includes(header)).join(", ") || "none"}`,
                          ]
                      ),
                  ]
                : []),
            ...(!source_locked
                ? [
                      select(
                          h,
                          "table-upload",
                          "CSV upload",
                          model.upload_id,
                          [
                              ["", "Choose an upload"],
                              ...model.uploads.map(
                                  (upload): readonly [string, string] => [
                                      upload.id,
                                      upload.filename,
                                  ]
                              ),
                          ],
                          (id) => Msg.SelectedUpload({ id })
                      ),
                      button(h, "Load columns", Msg.ReadUpload(), model.busy),
                  ]
                : []),
            ...(model.busy ? [h.p([h.Role("status")], ["Working…"])] : []),
            ...(model.source_rows.length > 0
                ? [
                      h.div(
                          [h.Class("grid gap-3 md:grid-cols-3")],
                          (table?.columns ?? []).map((column) =>
                              select(
                                  h,
                                  `map-${column.key}`,
                                  `${column.name}${column.required ? " (required)" : " (optional)"}`,
                                  model.mapping[column.key] ?? "",
                                  [
                                      ["", "Empty / default"],
                                      ...headers.map(
                                          (
                                              header
                                          ): readonly [string, string] => [
                                              header,
                                              header,
                                          ]
                                      ),
                                  ],
                                  (value) =>
                                      Msg.ChangedMapping({
                                          key: column.key,
                                          value,
                                      })
                              )
                          )
                      ),
                      button(
                          h,
                          "Preview import",
                          Msg.PreviewedImport(),
                          model.busy
                      ),
                      ...(model.previewed
                          ? [
                                h.p(
                                    [h.Role("status")],
                                    [
                                        errors.length === 0
                                            ? `${model.source_rows.length} rows validated`
                                            : `${errors.length} validation errors`,
                                    ]
                                ),
                                ...errors
                                    .slice(0, 10)
                                    .map((error) =>
                                        h.p(
                                            [
                                                h.Class(
                                                    "text-sm text-destructive"
                                                ),
                                            ],
                                            [error]
                                        )
                                    ),
                                ...(errors.length === 0
                                    ? [
                                          h.div(
                                              [h.Class("overflow-auto")],
                                              [
                                                  h.table(
                                                      [
                                                          h.Class(
                                                              "w-full text-sm"
                                                          ),
                                                      ],
                                                      [
                                                          h.caption(
                                                              [
                                                                  h.Class(
                                                                      "text-left"
                                                                  ),
                                                              ],
                                                              [
                                                                  "Preview: first five rows",
                                                              ]
                                                          ),
                                                          h.thead(
                                                              [],
                                                              [
                                                                  h.tr(
                                                                      [],
                                                                      (
                                                                          table?.columns ??
                                                                          []
                                                                      ).map(
                                                                          (
                                                                              column
                                                                          ) =>
                                                                              h.th(
                                                                                  [
                                                                                      h.Class(
                                                                                          "p-2 text-left"
                                                                                      ),
                                                                                  ],
                                                                                  [
                                                                                      column.name,
                                                                                  ]
                                                                              )
                                                                      )
                                                                  ),
                                                              ]
                                                          ),
                                                          h.tbody(
                                                              [],
                                                              mapped_rows(model)
                                                                  .map(
                                                                      (
                                                                          row
                                                                      ): RawRow =>
                                                                          model.contact_import
                                                                              ? normalize_contact(
                                                                                    row
                                                                                )
                                                                              : row
                                                                  )
                                                                  .slice(0, 5)
                                                                  .map((row) =>
                                                                      h.tr(
                                                                          [],
                                                                          (
                                                                              table?.columns ??
                                                                              []
                                                                          ).map(
                                                                              (
                                                                                  column
                                                                              ) =>
                                                                                  h.td(
                                                                                      [
                                                                                          h.Class(
                                                                                              "border-t border-border p-2"
                                                                                          ),
                                                                                      ],
                                                                                      [
                                                                                          row[
                                                                                              column
                                                                                                  .key
                                                                                          ] ||
                                                                                              column.default_value ||
                                                                                              "—",
                                                                                      ]
                                                                                  )
                                                                          )
                                                                      )
                                                                  )
                                                          ),
                                                      ]
                                                  ),
                                              ]
                                          ),
                                          button(
                                              h,
                                              `Import ${model.source_rows.length} rows`,
                                              Msg.SubmittedImport(),
                                              model.busy
                                          ),
                                      ]
                                    : []),
                            ]
                          : []),
                  ]
                : []),
        ]
    )
}
export const view = Submodel.defineView<Model, Msg.Message>((model, h) => {
    const table = selected_table(model)
    return h.fieldset(
        [h.Class("min-w-0 space-y-4 p-4 sm:p-6"), h.Disabled(model.busy)],
        [
            h.div(
                [h.Class("flex flex-wrap items-end justify-between gap-4")],
                [
                    model.tables.length > 0
                        ? select(
                              h,
                              "selected-table",
                              "Table",
                              model.selected_id,
                              [
                                  ["", "Choose a table"],
                                  ...model.tables.map(
                                      (table): readonly [string, string] => [
                                          table.id,
                                          `${table.name} (${table.row_count} rows)`,
                                      ]
                                  ),
                              ],
                              (id) => Msg.SelectedTable({ id })
                          )
                        : h.p(
                              [h.Class("text-sm text-muted-foreground")],
                              [
                                  model.loaded
                                      ? "Create a table to start your spreadsheet."
                                      : "Loading tables…",
                              ]
                          ),
                    ...(model.can_write
                        ? [
                              h.div(
                                  [h.Class("flex flex-wrap gap-2")],
                                  [
                                      button(
                                          h,
                                          "Create table",
                                          Msg.StartedCreate(),
                                          model.busy ||
                                              Option.isSome(model.cell_edit)
                                      ),
                                      ...(table !== undefined
                                          ? [
                                                button(
                                                    h,
                                                    "Add row",
                                                    Msg.StartedRow({ id: "" }),
                                                    model.busy ||
                                                        model.editing_id !==
                                                            "" ||
                                                        Option.isSome(
                                                            model.cell_edit
                                                        )
                                                ),
                                            ]
                                          : []),
                                  ]
                              ),
                          ]
                        : []),
                ]
            ),
            ...(model.error !== ""
                ? [
                      h.p(
                          [
                              h.Role("alert"),
                              h.Class(
                                  "whitespace-pre-wrap text-sm text-destructive"
                              ),
                          ],
                          [model.error]
                      ),
                  ]
                : []),
            ...(model.notice !== "" && table === undefined
                ? [h.p([h.Role("status")], [model.notice])]
                : []),
            ...(model.creating && model.can_write
                ? [schema_form(model, h)]
                : []),
            ...(model.editing_id !== "" && model.can_write
                ? [row_form(model, h)]
                : []),
            ...(table !== undefined
                ? [
                      h.submodel({
                          slotId: "data-canonical-spreadsheet",
                          model: model.spreadsheet,
                          view: Spreadsheet.view,
                          toParentMessage: (message) =>
                              Msg.GotSpreadsheetMessage({ message }),
                      }),
                  ]
                : model.tables.length > 0 && !model.creating
                  ? [
                        h.p(
                            [h.Class("text-sm text-muted-foreground")],
                            ["Choose a table above to view its rows."]
                        ),
                    ]
                  : []),
            ...(table !== undefined
                ? [
                      h.p(
                          [h.Class("text-sm text-muted-foreground")],
                          [
                              model.can_write
                                  ? "Double-click a cell or press Enter to edit. Values follow the table’s column types; text beginning with = is stored literally."
                                  : "Read-only table. An administrator can edit its records.",
                          ]
                      ),
                      ...(model.can_write
                          ? [
                                h.details(
                                    [
                                        h.Class(
                                            "rounded-lg border border-border p-4"
                                        ),
                                    ],
                                    [
                                        h.summary(
                                            [
                                                h.Class(
                                                    "cursor-pointer text-sm font-medium"
                                                ),
                                            ],
                                            ["Import CSV rows"]
                                        ),
                                        import_view(model, h),
                                    ]
                                ),
                            ]
                          : []),
                  ]
                : []),
        ]
    )
})

export const import_panel = Submodel.defineView<Model, Msg.Message>(
    (model, h) => import_view(model, h, true)
)

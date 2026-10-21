import * as Tables from "./tables/view.ts"
import {
    ClosedCsvImport,
    SelectedImportTable,
    GotTableMessage,
} from "./message.ts"
import { Match as M } from "effect"
import { Submodel } from "foldkit"
import type { Html } from "foldkit/html"
import * as CsvUpload from "./upload-csv/index.ts"
import { GotCsvUploadMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"
import { spreadsheetsHref } from "./route.ts"

export const view = Submodel.defineView<Model, Message>((model, h) =>
    M.value(model.route).pipe(
        M.withReturnType<Html>(),
        M.when("Home", () =>
            h.submodel({
                slotId: "data-tables",
                model: model.tables,
                view: Tables.view,
                toParentMessage: (message) => GotTableMessage({ message }),
            })
        ),
        M.when("Csv", () =>
            model.csv_import_open
                ? h.fieldset(
                      [
                          h.Disabled(model.tables.busy),
                          h.Class("min-w-0 space-y-4 p-6 md:p-8"),
                      ],
                      [
                          h.h1(
                              [
                                  h.Id("csv-import-heading"),
                                  h.Tabindex(-1),
                                  h.Class("text-2xl font-semibold"),
                              ],
                              [
                                  model.tables.contact_import
                                      ? "Import CSV into Mail contacts"
                                      : "Import CSV into table",
                              ]
                          ),
                          h.p(
                              [],
                              [
                                  model.csvUpload.uploads.find(
                                      (upload) =>
                                          upload.id === model.tables.upload_id
                                  )?.filename ?? "CSV upload",
                              ]
                          ),
                          h.button(
                              [
                                  h.Type("button"),
                                  h.Class(
                                      "rounded-md border border-input px-3 py-2"
                                  ),
                                  h.OnClick(ClosedCsvImport()),
                              ],
                              ["Back to CSV uploads"]
                          ),
                          ...(model.tables.notice !== ""
                              ? [h.p([h.Role("status")], [model.tables.notice])]
                              : []),
                          ...(model.tables.error !== ""
                              ? [
                                    h.p(
                                        [
                                            h.Role("alert"),
                                            h.Class("text-destructive"),
                                        ],
                                        [model.tables.error]
                                    ),
                                ]
                              : []),
                          ...(model.tables.contact_import
                              ? [
                                    h.submodel({
                                        slotId: "csv-contact-mapping",
                                        model: model.tables,
                                        view: Tables.import_panel,
                                        toParentMessage: (message) =>
                                            GotTableMessage({ message }),
                                    }),
                                ]
                              : model.tables.tables.length === 0
                                ? [
                                      h.p(
                                          [],
                                          [
                                              "Create a table before importing this upload.",
                                          ]
                                      ),
                                      h.a(
                                          [
                                              h.Href(spreadsheetsHref()),
                                              h.Class("text-primary underline"),
                                          ],
                                          ["Create a table"]
                                      ),
                                  ]
                                : [
                                      h.label(
                                          [
                                              h.For("csv-destination-table"),
                                              h.Class(
                                                  "block text-sm font-medium"
                                              ),
                                          ],
                                          ["Destination table"]
                                      ),
                                      h.select(
                                          [
                                              h.Id("csv-destination-table"),
                                              h.Name("csv-destination-table"),
                                              h.Value(model.tables.selected_id),
                                              h.Class(
                                                  "w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                                              ),
                                              h.OnInput((table_id) =>
                                                  SelectedImportTable({
                                                      table_id,
                                                  })
                                              ),
                                          ],
                                          [
                                              h.option(
                                                  [h.Value("")],
                                                  ["Choose a table"]
                                              ),
                                              ...model.tables.tables.map(
                                                  (table) =>
                                                      h.option(
                                                          [h.Value(table.id)],
                                                          [table.name]
                                                      )
                                              ),
                                          ]
                                      ),
                                      ...(model.tables.selected_id === ""
                                          ? []
                                          : [
                                                h.submodel({
                                                    slotId: "csv-table-mapping",
                                                    model: model.tables,
                                                    view: Tables.import_panel,
                                                    toParentMessage: (
                                                        message
                                                    ) =>
                                                        GotTableMessage({
                                                            message,
                                                        }),
                                                }),
                                            ]),
                                  ]),
                      ]
                  )
                : h.submodel({
                      slotId: "data-csv-upload",
                      model: model.csvUpload,
                      view: CsvUpload.view,
                      toParentMessage: (message) =>
                          GotCsvUploadMessage({ message }),
                  })
        ),
        M.when("Spreadsheets", () =>
            h.submodel({
                slotId: "data-tables",
                model: model.tables,
                view: Tables.view,
                toParentMessage: (message) => GotTableMessage({ message }),
            })
        ),
        M.exhaustive
    )
)

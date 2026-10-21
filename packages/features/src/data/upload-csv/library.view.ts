import type { Html, HtmlBuilder } from "foldkit/html"
import type { Model } from "./app.model.ts"
import * as Msg from "./app.message.ts"

const button_class =
    "rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
const control_class =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-base"
const button = (
    h: HtmlBuilder<Msg.Message>,
    title: string,
    message: Msg.Message,
    disabled = false,
    filename = ""
) =>
    h.button(
        [
            h.Type("button"),
            h.Class(button_class),
            h.Disabled(disabled),
            h.OnClick(message),
        ],
        [
            title,
            ...(filename === ""
                ? []
                : [h.span([h.Class("sr-only")], [` ${filename}`])]),
        ]
    )
export const filtered_uploads = (model: Model) =>
    model.uploads.filter(
        (upload) =>
            upload.filename
                .toLowerCase()
                .includes(model.search.trim().toLowerCase()) &&
            (model.status_filter === "all" ||
                upload.status === model.status_filter)
    )
const preview = (model: Model, h: HtmlBuilder<Msg.Message>): Html => {
    const upload = model.uploads.find(
        (upload) => upload.id === model.preview_id
    )
    const headers = [
        ...new Set(
            model.preview_rows.flatMap((row) => Object.keys(row.values))
        ),
    ]
    const start = model.preview_page * 25
    return h.section(
        [h.Class("space-y-4")],
        [
            button(h, "Back to uploads", Msg.ClosedUploadPreview()),
            h.h2(
                [
                    h.Class("text-xl font-semibold"),
                    h.Id("csv-preview-heading"),
                    h.Tabindex(-1),
                ],
                [upload?.filename ?? "CSV preview"]
            ),
            ...(model.preview_loading
                ? [h.p([h.Role("status")], ["Loading rows…"])]
                : []),
            ...(model.preview_error !== ""
                ? [
                      h.p(
                          [h.Role("alert"), h.Class("text-destructive")],
                          [model.preview_error]
                      ),
                  ]
                : []),
            ...(model.can_write && upload?.status === "completed"
                ? [
                      button(
                          h,
                          "Import into table",
                          Msg.ClickedTableImport({ upload_id: upload.id }),
                          model.uploadBusy
                      ),
                  ]
                : []),
            ...(!model.preview_loading && model.preview_error === ""
                ? [
                      h.p(
                          [h.Role("status")],
                          [
                              `${model.preview_rows.length} stored rows · ${headers.length} columns`,
                          ]
                      ),
                      h.div(
                          [
                              h.Class(
                                  "overflow-auto rounded-md border border-border"
                              ),
                          ],
                          [
                              h.table(
                                  [h.Class("w-full text-sm")],
                                  [
                                      h.caption(
                                          [h.Class("sr-only")],
                                          [
                                              `Rows from ${upload?.filename ?? "CSV upload"}`,
                                          ]
                                      ),
                                      h.thead(
                                          [],
                                          [
                                              h.tr(
                                                  [],
                                                  [
                                                      h.th(
                                                          [
                                                              h.Scope("col"),
                                                              h.Class(
                                                                  "p-3 text-left"
                                                              ),
                                                          ],
                                                          ["Row"]
                                                      ),
                                                      ...headers.map((header) =>
                                                          h.th(
                                                              [
                                                                  h.Scope(
                                                                      "col"
                                                                  ),
                                                                  h.Class(
                                                                      "p-3 text-left"
                                                                  ),
                                                              ],
                                                              [header]
                                                          )
                                                      ),
                                                  ]
                                              ),
                                          ]
                                      ),
                                      h.tbody(
                                          [],
                                          model.preview_rows
                                              .slice(start, start + 25)
                                              .map((row) =>
                                                  h.keyed("tr")(
                                                      row.id,
                                                      [],
                                                      [
                                                          h.th(
                                                              [
                                                                  h.Scope(
                                                                      "row"
                                                                  ),
                                                                  h.Class(
                                                                      "border-t border-border p-3 text-left"
                                                                  ),
                                                              ],
                                                              [
                                                                  String(
                                                                      row.row_index +
                                                                          1
                                                                  ),
                                                              ]
                                                          ),
                                                          ...headers.map(
                                                              (header) =>
                                                                  h.td(
                                                                      [
                                                                          h.Class(
                                                                              "max-w-96 whitespace-pre-wrap break-words border-t border-border p-3"
                                                                          ),
                                                                      ],
                                                                      [
                                                                          row
                                                                              .values[
                                                                              header
                                                                          ] ??
                                                                              "",
                                                                      ]
                                                                  )
                                                          ),
                                                      ]
                                                  )
                                              )
                                      ),
                                  ]
                              ),
                          ]
                      ),
                      ...(model.preview_rows.length > 25
                          ? [
                                h.div(
                                    [h.Class("flex items-center gap-3")],
                                    [
                                        button(
                                            h,
                                            "Previous rows",
                                            Msg.ChangedPreviewPage({
                                                page: model.preview_page - 1,
                                            }),
                                            model.preview_page === 0
                                        ),
                                        h.span(
                                            [],
                                            [
                                                `Page ${model.preview_page + 1} of ${Math.ceil(model.preview_rows.length / 25)}`,
                                            ]
                                        ),
                                        button(
                                            h,
                                            "Next rows",
                                            Msg.ChangedPreviewPage({
                                                page: model.preview_page + 1,
                                            }),
                                            start + 25 >=
                                                model.preview_rows.length
                                        ),
                                    ]
                                ),
                            ]
                          : []),
                  ]
                : []),
        ]
    )
}
export const library_view = (
    model: Model,
    h: HtmlBuilder<Msg.Message>
): Html => {
    if (model.preview_id !== "") return preview(model, h)
    const uploads = filtered_uploads(model)
    return h.section(
        [h.Class("space-y-4")],
        [
            h.h2([h.Class("text-xl font-semibold")], ["Uploaded CSV files"]),
            h.div(
                [h.Class("grid gap-3 sm:grid-cols-2")],
                [
                    h.div(
                        [],
                        [
                            h.label(
                                [
                                    h.For("csv-upload-search"),
                                    h.Class("mb-1 block text-sm font-medium"),
                                ],
                                ["Search filenames"]
                            ),
                            h.input([
                                h.Id("csv-upload-search"),
                                h.Name("csv-upload-search"),
                                h.Type("search"),
                                h.Class(control_class),
                                h.Value(model.search),
                                h.OnInput((value) =>
                                    Msg.ChangedUploadSearch({ value })
                                ),
                            ]),
                        ]
                    ),
                    h.div(
                        [],
                        [
                            h.label(
                                [
                                    h.For("csv-status-filter"),
                                    h.Class("mb-1 block text-sm font-medium"),
                                ],
                                ["Upload status"]
                            ),
                            h.select(
                                [
                                    h.Id("csv-status-filter"),
                                    h.Name("csv-status-filter"),
                                    h.Class(control_class),
                                    h.Value(model.status_filter),
                                    h.OnInput((value) =>
                                        Msg.ChangedUploadStatus({ value })
                                    ),
                                ],
                                [
                                    "all",
                                    "pending",
                                    "processing",
                                    "completed",
                                    "failed",
                                ].map((status) =>
                                    h.option(
                                        [h.Value(status)],
                                        [
                                            status === "all"
                                                ? "All statuses"
                                                : status,
                                        ]
                                    )
                                )
                            ),
                        ]
                    ),
                ]
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground"), h.Role("status")],
                [
                    model.loading
                        ? "Loading uploads…"
                        : `${uploads.length} matching uploads · latest 100 uploads in this domain`,
                ]
            ),
            ...(uploads.length === 0 && !model.loading
                ? [
                      h.p(
                          [],
                          [
                              model.uploads.length === 0
                                  ? "No uploads yet."
                                  : "No uploads match these filters.",
                          ]
                      ),
                  ]
                : []),
            h.div(
                [h.Class("overflow-auto rounded-md border border-border")],
                [
                    h.table(
                        [h.Class("w-full text-sm")],
                        [
                            h.caption(
                                [h.Class("sr-only")],
                                ["CSV uploads, newest first"]
                            ),
                            h.thead(
                                [],
                                [
                                    h.tr(
                                        [],
                                        [
                                            "Filename",
                                            "Rows",
                                            "Updated",
                                            "Status",
                                            "Actions",
                                        ].map((title) =>
                                            h.th(
                                                [
                                                    h.Scope("col"),
                                                    h.Class("p-3 text-left"),
                                                ],
                                                [title]
                                            )
                                        )
                                    ),
                                ]
                            ),
                            h.tbody(
                                [],
                                uploads.map((upload) =>
                                    h.keyed("tr")(
                                        upload.id,
                                        [],
                                        [
                                            h.th(
                                                [
                                                    h.Scope("row"),
                                                    h.Class(
                                                        "max-w-80 break-words border-t border-border p-3 text-left"
                                                    ),
                                                ],
                                                [
                                                    upload.filename,
                                                    h.p(
                                                        [
                                                            h.Class(
                                                                "text-xs text-muted-foreground"
                                                            ),
                                                        ],
                                                        [
                                                            `Uploader: ${upload.uploader_name ?? "Not recorded (older upload)"}`,
                                                        ]
                                                    ),
                                                    ...((upload.imports ?? [])
                                                        .length === 0
                                                        ? [
                                                              h.p(
                                                                  [
                                                                      h.Class(
                                                                          "text-xs text-muted-foreground"
                                                                      ),
                                                                  ],
                                                                  [
                                                                      "No recorded imports. History starts with this release.",
                                                                  ]
                                                              ),
                                                          ]
                                                        : [
                                                              h.ul(
                                                                  [
                                                                      h.Class(
                                                                          "text-xs space-y-1"
                                                                      ),
                                                                  ],
                                                                  (
                                                                      upload.imports ??
                                                                      []
                                                                  ).map(
                                                                      (
                                                                          record
                                                                      ) =>
                                                                          h.li(
                                                                              [],
                                                                              [
                                                                                  `${record.destination_name} · ${new Date(record.completed_at).toLocaleString()} · ${record.imported} imported, ${record.rejected} rejected, ${record.skipped} skipped · by ${record.actor_name ?? "Administrator"}`,
                                                                              ]
                                                                          )
                                                                  )
                                                              ),
                                                              h.p(
                                                                  [
                                                                      h.Class(
                                                                          "text-xs text-muted-foreground"
                                                                      ),
                                                                  ],
                                                                  [
                                                                      "Retained to preserve import history.",
                                                                  ]
                                                              ),
                                                          ]),
                                                ]
                                            ),
                                            h.td(
                                                [
                                                    h.Class(
                                                        "border-t border-border p-3"
                                                    ),
                                                ],
                                                [String(upload.row_count)]
                                            ),
                                            h.td(
                                                [
                                                    h.Class(
                                                        "whitespace-nowrap border-t border-border p-3"
                                                    ),
                                                ],
                                                [
                                                    new Date(
                                                        upload.updated_at
                                                    ).toLocaleString(),
                                                ]
                                            ),
                                            h.td(
                                                [
                                                    h.Class(
                                                        "border-t border-border p-3"
                                                    ),
                                                ],
                                                [upload.status]
                                            ),
                                            h.td(
                                                [
                                                    h.Class(
                                                        "border-t border-border p-3"
                                                    ),
                                                ],
                                                [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "flex flex-wrap gap-2"
                                                            ),
                                                        ],
                                                        [
                                                            button(
                                                                h,
                                                                "Preview rows",
                                                                Msg.ClickedPreviewUpload(
                                                                    {
                                                                        upload_id:
                                                                            upload.id,
                                                                    }
                                                                ),
                                                                upload.status !==
                                                                    "completed",
                                                                upload.filename
                                                            ),
                                                            ...(model.can_write
                                                                ? [
                                                                      button(
                                                                          h,
                                                                          "Import into table",
                                                                          Msg.ClickedTableImport(
                                                                              {
                                                                                  upload_id:
                                                                                      upload.id,
                                                                              }
                                                                          ),
                                                                          model.uploadBusy ||
                                                                              upload.status !==
                                                                                  "completed",
                                                                          upload.filename
                                                                      ),
                                                                      ...((
                                                                          upload.imports ??
                                                                          []
                                                                      ).some(
                                                                          (
                                                                              record
                                                                          ) =>
                                                                              record.destination_id ===
                                                                              "mail-contacts"
                                                                      )
                                                                          ? [
                                                                                h.span(
                                                                                    [],
                                                                                    [
                                                                                        "Imported to Mail contacts",
                                                                                    ]
                                                                                ),
                                                                            ]
                                                                          : [
                                                                                button(
                                                                                    h,
                                                                                    "Import to contacts",
                                                                                    Msg.ClickedImportUpload(
                                                                                        {
                                                                                            uploadId:
                                                                                                upload.id,
                                                                                        }
                                                                                    ),
                                                                                    model.uploadBusy ||
                                                                                        upload.status !==
                                                                                            "completed",
                                                                                    upload.filename
                                                                                ),
                                                                            ]),
                                                                      ...(upload.status !==
                                                                      "completed"
                                                                          ? [
                                                                                h.p(
                                                                                    [
                                                                                        h.Class(
                                                                                            "text-xs"
                                                                                        ),
                                                                                    ],
                                                                                    [
                                                                                        "Select the original CSV above to resume this upload.",
                                                                                    ]
                                                                                ),
                                                                                button(
                                                                                    h,
                                                                                    "Retry with selected file",
                                                                                    Msg.RetriedUpload(
                                                                                        {
                                                                                            upload_id:
                                                                                                upload.id,
                                                                                        }
                                                                                    ),
                                                                                    model.uploadBusy,
                                                                                    upload.filename
                                                                                ),
                                                                            ]
                                                                          : []),
                                                                      button(
                                                                          h,
                                                                          "Delete",
                                                                          Msg.ClickedDeleteUpload(
                                                                              {
                                                                                  uploadId:
                                                                                      upload.id,
                                                                              }
                                                                          ),
                                                                          model.uploadBusy ||
                                                                              (
                                                                                  upload.imports ??
                                                                                  []
                                                                              )
                                                                                  .length >
                                                                                  0,
                                                                          upload.filename
                                                                      ),
                                                                  ]
                                                                : []),
                                                        ]
                                                    ),
                                                ]
                                            ),
                                        ]
                                    )
                                )
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

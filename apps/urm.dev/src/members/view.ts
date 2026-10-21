import { Submodel } from "foldkit"
import { Schema } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import * as Directory from "@urm/features/mail/members"
import { make_view } from "@urm/features/mail/members/manage"
import { Message, Model, project, records } from "./model.ts"

const writable = make_view({ can_upload: true })
const readonly = make_view({ can_write: false, can_upload: false })
export const ViewModel = Schema.Struct({
    ...Model.fields,
    managing: Schema.Boolean,
})
const render = (model: typeof ViewModel.Type, h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("h-[calc(100dvh-4rem)] min-h-0 flex flex-col")],
        [
            h.div(
                [h.Class("flex items-center gap-3 px-4 pt-3 text-sm")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Disabled(model.busy),
                            h.OnClick(Message.Refreshed()),
                            h.Class("underline disabled:opacity-50"),
                        ],
                        ["Refresh"]
                    ),
                    h.span(
                        [h.Class("text-muted-foreground")],
                        ["Up to 200 recently updated members"]
                    ),
                    ...(!model.can_write
                        ? [h.span([], ["Read-only access"])]
                        : []),
                    h.span(
                        [h.Role("status"), h.Class("sr-only")],
                        [model.busy ? "Loading members…" : ""]
                    ),
                ]
            ),
            model.managing
                ? h.submodel({
                      slotId: "members-manage",
                      model: project(model),
                      view: model.can_write ? writable : readonly,
                      toParentMessage: (message) =>
                          Message.Interaction({ message }),
                  })
                : h.submodel({
                      slotId: "members-directory",
                      model: {
                          members: records(model),
                          loading: model.busy,
                          error: model.error,
                      },
                      view: Directory.view,
                      toParentMessage: () => Message.Refreshed(),
                  }),
        ]
    )
export const view = Submodel.defineView<typeof ViewModel.Type, Message>(render)
export const is_members_path = (path: string) =>
    /^\/mail\/members(?:\/manage)?\/?$/.test(path.split(/[?#]/)[0] ?? "")

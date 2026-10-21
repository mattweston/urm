import { Schema } from "effect"
import { taggedStruct } from "foldkit/schema"
import { HeaderField, LineField, init, type Model } from "./model.ts"

export const ChangedHeader = taggedStruct("ChangedHeader", {
    field: HeaderField,
    value: Schema.String,
})
export const ChangedLine = taggedStruct("ChangedLine", {
    id: Schema.Number,
    field: LineField,
    value: Schema.String,
})
export const AddedLine = taggedStruct("AddedLine")
export const RemovedLine = taggedStruct("RemovedLine", { id: Schema.Number })
export const RequestedPreview = taggedStruct("RequestedPreview")
export const ResetDemo = taggedStruct("ResetDemo")
export const Message = Schema.Union([
    ChangedHeader,
    ChangedLine,
    AddedLine,
    RemovedLine,
    RequestedPreview,
    ResetDemo,
])
export type Message = typeof Message.Type

export const update = (model: Model, message: Message): Model => {
    switch (message._tag) {
        case "ChangedHeader":
            return {
                ...model,
                [message.field]: message.value,
                show_errors: false,
            }
        case "ChangedLine":
            return {
                ...model,
                lines: model.lines.map((line) =>
                    line.id === message.id
                        ? { ...line, [message.field]: message.value }
                        : line
                ),
                show_errors: false,
            }
        case "AddedLine":
            return model.lines.length >= 50
                ? model
                : {
                      ...model,
                      next_id: model.next_id + 1,
                      lines: [
                          ...model.lines,
                          {
                              id: model.next_id,
                              description: "",
                              quantity: "1",
                              unit_price: "0.00",
                          },
                      ],
                      show_errors: false,
                  }
        case "RemovedLine":
            return model.lines.length <= 1
                ? model
                : {
                      ...model,
                      lines: model.lines.filter(
                          (line) => line.id !== message.id
                      ),
                      show_errors: false,
                  }
        case "RequestedPreview":
            return { ...model, show_errors: true }
        case "ResetDemo":
            return init()
    }
}

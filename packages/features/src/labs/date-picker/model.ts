import * as Ui from "@foldkit/ui"
import { Schema as S } from "effect"
import { Calendar } from "foldkit"
export const Model = S.Struct({
    datePicker: Ui.DatePicker.Model,
    maybeSelectedDate: S.Option(Calendar.CalendarDate),
})
export type Model = typeof Model.Type

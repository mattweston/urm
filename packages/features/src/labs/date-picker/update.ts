import * as Ui from "@foldkit/ui"
import { Effect, Match as M, Option } from "effect"
import { Calendar, Command } from "foldkit"
import { evo } from "foldkit/struct"
import { GotDatePickerMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"
type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
export const init = (): UpdateReturn => {
    const today = Effect.runSync(Calendar.today.local)
    return [
        {
            datePicker: Ui.DatePicker.init({
                id: "labs-date-picker",
                today,
                minDate: Calendar.subtractYears(today, 1),
                maxDate: Calendar.addYears(today, 1),
            }),
            maybeSelectedDate: Option.none(),
        },
        [],
    ]
}
export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotDatePickerMessage: ({ message: childMessage }) => {
                const {
                    model: datePicker,
                    commands = [],
                    outMessage: maybeOut_value,
                } = Ui.DatePicker.update(model.datePicker, childMessage)
                const maybeOut = Option.fromUndefinedOr(maybeOut_value)

                const maybeSelectedDate = M.value(maybeOut).pipe(
                    M.tag("Some", ({ value }) =>
                        M.value(value).pipe(
                            M.tag("SelectedDate", ({ date }) =>
                                Option.some(date)
                            ),
                            M.tag("ClearedDate", () =>
                                Option.none<Calendar.CalendarDate>()
                            ),
                            M.orElse(() => model.maybeSelectedDate)
                        )
                    ),
                    M.orElse(() => model.maybeSelectedDate)
                )
                return [
                    evo(model, {
                        datePicker: () => datePicker,
                        maybeSelectedDate: () => maybeSelectedDate,
                    }),
                    commands.map(
                        Command.mapEffect(
                            Effect.map((message) =>
                                GotDatePickerMessage({ message })
                            )
                        )
                    ),
                ]
            },
        })
    )

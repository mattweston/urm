import * as Ui from "@foldkit/ui"
import { Effect, Match as M, Option } from "effect"
import { Calendar, Command } from "foldkit"
import { evo } from "foldkit/struct"

import { GotCalendarMessage, type Message } from "./message.ts"
import type { Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const mapCommands = (
    commands: ReadonlyArray<Command.Command<Ui.Calendar.Message>>
) =>
    commands.map(
        Command.mapEffect(
            Effect.map((message) => GotCalendarMessage({ message }))
        )
    )

export const init = (): UpdateReturn => {
    const today = Effect.runSync(Calendar.today.local)

    return [
        {
            calendar: Ui.Calendar.init({
                id: "labs-calendar",
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
            GotCalendarMessage: ({ message: calendarMessage }) => {
                const {
                    model: calendar,
                    commands = [],
                    outMessage: maybeOutMessage_value,
                } = Ui.Calendar.update(model.calendar, calendarMessage)
                const maybeOutMessage = Option.fromUndefinedOr(
                    maybeOutMessage_value
                )

                const maybeSelectedDate = M.value(maybeOutMessage).pipe(
                    M.tag("Some", ({ value }) =>
                        M.value(value).pipe(
                            M.tag("SelectedDate", ({ date }) =>
                                Option.some(date)
                            ),
                            M.orElse(() => model.maybeSelectedDate)
                        )
                    ),
                    M.orElse(() => model.maybeSelectedDate)
                )

                return [
                    evo(model, {
                        calendar: () => calendar,
                        maybeSelectedDate: () => maybeSelectedDate,
                    }),
                    mapCommands(commands),
                ]
            },
        })
    )

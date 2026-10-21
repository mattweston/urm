import { Schema as S } from "effect"
import { Calendar, Command } from "foldkit"
import * as Counter from "../../button/index.ts"
import * as CalendarLab from "../../calendar/index.ts"

export const Model = S.Struct({
    clickCount: S.Number,
    calendar: CalendarLab.Model,
})
export type Model = typeof Model.Type

export const Message = S.Union([Counter.Message, CalendarLab.Message])
export type Message = typeof Message.Type

export const init = (): Model => {
    const [calendar] = CalendarLab.init()
    return {
        clickCount: 0,
        calendar: {
            ...calendar,
            calendar: {
                ...calendar.calendar,
                id: "urmcss-calendar",
                disabledDates: [Calendar.addDays(calendar.calendar.today, 1)],
            },
        },
    }
}

export const update = (
    model: Model,
    message: Message
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
    if (message._tag === "ClickedButton") {
        const [counter] = Counter.update(model, message)
        return [{ ...model, clickCount: counter.clickCount }, []]
    }
    const [calendar, commands] = CalendarLab.update(model.calendar, message)
    return [
        { ...model, calendar },
        Command.mapMessages(commands, (message): Message => message),
    ]
}

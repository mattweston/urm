import { Option } from "effect"
import { type CalendarDate } from "foldkit/calendar"

const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
] as const

export const yearMonth = (date: CalendarDate): string =>
    `${MONTH_NAMES[date.month - 1]} ${date.year}`

export const fullDate = (date: CalendarDate): string =>
    `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`

export const employmentRange = (
    start: CalendarDate,
    isCurrentlyEmployed: boolean,
    maybeEnd: Option.Option<CalendarDate>
): string => {
    const startText = yearMonth(start)

    if (isCurrentlyEmployed) {
        return `${startText} – Present`
    }

    return Option.match(maybeEnd, {
        onNone: () => startText,
        onSome: (end) => `${startText} – ${yearMonth(end)}`,
    })
}

export const pluralize = (
    count: number,
    singular: string,
    plural: string
): string => `${count} ${count === 1 ? singular : plural}`

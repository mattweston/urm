const CALENDAR_PATH = "/labs/calendar"

export const calendarHref = () => `${CALENDAR_PATH}/`

export const isCalendarPath = (pathname: string): boolean =>
    pathname === CALENDAR_PATH || pathname === `${CALENDAR_PATH}/`

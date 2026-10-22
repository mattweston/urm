const TOUR_DATES_PATH = "/calendar/tour-dates"

export const tourDatesHref = () => `${TOUR_DATES_PATH}/`

export const isTourDatesPath = (pathname: string): boolean =>
    pathname === TOUR_DATES_PATH || pathname === `${TOUR_DATES_PATH}/`

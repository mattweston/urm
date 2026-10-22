const CHARTING_PATH = "/stats/charting"

export const chartingHref = () => `${CHARTING_PATH}/`

export const isChartingPath = (pathname: string): boolean =>
    pathname === CHARTING_PATH || pathname === `${CHARTING_PATH}/`

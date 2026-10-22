const COUNTERS_PATH = "/data/counters"

export const countersHref = () => `${COUNTERS_PATH}/`

export const isCountersPath = (pathname: string): boolean =>
    pathname === COUNTERS_PATH || pathname === `${COUNTERS_PATH}/`

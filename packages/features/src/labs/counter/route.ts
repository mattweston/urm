const COUNTER_PATH = "/ui/counter"

export const counterHref = () => `${COUNTER_PATH}/`

export const isCounterPath = (pathname: string): boolean =>
    pathname === COUNTER_PATH || pathname === `${COUNTER_PATH}/`

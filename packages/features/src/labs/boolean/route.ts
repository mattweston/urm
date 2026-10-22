const BOOLEAN_PATH = "/boolean"

export const booleanHref = () => `${BOOLEAN_PATH}/`

export const isBooleanPath = (pathname: string): boolean =>
    pathname === BOOLEAN_PATH || pathname === `${BOOLEAN_PATH}/`

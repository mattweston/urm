const CARD_PATH = "/ui/card"

export const cardHref = () => `${CARD_PATH}/`

export const isCardPath = (pathname: string): boolean =>
    pathname === CARD_PATH || pathname === `${CARD_PATH}/`

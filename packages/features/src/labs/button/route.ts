const BUTTON_PATH = "/labs/button"

export const buttonHref = () => `${BUTTON_PATH}/`

export const isButtonPath = (pathname: string): boolean =>
    pathname === BUTTON_PATH || pathname === `${BUTTON_PATH}/`

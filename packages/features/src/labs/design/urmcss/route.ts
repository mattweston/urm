const PATH = "/labs/design/urmcss"
const BUTTON_PATH = `${PATH}/button`

export const urmcss_href = () => `${PATH}/`
export const button_href = () => `${BUTTON_PATH}/`
export const is_button_path = (pathname: string): boolean =>
    pathname === BUTTON_PATH || pathname === `${BUTTON_PATH}/`
export const is_urmcss_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/` || is_button_path(pathname)

const CHECKBOX_PATH = "/labs/forms/checkbox"

export const checkboxHref = () => `${CHECKBOX_PATH}/`

export const isCheckboxPath = (pathname: string): boolean =>
    pathname === CHECKBOX_PATH || pathname === `${CHECKBOX_PATH}/`

const COMBOBOX_PATH = "/labs/ui/combobox"

export const comboboxHref = () => `${COMBOBOX_PATH}/`

export const isComboboxPath = (pathname: string): boolean =>
    pathname === COMBOBOX_PATH || pathname === `${COMBOBOX_PATH}/`

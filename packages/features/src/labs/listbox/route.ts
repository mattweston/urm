const PATH = "/labs/ui/listbox"

export const listboxHref = () => `${PATH}/`

export const isListboxPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

const PATH = "/forms/radio-group"

export const radioGroupHref = (): string => `${PATH}/`

export const isRadioGroupPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

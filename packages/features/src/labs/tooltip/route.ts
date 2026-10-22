const PATH = "/dialog/tooltip"

export const tooltipHref = (): string => `${PATH}/`

export const isTooltipPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

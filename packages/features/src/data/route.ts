export const dataHref = (): string => "/data/"
export const csvHref = (): string => "/data/csv/"
export const spreadsheetsHref = (): string => "/data/spreadsheets/"

export const isDataPath = (pathname: string): boolean =>
    pathname === "/data" || pathname === dataHref()

export const isCsvPath = (pathname: string): boolean =>
    pathname === "/data/csv" || pathname === csvHref()

export const isSpreadsheetsPath = (pathname: string): boolean =>
    pathname === "/data/spreadsheets" || pathname === spreadsheetsHref()

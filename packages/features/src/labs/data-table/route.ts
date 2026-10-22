const DATA_TABLE_PATH = "/ui/data-table"
export const dataTableHref = () => `${DATA_TABLE_PATH}/`
export const isDataTablePath = (pathname: string): boolean =>
    pathname === DATA_TABLE_PATH || pathname === `${DATA_TABLE_PATH}/`

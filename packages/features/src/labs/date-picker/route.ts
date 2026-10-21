const PATH = "/labs/ui/date-picker"
export const datePickerHref = () => `${PATH}/`
export const isDatePickerPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

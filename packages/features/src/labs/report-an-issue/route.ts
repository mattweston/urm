const PATH = "/issues/report-an-issue"

export const reportAnIssueHref = (): string => `${PATH}/`

export const isReportAnIssuePath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

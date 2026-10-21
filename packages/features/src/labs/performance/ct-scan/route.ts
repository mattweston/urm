const PATH = "/labs/performance/ct-scan"

export const ct_scan_href = () => `${PATH}/`

export const is_ct_scan_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

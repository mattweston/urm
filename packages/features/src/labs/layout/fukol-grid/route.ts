const PATH = "/labs/layout/fukol-grid"

export const fukol_grid_href = () => `${PATH}/`

export const is_fukol_grid_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

const PATH = "/layout/auto-grid"

export const auto_grid_href = () => `${PATH}/`

export const is_auto_grid_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

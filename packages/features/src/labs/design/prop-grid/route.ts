const PATH = "/design/prop-grid"

export const prop_grid_href = () => `${PATH}/`

export const is_prop_grid_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

const PATH = "/design/grid-builder"

export const grid_builder_href = () => `${PATH}/`

export const is_grid_builder_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

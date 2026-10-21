const PATH = "/labs/layout/conditional-grid"

export const conditional_grid_href = () => `${PATH}/`

export const is_conditional_grid_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

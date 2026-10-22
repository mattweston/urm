const PATH = "/labs/learn/side-effects/on-demand"

export const on_demand_href = () => `${PATH}/`

export const is_on_demand_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

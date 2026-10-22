const PATH = "/labs/learn/components/submodel"

export const submodel_href = () => `${PATH}/`

export const is_submodel_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

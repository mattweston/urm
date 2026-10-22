const PATH = "/labs/learn/managed-resource-layer"

export const managedResourceLayerHref = () => `${PATH}/`

export const isManagedResourceLayerPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

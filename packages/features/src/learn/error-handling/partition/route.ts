const PATH = "/learn/error-handling/partition"

export const partition_href = () => `${PATH}/`

export const is_partition_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

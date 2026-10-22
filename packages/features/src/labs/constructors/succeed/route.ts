const PATH = "/labs/learn/constructors/succeed"

export const succeed_href = () => `${PATH}/`

export const is_succeed_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

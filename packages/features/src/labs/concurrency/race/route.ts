const PATH = "/labs/learn/concurrency/race"

export const race_href = () => `${PATH}/`

export const is_race_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

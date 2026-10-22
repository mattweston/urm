const PATH = "/labs/learn/concurrency/race-all"

export const race_all_href = () => `${PATH}/`

export const is_race_all_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

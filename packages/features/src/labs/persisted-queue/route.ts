const PATH = "/learn/persisted-queue"

export const persisted_queue_href = () => `${PATH}/`

export const is_persisted_queue_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

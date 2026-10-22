const PATH = "/labs/learn/side-effects/decoding"

export const decoding_href = () => `${PATH}/`

export const is_decoding_path = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

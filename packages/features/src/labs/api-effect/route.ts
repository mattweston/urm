const API_EFFECT_PATH = "/labs/learn/api-effect"

export const apiEffectHref = () => `${API_EFFECT_PATH}/`

export const isApiEffectPath = (pathname: string): boolean =>
    pathname === API_EFFECT_PATH || pathname === `${API_EFFECT_PATH}/`

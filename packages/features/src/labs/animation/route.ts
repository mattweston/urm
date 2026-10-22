const ANIMATION_PATH = "/animation"

export const animationHref = () => `${ANIMATION_PATH}/`

export const isAnimationPath = (pathname: string): boolean =>
    pathname === ANIMATION_PATH || pathname === `${ANIMATION_PATH}/`

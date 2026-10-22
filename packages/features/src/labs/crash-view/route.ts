const CRASH_VIEW_PATH = "/errors/crash-view"

export const crashViewHref = () => `${CRASH_VIEW_PATH}/`

export const isCrashViewPath = (pathname: string): boolean =>
    pathname === CRASH_VIEW_PATH || pathname === `${CRASH_VIEW_PATH}/`

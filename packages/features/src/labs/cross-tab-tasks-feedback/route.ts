const PATH = "/local-first/cross-tab-tasks-feedback"
export const crossTabTasksFeedbackHref = () => `${PATH}/`
export const isCrossTabTasksFeedbackPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

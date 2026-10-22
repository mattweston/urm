const CROSS_TAB_TASKS_PATH = "/local-first/cross-tab-tasks"
export const crossTabTasksHref = () => `${CROSS_TAB_TASKS_PATH}/`
export const isCrossTabTasksPath = (pathname: string): boolean =>
    pathname === CROSS_TAB_TASKS_PATH || pathname === `${CROSS_TAB_TASKS_PATH}/`

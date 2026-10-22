const TERMINAL_PATH = "/dev/terminal"

export const terminalHref = () => `${TERMINAL_PATH}/`

export const isTerminalPath = (pathname: string): boolean =>
    pathname === TERMINAL_PATH || pathname === `${TERMINAL_PATH}/`

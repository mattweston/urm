const PATH = "/labs/learn/interrupting-commands"

export const interruptingCommandsHref = () => `${PATH}/`

export const isInterruptingCommandsPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

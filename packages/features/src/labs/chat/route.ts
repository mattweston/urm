const CHAT_PATH = "/labs/chat/chat"

export const chatHref = () => `${CHAT_PATH}/`

export const isChatPath = (pathname: string): boolean =>
    pathname === CHAT_PATH || pathname === `${CHAT_PATH}/`

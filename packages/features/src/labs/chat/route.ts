const CHAT_PATH = "/chat/chat"

export const chatHref = () => `${CHAT_PATH}/`

export const isChatPath = (pathname: string): boolean =>
    pathname === CHAT_PATH || pathname === `${CHAT_PATH}/`

import type { ViewRoute } from "./mailroom.view.ts"
import { isFolderId } from "./mailroom.model.ts"

const BASE = "/labs/mail"

export const mailroomHref = () => `${BASE}/inbox/`

export const isAppScope = (pathname: string) =>
    pathname === BASE || pathname.startsWith(`${BASE}/`)

export const draftIdForPath = (pathname: string): string | undefined => {
    const match = /^\/labs\/mail\/compose\/([^/]+)\/?$/.exec(pathname)
    return match?.[1]
}

export const viewRouteForPath = (pathname: string): ViewRoute => {
    if (draftIdForPath(pathname) !== undefined) {
        return { _tag: "Compose" }
    }

    const message = /^\/labs\/mail\/([^/]+)\/([^/]+)\/?$/.exec(pathname)
    if (message !== null) {
        const folder = message[1]
        return {
            _tag: "Message",
            folder:
                folder !== undefined && isFolderId(folder) ? folder : "inbox",
            messageId: message[2] ?? "",
        }
    }

    const mailbox = /^\/labs\/mail\/([^/]+)\/?$/.exec(pathname)
    const folder = mailbox?.[1]
    return {
        _tag: "Mailbox",
        folder: folder !== undefined && isFolderId(folder) ? folder : "inbox",
    }
}

export { Model, type Model as ModelType } from "./mailroom.model.ts"
export {
    Message,
    RequestedMailroomNavigation,
    type Message as MessageType,
} from "./mailroom.message.ts"
export { init, initDeferred, openDraft, update } from "./mailroom.update.ts"
export { view, type MailroomHrefs } from "./mailroom.view.ts"

const KBD_SHORTCUTS_PATH = "/dev/kbd-shortcuts"

export const kbdShortcutsHref = () => `${KBD_SHORTCUTS_PATH}/`

export const isKbdShortcutsPath = (pathname: string): boolean =>
    pathname === KBD_SHORTCUTS_PATH || pathname === `${KBD_SHORTCUTS_PATH}/`

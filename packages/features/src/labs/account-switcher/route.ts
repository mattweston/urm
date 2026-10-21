const ACCOUNT_SWITCHER_PATH = "/labs/account-switcher"

export const accountSwitcherHref = () => `${ACCOUNT_SWITCHER_PATH}/`

export const isAccountSwitcherPath = (pathname: string): boolean =>
    pathname === ACCOUNT_SWITCHER_PATH ||
    pathname === `${ACCOUNT_SWITCHER_PATH}/`

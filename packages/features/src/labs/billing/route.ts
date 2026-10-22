const BILLING_PATH = "/billing"

export const billingHref = () => `${BILLING_PATH}/`

export const isBillingPath = (pathname: string): boolean =>
    pathname === BILLING_PATH || pathname === `${BILLING_PATH}/`

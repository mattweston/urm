const BILLING_PATH = "/labs/billing"

export const billingHref = () => `${BILLING_PATH}/`

export const isBillingPath = (pathname: string): boolean =>
    pathname === BILLING_PATH || pathname === `${BILLING_PATH}/`

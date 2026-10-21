const PATH = "/labs/shop/payment-method"

export const paymentMethodHref = (): string => `${PATH}/`

export const isPaymentMethodPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

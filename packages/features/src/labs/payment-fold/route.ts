const PATH = "/learn/payment-fold"

export const paymentFoldHref = (): string => `${PATH}/`

export const isPaymentFoldPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

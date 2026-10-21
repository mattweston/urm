const PATH = "/labs/auth/otp-field"

export const otpFieldHref = (): string => `${PATH}/`

export const isOtpFieldPath = (pathname: string): boolean =>
    pathname === PATH || pathname === `${PATH}/`

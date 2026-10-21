export const isGoogleAuthRoute = (pathname: string): boolean =>
    pathname === "/auth/login-url" ||
    pathname === "/auth/google/authorize" ||
    pathname === "/auth/google/callback"

export const isAuthRoute = (pathname: string): boolean =>
    pathname === "/auth" || pathname.startsWith("/auth/")

export const isMailRoute = (pathname: string): boolean =>
    pathname === "/mail/unsubscribe"

export const isPlatformNewsletterRoute = (pathname: string): boolean =>
    pathname === "/mail/newsletter/subscribe" ||
    pathname === "/mail/newsletter/subscribe/" ||
    pathname === "/mail/newsletter/confirm" ||
    pathname === "/mail/newsletter/confirm/" ||
    pathname === "/mail/newsletter/unsubscribe" ||
    pathname === "/mail/newsletter/unsubscribe/"

export const isContactFormRoute = (pathname: string): boolean =>
    pathname === "/mail/contact/submit" || pathname === "/mail/contact/submit/"

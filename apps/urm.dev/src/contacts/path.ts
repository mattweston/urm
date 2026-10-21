export const is_contacts_path = (path: string) => {
    try {
        return (
            new URL(path, "https://route.invalid").pathname.replace(
                /\/$/,
                ""
            ) === "/mail/contacts"
        )
    } catch {
        return false
    }
}

export const app_href = () => "/"
export const google_sign_in_href = () =>
    "/auth/google/authorize?destination=admin"

import { browser_api } from "./api.ts"

export const contacts_resources = (origin: string) =>
    browser_api(origin, () => {
        const email = document.getElementById("account-email")
        const password = document.getElementById("account-password")
        if (
            !(email instanceof HTMLInputElement) ||
            !(password instanceof HTMLInputElement)
        )
            throw new Error("Sign-in form is missing")
        const credentials = { email: email.value, password: password.value }
        password.value = ""
        return credentials
    })

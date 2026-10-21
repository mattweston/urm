import { createInterface } from "node:readline/promises"
import { Writable } from "node:stream"

export const read_account_input = async (provision: boolean) => {
    let hidden = false
    const output = new Writable({
        write(chunk, _encoding, callback) {
            if (!hidden) process.stdout.write(chunk)
            callback()
        },
    })
    const prompt = createInterface({
        input: process.stdin,
        output,
        terminal: true,
    })
    try {
        if (!process.stdin.isTTY)
            throw new Error("Use an interactive terminal for credentials")
        const name = provision ? await prompt.question("Name: ") : ""
        const slug = provision ? await prompt.question("Workspace slug: ") : ""
        const email = await prompt.question("Login email: ")
        process.stdout.write("Password (hidden): ")
        hidden = true
        const password = await prompt.question("")
        process.stdout.write("\n")
        return { name, slug, email, password }
    } finally {
        prompt.close()
    }
}

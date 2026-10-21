import * as Option from "effect/Option"
import * as Ui from "@foldkit/ui"
import { describe, expect, test } from "vitest"

import { initial, Profile } from "./authkit.model.ts"
import {
    AuthKitClickedSignOut,
    AuthKitLoaded,
    AuthKitSignedOut,
    GotAccountMenuMessage,
    update,
} from "./authkit.submodel.ts"

const profile = Profile.make({
    id: "user_01",
    email: "matt@example.com",
    display_name: "Matt",
    image_url: Option.none(),
})

describe("AuthKit submodel", () => {
    test("loads an authenticated profile", () => {
        const [model, commands] = update(
            initial,
            AuthKitLoaded({ profile: Option.some(profile) })
        )

        expect(model.status).toBe("signed_in")
        expect(Option.getOrThrow(model.profile)).toEqual(profile)
        expect(commands).toEqual([])
    })

    test("signs out through a command and clears the profile on success", () => {
        const signed_in = update(
            initial,
            AuthKitLoaded({ profile: Option.some(profile) })
        )[0]
        const [loading, commands] = update(signed_in, AuthKitClickedSignOut())
        const [signed_out] = update(loading, AuthKitSignedOut())

        expect(loading.status).toBe("loading")
        expect(commands[0]?.name).toBe("SignOutWithAuthKit")
        expect(signed_out.status).toBe("signed_out")
        expect(Option.isNone(signed_out.profile)).toBe(true)
    })

    test("signs out when the account menu action is selected", () => {
        const signed_in = update(
            initial,
            AuthKitLoaded({ profile: Option.some(profile) })
        )[0]
        const [loading, commands] = update(
            signed_in,
            GotAccountMenuMessage({
                message: Ui.Menu.Message.SelectedItem({
                    index: 0,
                    item: "Sign out",
                }),
            })
        )

        expect(loading.status).toBe("loading")
        expect(
            commands.some((command) => command.name === "SignOutWithAuthKit")
        ).toBe(true)
    })
})

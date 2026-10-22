import { describe, expect, it } from "vitest"
import {
    LabsRoute,
    sidebarRouteTag,
} from "../../routing/route.ts"
import { changed_route, init, otp_field_href, update } from "./submodel.ts"

const route = LabsRoute({ labs_path: "/auth/otp-field" })

describe("client OTP field lab", () => {
    it("opens through client navigation under Auth", () => {
        expect(init(route).active).toBe(true)
        expect(otp_field_href()).toBe("/auth/otp-field")
        expect(sidebarRouteTag(route)).toBe("LabsOtpField")
        expect(
            sidebarRouteTag(LabsRoute({ labs_path: `${route.labs_path}/` }))
        ).toBe("LabsOtpField")
        expect(sidebarRouteTag(LabsRoute({ labs_path: "/auth" }))).toBe(
            "LabsAuth"
        )
    })

    it("limits input to six characters and clears it on exit", () => {
        const [filled] = update(init(route), {
            _tag: "UpdatedOtpFieldValue",
            value: "1234567",
        })
        expect(filled.otp.value).toBe("123456")
        const inactive = changed_route(filled, LabsRoute({ labs_path: "/" }))
        expect(inactive.active).toBe(false)
        expect(inactive.otp.value).toBe("")
        expect(
            update(inactive, { _tag: "UpdatedOtpFieldValue", value: "123" })
        ).toEqual([inactive, []])
        expect(changed_route(inactive, route)).toEqual(init(route))
    })
})

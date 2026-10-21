import * as Option from "effect/Option"
import { Url } from "foldkit/url"
import { describe, expect, test } from "vitest"

import {
    central_href_for_host,
    domain_href_for_host,
    host_context_for_url,
} from "./host-context.ts"

const url = (host: string, search = Option.none<string>()) =>
    Url.make({
        protocol: "http:",
        host,
        port: Option.some("1420"),
        pathname: "/",
        search,
        hash: Option.none(),
    })

describe("client host context", () => {
    test("recognizes the development account hub", () => {
        expect(host_context_for_url(url("app.urm.test"))).toEqual({
            kind: "central",
            hostname: "app.urm.test",
            auth_capable: false,
            requested_domain_slug: Option.none(),
        })
    })

    test("keeps the tenant generated hostname on the public surface", () => {
        expect(host_context_for_url(url("test1.urm.test"))).toEqual({
            kind: "custom",
            hostname: "test1.urm.test",
            auth_capable: false,
            requested_domain_slug: Option.none(),
        })
    })

    test("reads the selected domain from the central URL", () => {
        expect(
            host_context_for_url(
                url("app.localhost", Option.some("?domain=test1"))
            )
        ).toEqual({
            kind: "central",
            hostname: "app.localhost",
            auth_capable: true,
            requested_domain_slug: Option.some("test1"),
        })
    })

    test("keeps the tenant localhost on the public surface", () => {
        expect(host_context_for_url(url("test1.localhost"))).toEqual({
            kind: "custom",
            hostname: "test1.localhost",
            auth_capable: true,
            requested_domain_slug: Option.none(),
        })
    })

    test("keeps nested local publication hosts out of administration", () => {
        expect(host_context_for_url(url("dev.test1.localhost"))).toEqual({
            kind: "custom",
            hostname: "dev.test1.localhost",
            auth_capable: true,
            requested_domain_slug: Option.none(),
        })
        expect(
            host_context_for_url(url("prototype-a.test1.localhost"))
        ).toEqual({
            kind: "custom",
            hostname: "prototype-a.test1.localhost",
            auth_capable: true,
            requested_domain_slug: Option.none(),
        })
    })

    test("does not treat the development suffix root as the account hub", () => {
        expect(host_context_for_url(url("urm.test"))).toEqual({
            kind: "custom",
            hostname: "urm.test",
            auth_capable: false,
            requested_domain_slug: Option.none(),
        })
    })

    test("keeps the Tauri development URL on the central surface", () => {
        expect(host_context_for_url(url("127.0.0.1"))).toEqual({
            kind: "central",
            hostname: "127.0.0.1",
            auth_capable: true,
            requested_domain_slug: Option.none(),
        })
    })

    test("recognizes the canonical localhost account hub", () => {
        expect(host_context_for_url(url("app.localhost"))).toEqual({
            kind: "central",
            hostname: "app.localhost",
            auth_capable: true,
            requested_domain_slug: Option.none(),
        })
    })

    test("builds development account and generated-domain links", () => {
        expect(central_href_for_host("urm.test")).toBe(
            "http://app.localhost:1420/"
        )
        expect(domain_href_for_host("app.urm.test", "test1")).toBe(
            "http://app.localhost:1420/dashboard?domain=test1"
        )
    })

    test("builds production account and generated-domain links", () => {
        expect(central_href_for_host("test1.urm.dev")).toBe(
            "https://app.urm.dev/"
        )
        expect(domain_href_for_host("app.urm.dev", "test2")).toBe(
            "https://app.urm.dev/dashboard?domain=test2"
        )
    })
})

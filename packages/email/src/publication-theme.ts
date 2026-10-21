import { Schema } from "effect"
import {
    PublishedSiteTheme,
    resolveSiteTheme,
} from "@urm/domain/schemas/site-appearance"
import type { EmailTemplateTheme } from "./templates.ts"

export const EmailPublicationTheme = Schema.Struct({
    brand_name: Schema.String,
    site_theme: PublishedSiteTheme,
})
export type EmailPublicationTheme = typeof EmailPublicationTheme.Type

const linear_rgb = (
    lightness: number,
    chroma: number,
    hue: number
): ReadonlyArray<number> => {
    const a = chroma * Math.cos((hue * Math.PI) / 180)
    const b = chroma * Math.sin((hue * Math.PI) / 180)
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ]
}

const fraction = (value: string): number =>
    parseFloat(value) / (value.endsWith("%") ? 100 : 1)

export const email_color = (value: string, background = "#ffffff"): string => {
    if (/^#[\da-f]{6}$/i.test(value)) return value
    const match =
        /^oklch\(([\d.]+%?) ([\d.]+) ([\d.+-]+)(?: \/ ([\d.]+%?))?\)$/.exec(
            value
        )
    if (match === null)
        throw new Error(`Unsupported publication email color: ${value}`)
    const lightness = fraction(match[1] ?? "0")
    const hue = Number(match[3])
    let low = 0
    let high = Number(match[2])
    let channels = linear_rgb(lightness, high, hue)
    if (channels.some((channel) => channel < -0.000001 || channel > 1.000001)) {
        for (let index = 0; index < 24; index += 1) {
            const chroma = (low + high) / 2
            const candidate = linear_rgb(lightness, chroma, hue)
            if (candidate.every((channel) => channel >= 0 && channel <= 1))
                low = chroma
            else high = chroma
        }
        channels = linear_rgb(lightness, low, hue)
    }
    const alpha = fraction(match[4] ?? "1")
    return `#${channels
        .map((channel, index) => {
            const bounded = Math.max(0, Math.min(1, channel))
            const srgb =
                bounded <= 0.0031308
                    ? 12.92 * bounded
                    : 1.055 * bounded ** (1 / 2.4) - 0.055
            const backdrop = parseInt(
                background.slice(1 + index * 2, 3 + index * 2),
                16
            )
            return Math.round(srgb * 255 * alpha + backdrop * (1 - alpha))
                .toString(16)
                .padStart(2, "0")
        })
        .join("")}`
}

export const publication_email_theme = (
    publication: EmailPublicationTheme | null
): EmailTemplateTheme => {
    const site =
        publication?.site_theme ??
        resolveSiteTheme({ theme_id: "default", appearance: "light" })
    const tokens = site.appearance === "dark" ? site.dark : site.light
    const background = email_color(tokens.background)
    const surface = email_color(tokens.card ?? tokens.background, background)
    const primary = email_color(tokens.primary, surface)
    const primary_channels = [1, 3, 5].map((index) => {
        const channel = parseInt(primary.slice(index, index + 2), 16) / 255
        return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
    })
    const primary_luminance =
        (primary_channels[0] ?? 0) * 0.2126 +
        (primary_channels[1] ?? 0) * 0.7152 +
        (primary_channels[2] ?? 0) * 0.0722
    const radius =
        parseFloat(tokens.radius) * (tokens.radius.endsWith("px") ? 1 : 16)
    return {
        brand_name: publication?.brand_name ?? "URM",
        font_family: `${tokens.font_body}, Arial, sans-serif`,
        background_color: background,
        content_background_color: surface,
        text_color: email_color(
            tokens.card_foreground ?? tokens.foreground,
            surface
        ),
        muted_text_color: email_color(tokens.muted_foreground, surface),
        muted_background_color: email_color(
            tokens.muted ?? tokens.border,
            surface
        ),
        border_color: email_color(tokens.border, surface),
        primary_color: primary,
        primary_text_color:
            tokens.primary_foreground === undefined
                ? primary_luminance > 0.179
                    ? "#000000"
                    : "#ffffff"
                : email_color(tokens.primary_foreground, primary),
        dark_background_color: email_color(site.dark.background),
        dark_text_color: email_color(site.dark.foreground),
        link_color: primary,
        content_border_radius: radius,
        button_border_radius: radius,
    }
}

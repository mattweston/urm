import {
    resolveSiteTheme,
    type SiteAppearanceSettings,
} from "@urm/domain/schemas/site-appearance"

export const site_appearance_preview_style = (
    settings: SiteAppearanceSettings
) => {
    const theme = resolveSiteTheme(settings)
    return Object.fromEntries([
        ...Object.entries(theme.light).map(([key, value]) => [
            `--preview-light-${key.replaceAll("_", "-")}`,
            value,
        ]),
        ...Object.entries(theme.dark).map(([key, value]) => [
            `--preview-dark-${key.replaceAll("_", "-")}`,
            value,
        ]),
    ])
}

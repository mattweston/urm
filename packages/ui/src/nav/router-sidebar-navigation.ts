/**
 * The docs sidebar is server-rendered Astro markup, so its links are ordinary
 * anchors that would reload the page. A client-side router mounted underneath
 * claims the ones that fall inside its own base path and navigates instead.
 *
 * `base_path` must match the router's `basepath`. A mismatch is silent: links
 * simply stop being claimed and degrade to full page loads.
 */
export const install_sidebar_navigation = (
    base_path: string,
    navigate: (href: string) => void
): (() => void) => {
    const is_router_path = (pathname: string): boolean =>
        pathname === base_path || pathname.startsWith(`${base_path}/`)

    const handle_click = (event: MouseEvent): void => {
        if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.defaultPrevented ||
            !(event.target instanceof Element)
        ) {
            return
        }

        const link = event.target.closest("a")

        if (
            !(link instanceof HTMLAnchorElement) ||
            link.closest("[data-sidebar-navigation]") === null ||
            (link.target !== "" && link.target !== "_self") ||
            link.hasAttribute("download")
        ) {
            return
        }

        const target = new URL(link.href, window.location.href)

        if (
            target.origin !== window.location.origin ||
            !is_router_path(target.pathname)
        ) {
            return
        }

        event.preventDefault()
        navigate(`${target.pathname}${target.search}${target.hash}`)
    }

    document.addEventListener("click", handle_click)

    return () => document.removeEventListener("click", handle_click)
}

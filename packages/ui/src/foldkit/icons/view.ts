import { type Html, inertHtml } from "foldkit/html"

type IconProps = Readonly<{
    class?: string
}>

type IconOptions = Readonly<{
    fill?: string
    stroke?: string
    strokeWidth?: string
    strokeLinecap?: string
    strokeLinejoin?: string
    viewBox?: string
}>

const icon_h = inertHtml

const svg = (
    props: IconProps,
    children: ReadonlyArray<Html>,
    options: IconOptions = {}
): Html =>
    icon_h.svg(
        [
            icon_h.AriaHidden(true),
            icon_h.Class(`size-4${props.class ? ` ${props.class}` : ""}`),
            icon_h.Xmlns("http://www.w3.org/2000/svg"),
            icon_h.Fill(options.fill ?? "none"),
            icon_h.Stroke(options.stroke ?? "currentColor"),
            icon_h.StrokeWidth(options.strokeWidth ?? "2"),
            icon_h.StrokeLinecap(options.strokeLinecap ?? "round"),
            icon_h.StrokeLinejoin(options.strokeLinejoin ?? "round"),
            icon_h.ViewBox(options.viewBox ?? "0 0 24 24"),
        ],
        children
    )

const pathIcon =
    (pathData: string, options: IconOptions = {}) =>
    (props: IconProps = {}): Html =>
        svg(props, [icon_h.path([icon_h.D(pathData)], [])], options)

const pathListIcon =
    (pathData: ReadonlyArray<string>, options: IconOptions = {}) =>
    (props: IconProps = {}): Html =>
        svg(
            props,
            pathData.map((d) => icon_h.path([icon_h.D(d)], [])),
            options
        )

const makeIcon =
    (children: ReadonlyArray<Html>, options: IconOptions = {}) =>
    (props: IconProps = {}): Html =>
        svg(props, children, options)

export const IconMegaphone = pathListIcon([
    "M3 10v4h4l12 5V5L7 10H3Z",
    "M7 14l2 7h3l-2-6",
    "M22 10v4",
])

export const IconBrandGithub = pathIcon(
    "M12.5.75C6.146.75 1 5.896 1 12.25c0 5.089 3.292 9.387 7.863 10.91.575.101.79-.244.79-.546 0-.273-.014-1.178-.014-2.142-2.889.532-3.636-.704-3.866-1.35-.13-.331-.69-1.352-1.18-1.625-.402-.216-.977-.748-.014-.762.906-.014 1.553.834 1.769 1.179 1.035 1.74 2.688 1.25 3.349.948.1-.747.402-1.25.733-1.538-2.559-.287-5.232-1.279-5.232-5.678 0-1.25.445-2.285 1.178-3.09-.115-.288-.517-1.467.115-3.048 0 0 .963-.302 3.163 1.179.92-.259 1.897-.388 2.875-.388.977 0 1.955.13 2.875.388 2.2-1.495 3.162-1.179 3.162-1.179.633 1.581.23 2.76.115 3.048.733.805 1.179 1.825 1.179 3.09 0 4.413-2.688 5.39-5.247 5.678.417.36.776 1.05.776 2.128 0 1.538-.014 2.774-.014 3.162 0 .302.216.662.79.547C20.709 21.637 24 17.324 24 12.25 24 5.896 18.854.75 12.5.75Z",
    { fill: "currentColor", stroke: "none" }
)

export const IconBrandGoogle = pathIcon(
    "M20.945 11a9 9 0 1 1 -3.284 -5.997l-2.655 2.392a5.5 5.5 0 1 0 2.119 6.605h-4.125v-3h7.945z"
)

export const IconCommand = pathIcon(
    "M7 9a2 2 0 1 1 2 -2v10a2 2 0 1 1 -2 -2h10a2 2 0 1 1 -2 2v-10a2 2 0 1 1 2 2h-10"
)

export const IconCookie = pathListIcon([
    "M12 2a10 10 0 1 0 10 10c0 -1.1 -.9 -2 -2 -2h-1a3 3 0 0 1 -3 -3v-1a2 2 0 0 0 -2 -2c-1.1 0 -2 -.9 -2 -2z",
    "M8.5 8.5v.01",
    "M16 15.5v.01",
    "M12 12v.01",
    "M11 17v.01",
    "M7 14v.01",
])

export const IconCheck = pathIcon("M5 12l5 5l10 -10")

export const IconLock = pathIcon(
    "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 10.5h10.5a2.25 2.25 0 0 0 2.25-2.25v-6a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6A2.25 2.25 0 0 0 6.75 21Z",
    { strokeWidth: "1.75" }
)

export const IconChevronDown = pathIcon("M6 9l6 6l6 -6")

export const IconBrandApple = pathListIcon([
    "M8.286 7.008c-3.216 0 -4.286 3.23 -4.286 5.92c0 3.229 2.143 8.072 4.286 8.072c1.165 -.05 1.799 -.538 3.214 -.538c1.406 0 1.607 .538 3.214 .538s4.286 -3.229 4.286 -5.381c-.03 -.011 -2.649 -.434 -2.679 -3.23c-.02 -2.335 2.589 -3.179 2.679 -3.228c-1.096 -1.606 -3.162 -2.113 -3.75 -2.153c-1.535 -.12 -3.032 1.077 -3.75 1.077c-.729 0 -2.036 -1.077 -3.214 -1.077z",
    "M12 4a2 2 0 0 0 2 -2a2 2 0 0 0 -2 2",
])

export const IconBrandPaypal = pathIcon(
    "M10 13l2.5 0c2.5 0 5 -2.5 5 -5c0 -3 -1.9 -5 -5 -5h-5.5c-.5 0 -1 .5 -1 1l-2 14c0 .5 .5 1 1 1h2.8l1.2 -5c.1 -.6 .4 -1 1 -1zm7.5 -5.8c1.7 1 2.5 2.8 2.5 4.8c0 2.5 -2.5 4.5 -5 4.5h-2.6l-.6 3.6a1 1 0 0 1 -1 .8l-2.7 0a.5 .5 0 0 1 -.5 -.6l.2 -1.4"
)

export const IconCreditCard = pathListIcon([
    "M3 5m0 3a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z",
    "M3 10l18 0",
    "M7 15l.01 0",
    "M11 15l2 0",
])

export const IconTriangleAlert = pathListIcon([
    "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71 -3L13.71 3.86a2 2 0 0 0 -3.42 0z",
    "M12 9l0 4",
    "M12 17l.01 0",
])

export const IconLoader = pathListIcon([
    "M12 6l0 -3",
    "M16.25 7.75l2.15 -2.15",
    "M18 12l3 0",
    "M16.25 16.25l2.15 2.15",
    "M12 18l0 3",
    "M7.75 16.25l-2.15 2.15",
    "M6 12l-3 0",
    "M7.75 7.75l-2.15 -2.15",
])

export const IconFile = pathListIcon([
    "M14 3v4a1 1 0 0 0 1 1h4",
    "M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z",
])

export const IconPanelLeft = makeIcon([
    icon_h.rect(
        [
            icon_h.Width("18"),
            icon_h.Height("18"),
            icon_h.X("3"),
            icon_h.Y("3"),
            icon_h.Attribute("rx", "2"),
        ],
        []
    ),
    icon_h.path([icon_h.D("M9 3v18")], []),
])

export const IconPaintRoller = pathListIcon([
    "M5 21v-10",
    "M5 11v-2a2 2 0 0 1 2 -2h6",
    "M13 9h6a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h-6z",
])

export const HamburgerMenuIcon = pathIcon(
    "M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1 7.5C1 7.22386 1.22386 7 1.5 7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H1.5C1.22386 8 1 7.77614 1 7.5ZM1 11.5C1 11.2239 1.22386 11 1.5 11H13.5C13.7761 11 14 11.2239 14 11.5C14 11.7761 13.7761 12 13.5 12H1.5C1.22386 12 1 11.7761 1 11.5Z",
    { fill: "currentColor", stroke: "none", viewBox: "0 0 15 15" }
)

export const IconLogo = pathListIcon([
    "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
    "m3.3 7 8.7 5 8.7-5",
    "M12 22V12",
])

export const IconAlertTriangle = pathListIcon([
    "M12 9v4",
    "M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z",
    "M12 16h.01",
])

export const IconBrandVercel = makeIcon(
    [
        icon_h.path(
            [icon_h.D("M3 19h18l-9 -15z"), icon_h.Fill("currentColor")],
            []
        ),
    ],
    { stroke: "none" }
)

export const IconCalendar = pathListIcon([
    "M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z",
    "M16 3v4",
    "M8 3v4",
    "M4 11h16",
    "M11 15h1",
    "M12 15v3",
])

export const IconChevronLeft = pathIcon("M15 6l-6 6l6 6")

export const IconChevronRight = pathIcon("M9 6l6 6l-6 6")

export const IconChevronUp = makeIcon([
    icon_h.path(
        [icon_h.Stroke("none"), icon_h.Fill("none"), icon_h.D("M0 0h24v24H0z")],
        []
    ),
    icon_h.path([icon_h.D("M6 15l6 -6l6 6")], []),
])

export const IconChevronsLeft = pathListIcon([
    "M11 7l-5 5l5 5",
    "M17 7l-5 5l5 5",
])

export const IconChevronsRight = pathListIcon([
    "M7 7l5 5l-5 5",
    "M13 7l5 5l-5 5",
])

export const IconCircleCheck = makeIcon([
    icon_h.circle([icon_h.Cx("12"), icon_h.Cy("12"), icon_h.R("9")], []),
    icon_h.path([icon_h.D("M9 12l2 2l4 -4")], []),
])

export const IconCircleHelp = makeIcon([
    icon_h.circle([icon_h.Cx("3"), icon_h.Cy("12"), icon_h.R("9")], []),
    icon_h.path([icon_h.D("M12 16v.01")], []),
    icon_h.path(
        [icon_h.D("M12 13a2 2 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483")],
        []
    ),
])

export const IconCloud = pathIcon(
    "M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878"
)

export const IconDownload = pathListIcon([
    "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2",
    "M7 11l5 5l5 -5",
    "M12 4l0 12",
])

export const IconUpload = pathListIcon([
    "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2",
    "M7 9l5 -5l5 5",
    "M12 4l0 12",
])

export const IconEyeOff = pathListIcon([
    "M10.585 10.587a2 2 0 0 0 2.829 2.828",
    "M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87",
    "M3 3l18 18",
])

export const IconHome = pathListIcon([
    "M5 12l-2 0l9 -9l9 9l-2 0",
    "M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7",
    "M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6",
])

export const IconMail = pathListIcon([
    "M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z",
    "M3 7l9 6l9 -6",
])

export const IconSearch = pathListIcon([
    "M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0",
    "M21 21l-6 -6",
])

export const IconSettings = pathListIcon([
    "M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z",
    "M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0",
])

export const IconShoppingCart = pathListIcon([
    "M6 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0",
    "M17 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0",
    "M17 17h-11v-14h-2",
    "M6 5l14 1l-1 7h-13",
])

export const IconStar = pathIcon(
    "M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"
)

export const IconSun = pathListIcon([
    "M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0",
    "M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7",
])

export const IconTimer = makeIcon([
    icon_h.line(
        [icon_h.X1("10"), icon_h.X2("14"), icon_h.Y1("2"), icon_h.Y2("2")],
        []
    ),
    icon_h.line(
        [icon_h.X1("12"), icon_h.X2("15"), icon_h.Y1("14"), icon_h.Y2("11")],
        []
    ),
    icon_h.circle([icon_h.Cx("12"), icon_h.Cy("14"), icon_h.R("8")], []),
])

export const IconUser = pathListIcon([
    "M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0",
    "M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2",
])

export const IconUsers = pathListIcon([
    "M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0",
    "M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2",
    "M16 3.13a4 4 0 0 1 0 7.75",
    "M21 21v-2a4 4 0 0 0 -3 -3.85",
])

export const IconX = pathListIcon(["M18 6l-12 12", "M6 6l12 12"])

export const IconArchive = pathListIcon([
    "M3 4m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z",
    "M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-10",
    "M10 12l4 0",
])

export const IconArrowDown = pathListIcon([
    "M12 5l0 14",
    "M18 13l-6 6",
    "M6 13l6 6",
])

export const IconArrowRight = pathListIcon([
    "M5 12l14 0",
    "M13 18l6 -6",
    "M13 6l6 6",
])

export const IconArrowUp = pathListIcon([
    "M12 5l0 14",
    "M18 11l-6 -6",
    "M6 11l6 -6",
])

export const IconBell = pathListIcon([
    "M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6",
    "M9 17v1a3 3 0 0 0 6 0v-1",
])

export const IconBold = pathListIcon([
    "M7 5h6a3.5 3.5 0 0 1 0 7h-6z",
    "M13 12h1a3.5 3.5 0 0 1 0 7h-7v-7",
])

export const IconBrandInstagram = pathListIcon([
    "M4 4m0 4a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z",
    "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
    "M16.5 7.5l0 .01",
])

export const IconBrandReddit = makeIcon([
    icon_h.path(
        [
            icon_h.D(
                "M12 8c2.648 0 5.028 .826 6.675 2.14a2.5 2.5 0 0 1 2.326 4.36c0 3.59 -4.03 6.5 -9 6.5c-4.875 0 -8.845 -2.8 -9 -6.294l-1 -.206a2.5 2.5 0 0 1 2.326 -4.36c1.646 -1.313 4.026 -2.14 6.674 -2.14z"
            ),
        ],
        []
    ),
    icon_h.path([icon_h.D("M12 8l1 -5l6 1")], []),
    icon_h.path([icon_h.D("M19 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0")], []),
    icon_h.circle(
        [
            icon_h.Cx("9"),
            icon_h.Cy("13"),
            icon_h.R(".5"),
            icon_h.Fill("currentColor"),
        ],
        []
    ),
    icon_h.circle(
        [
            icon_h.Cx("15"),
            icon_h.Cy("13"),
            icon_h.R(".5"),
            icon_h.Fill("currentColor"),
        ],
        []
    ),
    icon_h.path(
        [icon_h.D("M10 17c.667 .333 1.333 .5 2 .5s1.333 -.167 2 -.5")],
        []
    ),
])

export const IconBrandTypescript = pathListIcon([
    "M15 17.5c.32 .32 .754 .5 1.207 .5h.543c.69 0 1.25 -.56 1.25 -1.25v-.25a1.5 1.5 0 0 0 -1.5 -1.5a1.5 1.5 0 0 1 -1.5 -1.5v-.25c0 -.69 .56 -1.25 1.25 -1.25h.543c.453 0 .887 .18 1.207 .5",
    "M9 12h4",
    "M11 12v6",
    "M21 19v-14a2 2 0 0 0 -2 -2h-14a2 2 0 0 0 -2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2 -2z",
])

export const IconBrandX = pathListIcon([
    "M4 4l11.733 16h4.267l-11.733 -16z",
    "M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772",
])

export const IconBrandYoutube = pathListIcon([
    "M2 8a4 4 0 0 1 4 -4h12a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-12a4 4 0 0 1 -4 -4v-8z",
    "M10 9l5 3l-5 3z",
])

export const IconCircle = pathIcon("M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0")

export const IconCircleOff = pathListIcon([
    "M20.042 16.045a9 9 0 0 0 -12.087 -12.087m-2.318 1.677a9 9 0 1 0 12.725 12.73",
    "M3 3l18 18",
])

export const IconCirclePlus = pathListIcon([
    "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0",
    "M9 12h6",
    "M12 9v6",
])

export const IconClock = pathListIcon([
    "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0",
    "M12 7v5l3 3",
])

export const IconCopy = pathListIcon([
    "M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z",
    "M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1",
])

export const IconDesktop = pathListIcon([
    "M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10z",
    "M7 20h10",
    "M9 16v4",
    "M15 16v4",
])

export const IconDots = pathListIcon([
    "M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
    "M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
    "M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
])

export const IconDotsVertical = pathListIcon([
    "M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
    "M12 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
    "M12 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
])

export const IconExternalLink = pathListIcon([
    "M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6",
    "M11 13l9 -9",
    "M15 4h5v5",
])

export const IconForward = makeIcon([
    icon_h.polyline([icon_h.Attribute("points", "15 17 20 12 15 7")], []),
    icon_h.path([icon_h.D("M4 18v-2a4 4 0 0 1 4-4h12")], []),
])

export const IconFullscreen = makeIcon([
    icon_h.path([icon_h.D("M3 7V5a2 2 0 0 1 2-2h2")], []),
    icon_h.path([icon_h.D("M17 3h2a2 2 0 0 1 2 2v2")], []),
    icon_h.path([icon_h.D("M21 17v2a2 2 0 0 1-2 2h-2")], []),
    icon_h.path([icon_h.D("M7 21H5a2 2 0 0 1-2-2v-2")], []),
    icon_h.rect(
        [
            icon_h.Width("10"),
            icon_h.Height("8"),
            icon_h.X("7"),
            icon_h.Y("8"),
            icon_h.Attribute("rx", "1"),
        ],
        []
    ),
])

export const IconGripVertical = makeIcon([
    icon_h.circle([icon_h.Cx("9"), icon_h.Cy("5"), icon_h.R("1")], []),
    icon_h.circle([icon_h.Cx("9"), icon_h.Cy("12"), icon_h.R("1")], []),
    icon_h.circle([icon_h.Cx("9"), icon_h.Cy("19"), icon_h.R("1")], []),
    icon_h.circle([icon_h.Cx("15"), icon_h.Cy("5"), icon_h.R("1")], []),
    icon_h.circle([icon_h.Cx("15"), icon_h.Cy("12"), icon_h.R("1")], []),
    icon_h.circle([icon_h.Cx("15"), icon_h.Cy("19"), icon_h.R("1")], []),
])

export const IconHash = pathListIcon([
    "M5 9l14 0",
    "M5 15l14 0",
    "M11 4l-4 16",
    "M17 4l-4 16",
])

export const IconHeading1 = pathListIcon([
    "M4 12h8",
    "M4 18V6",
    "M12 18V6",
    "m17 12 3-2v8",
])

export const IconHeading2 = pathListIcon([
    "M4 12h8",
    "M4 18V6",
    "M12 18V6",
    "M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1",
])

export const IconHeading3 = pathListIcon([
    "M4 12h8",
    "M4 18V6",
    "M12 18V6",
    "M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2",
    "M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2",
])

export const IconInbox = pathListIcon([
    "M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z",
    "M4 13h3l3 3h4l3 -3h3",
])

export const IconItalic = pathListIcon([
    "M11 5l6 0",
    "M7 19l6 0",
    "M14 5l-4 14",
])

export const IconLaptop = pathListIcon([
    "M3 19l18 0",
    "M5 6m0 1a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1z",
])

export const IconMessages = pathListIcon([
    "M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z",
    "M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1",
])

export const IconMinus = pathIcon("M5 12l14 0")

export const IconMobile = pathListIcon([
    "M6 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-14z",
    "M11 4h2",
    "M12 17v.01",
])

export const IconMoon = pathIcon(
    "M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"
)

export const IconReply = makeIcon([
    icon_h.polyline([icon_h.Attribute("points", "9 17 4 12 9 7")], []),
    icon_h.path([icon_h.D("M20 18v-2a4 4 0 0 0-4-4H4")], []),
])

export const IconReplyAll = makeIcon([
    icon_h.polyline([icon_h.Attribute("points", "7 17 2 12 7 7")], []),
    icon_h.polyline([icon_h.Attribute("points", "12 17 7 12 12 7")], []),
    icon_h.path([icon_h.D("M22 18v-2a4 4 0 0 0-4-4H7")], []),
])

export const IconPlus = pathListIcon(["M12 5l0 14", "M5 12l14 0"])

export const IconRocket = pathListIcon([
    "M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3",
    "M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3",
    "M15 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
])

export const IconSelector = pathListIcon(["M8 9l4 -4l4 4", "M16 15l-4 4l-4 -4"])

export const IconSend = pathListIcon([
    "M10 14l11 -11",
    "M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5",
])

export const IconSidebarOpen = pathListIcon([
    "M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z",
    "M9 4v16",
    "M14 10l2 2l-2 2",
])

export const IconSmile = pathListIcon([
    "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0",
    "M9 10l.01 0",
    "M15 10l.01 0",
    "M9.5 15a3.5 3.5 0 0 0 5 0",
])

export const IconTablet = pathListIcon([
    "M18 3a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z",
    "M9 18h6",
])

export const IconTerminal = pathListIcon(["M5 7l5 5l-5 5", "M12 19l7 0"])

export const IconTrash = pathListIcon([
    "M4 7l16 0",
    "M10 11l0 6",
    "M14 11l0 6",
    "M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12",
    "M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3",
])

export const IconUnderline = pathListIcon([
    "M7 5v5a5 5 0 0 0 10 0v-5",
    "M5 19h14",
])

export const IconUpdates = pathListIcon([
    "M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4",
    "M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4",
    "M12 9l0 3",
    "M12 15l.01 0",
])

export const IconSquarePen = pathListIcon([
    "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7Z",
    "M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z",
])

export const IconFlaskConical = pathListIcon([
    "M10 2v7.31",
    "M14 2v7.31",
    "M8.5 2h7",
    "M14 9.3a6.5 6.5 0 1 1-4 0",
    "M5.52 16h12.96",
])

export const IconLayoutDashboard = makeIcon([
    icon_h.rect(
        [
            icon_h.Width("7"),
            icon_h.Height("9"),
            icon_h.X("3"),
            icon_h.Y("3"),
            icon_h.Attribute("rx", "1"),
        ],
        []
    ),
    icon_h.rect(
        [
            icon_h.Width("7"),
            icon_h.Height("5"),
            icon_h.X("14"),
            icon_h.Y("3"),
            icon_h.Attribute("rx", "1"),
        ],
        []
    ),
    icon_h.rect(
        [
            icon_h.Width("7"),
            icon_h.Height("9"),
            icon_h.X("14"),
            icon_h.Y("12"),
            icon_h.Attribute("rx", "1"),
        ],
        []
    ),
    icon_h.rect(
        [
            icon_h.Width("7"),
            icon_h.Height("5"),
            icon_h.X("3"),
            icon_h.Y("16"),
            icon_h.Attribute("rx", "1"),
        ],
        []
    ),
])

export const IconFileText = pathListIcon([
    "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
    "M14 2v4a2 2 0 0 0 2 2h4",
    "M10 9H8",
    "M16 13H8",
    "M16 17H8",
])

export const IconImage = makeIcon([
    icon_h.rect(
        [
            icon_h.Width("18"),
            icon_h.Height("18"),
            icon_h.X("3"),
            icon_h.Y("3"),
            icon_h.Attribute("rx", "2"),
            icon_h.Attribute("ry", "2"),
        ],
        []
    ),
    icon_h.circle([icon_h.Cx("9"), icon_h.Cy("9"), icon_h.R("2")], []),
    icon_h.path([icon_h.D("m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21")], []),
])

export const IconTags = pathListIcon([
    "M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l3.58-3.58c.94-.94.94-2.48 0-3.42L9 5Z",
    "M6 9.01V9",
    "m15 5 6.3 6.29a2.4 2.4 0 0 1 0 3.42l-3.58 3.58a2.4 2.4 0 0 1-3.42 0z",
])

export const IconBug = pathListIcon([
    "m8 2 1.88 1.88",
    "M14.12 3.88 16 2",
    "M9 7.13v-1a3.003 3.003 0 1 1 6 0v1",
    "M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6",
    "M6 8H2",
    "M22 8h-4",
    "M4.5 13.307A4 4 0 0 0 2 17v1",
    "M20.5 13.307A4 4 0 0 1 22 17v1",
    "M12 20v-9",
])

export const IconMessageSquare = pathIcon(
    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
)

export const IconSquareCheck = makeIcon([
    icon_h.rect(
        [
            icon_h.Width("18"),
            icon_h.Height("18"),
            icon_h.X("3"),
            icon_h.Y("3"),
            icon_h.Attribute("rx", "2"),
        ],
        []
    ),
    icon_h.path([icon_h.D("m9 12 2 2 4-4")], []),
])

export const IconPencil = pathListIcon([
    "M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z",
    "m15 5 4 4",
])

export const IconChartColumnDecreasing = pathListIcon([
    "M12 20v-9",
    "M18 20V9",
    "M6 20v-5",
])

export const IconFileSpreadsheet = pathListIcon([
    "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
    "M14 2v4a2 2 0 0 0 2 2h4",
    "M8 13h2",
    "M14 13h2",
    "M8 17h2",
    "M14 17h2",
])

export const IconAlertCircle = makeIcon([
    icon_h.circle([icon_h.Cx("12"), icon_h.Cy("12"), icon_h.R("10")], []),
    icon_h.line(
        [icon_h.X1("12"), icon_h.X2("12"), icon_h.Y1("8"), icon_h.Y2("12")],
        []
    ),
    icon_h.line(
        [icon_h.X1("12"), icon_h.X2("12.01"), icon_h.Y1("16"), icon_h.Y2("16")],
        []
    ),
])

export const IconMoreHorizontal = makeIcon([
    icon_h.circle([icon_h.Cx("12"), icon_h.Cy("12"), icon_h.R("1")], []),
    icon_h.circle([icon_h.Cx("19"), icon_h.Cy("12"), icon_h.R("1")], []),
    icon_h.circle([icon_h.Cx("5"), icon_h.Cy("12"), icon_h.R("1")], []),
])
export const IconCheckSquare = pathListIcon([
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z",
    "m9 12 2 2 4-4",
])

export const IconCheckCircle2 = pathListIcon([
    "M21.801 10A10 10 0 1 1 17 3.335",
    "m9 11 3 3L22 4",
])

export const IconFileJson = pathListIcon([
    "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
    "M12 17h.01",
    "M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3",
])

export const IconFileVideo = pathListIcon([
    "M4 12V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2",
    "M14 2v5a1 1 0 0 0 1 1h5",
    "m10 17.843 3.033-1.755a.64.64 0 0 1 .967.56v4.704a.65.65 0 0 1-.967.56L10 20.157",
    "M4.0 16.0h5.0a1 1 0 0 1 1.0 1.0v4.0a1 1 0 0 1 -1.0 1.0h-5.0a1 1 0 0 1 -1.0 -1.0v-4.0a1 1 0 0 1 1.0 -1.0z",
])

export const IconFileQuestion = pathListIcon([
    "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
    "M12 17h.01",
    "M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3",
])

export const IconStop = pathListIcon([
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z",
    "M10.0 9.0h4.0a1 1 0 0 1 1.0 1.0v4.0a1 1 0 0 1 -1.0 1.0h-4.0a1 1 0 0 1 -1.0 -1.0v-4.0a1 1 0 0 1 1.0 -1.0z",
])

export const IconMenuSquare = pathListIcon([
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z",
    "M7 8h10",
    "M7 12h10",
    "M7 16h10",
])

export const IconColumns = pathListIcon([
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z",
    "M9 3v18",
    "M15 3v18",
])

export const IconRows = pathListIcon([
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z",
    "M21 9H3",
    "M21 15H3",
])

export const IconLayout = pathListIcon([
    "M4.0 3.0h16.0a1 1 0 0 1 1.0 1.0v5.0a1 1 0 0 1 -1.0 1.0h-16.0a1 1 0 0 1 -1.0 -1.0v-5.0a1 1 0 0 1 1.0 -1.0z",
    "M4.0 14.0h7.0a1 1 0 0 1 1.0 1.0v5.0a1 1 0 0 1 -1.0 1.0h-7.0a1 1 0 0 1 -1.0 -1.0v-5.0a1 1 0 0 1 1.0 -1.0z",
    "M17.0 14.0h3.0a1 1 0 0 1 1.0 1.0v5.0a1 1 0 0 1 -1.0 1.0h-3.0a1 1 0 0 1 -1.0 -1.0v-5.0a1 1 0 0 1 1.0 -1.0z",
])

export const IconEdit = pathIcon(
    "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
)

export const IconEdit3 = pathListIcon([
    "M13 21h8",
    "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
])

export const IconPlayCircle = pathListIcon([
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z",
    "M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z",
])

export const IconPauseCircle = pathListIcon([
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z",
    "M10 15l10 9",
    "M14 15l14 9",
])

export const IconStopCircle = pathListIcon([
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z",
    "M10.0 9.0h4.0a1 1 0 0 1 1.0 1.0v4.0a1 1 0 0 1 -1.0 1.0h-4.0a1 1 0 0 1 -1.0 -1.0v-4.0a1 1 0 0 1 1.0 -1.0z",
])

export const IconHelpCircle = pathListIcon([
    "M12 12m-10 0a10 10 0 1 0 20.0 0a10 10 0 1 0 -20.0 0",
    "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",
    "M12 17h.01",
])

export const IconAlertOctagon = pathListIcon([
    "M12 16h.01",
    "M12 8v4",
    "M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z",
])

export const IconXCircle = pathListIcon([
    "M12 12m-10 0a10 10 0 1 0 20.0 0a10 10 0 1 0 -20.0 0",
    "m15 9-6 6",
    "m9 9 6 6",
])

export const IconXOctagon = pathListIcon([
    "m15 9-6 6",
    "M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z",
    "m9 9 6 6",
])

export const IconMinusCircle = pathListIcon([
    "M12 12m-10 0a10 10 0 1 0 20.0 0a10 10 0 1 0 -20.0 0",
    "M8 12h8",
])

export const IconPlusCircle = pathListIcon([
    "M12 12m-10 0a10 10 0 1 0 20.0 0a10 10 0 1 0 -20.0 0",
    "M8 12h8",
    "M12 8v8",
])

export const IconCircleDot = pathListIcon([
    "M12 12m-10 0a10 10 0 1 0 20.0 0a10 10 0 1 0 -20.0 0",
    "M12 12m-1 0a1 1 0 1 0 2.0 0a1 1 0 1 0 -2.0 0",
])

export const IconCircleDashed = pathListIcon([
    "M10.1 2.182a10 10 0 0 1 3.8 0",
    "M13.9 21.818a10 10 0 0 1-3.8 0",
    "M17.609 3.721a10 10 0 0 1 2.69 2.7",
    "M2.182 13.9a10 10 0 0 1 0-3.8",
    "M20.279 17.609a10 10 0 0 1-2.7 2.69",
    "M21.818 10.1a10 10 0 0 1 0 3.8",
    "M3.721 6.391a10 10 0 0 1 2.7-2.69",
    "M6.391 20.279a10 10 0 0 1-2.69-2.7",
])

export const IconCircleDotDashed = pathListIcon([
    "M10.1 2.18a9.93 9.93 0 0 1 3.8 0",
    "M17.6 3.71a9.95 9.95 0 0 1 2.69 2.7",
    "M21.82 10.1a9.93 9.93 0 0 1 0 3.8",
    "M20.29 17.6a9.95 9.95 0 0 1-2.7 2.69",
    "M13.9 21.82a9.94 9.94 0 0 1-3.8 0",
    "M6.4 20.29a9.95 9.95 0 0 1-2.69-2.7",
    "M2.18 13.9a9.93 9.93 0 0 1 0-3.8",
    "M3.71 6.4a9.95 9.95 0 0 1 2.7-2.69",
    "M12 12m-1 0a1 1 0 1 0 2.0 0a1 1 0 1 0 -2.0 0",
])

export const IconSquare = pathIcon(
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z"
)

export const IconSquareDot = pathListIcon([
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z",
    "M12 12m-1 0a1 1 0 1 0 2.0 0a1 1 0 1 0 -2.0 0",
])

export const IconSquareDashed = pathListIcon([
    "M5 3a2 2 0 0 0-2 2",
    "M19 3a2 2 0 0 1 2 2",
    "M21 19a2 2 0 0 1-2 2",
    "M5 21a2 2 0 0 1-2-2",
    "M9 3h1",
    "M9 21h1",
    "M14 3h1",
    "M14 21h1",
    "M3 9v1",
    "M21 9v1",
    "M3 14v1",
    "M21 14v1",
])

export const IconSquareMinus = pathListIcon([
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z",
    "M8 12h8",
])

export const IconSquarePlus = pathListIcon([
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z",
    "M8 12h8",
    "M12 8v8",
])

export const IconSquareX = pathListIcon([
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z",
    "m15 9-6 6",
    "m9 9 6 6",
])

export const IconOctagon = pathIcon(
    "M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"
)

export const IconOctagonAlert = pathListIcon([
    "M12 16h.01",
    "M12 8v4",
    "M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z",
])

export const IconOctagonX = pathListIcon([
    "m15 9-6 6",
    "M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z",
    "m9 9 6 6",
])

export const IconOctagonMinus = pathListIcon([
    "M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z",
    "M8 12h8",
])

export const IconTriangle = pathIcon(
    "M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
)

export const IconInfo = pathListIcon([
    "M12 12m-10 0a10 10 0 1 0 20.0 0a10 10 0 1 0 -20.0 0",
    "M12 16v-4",
    "M12 8h.01",
])

export const IconTrash2 = pathListIcon([
    "M10 11v6",
    "M14 11v6",
    "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
    "M3 6h18",
    "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
])

export const IconCopyPlus = pathListIcon([
    "M15 12l15 18",
    "M12 15l18 15",
    "M10.0 8.0h10.0a2 2 0 0 1 2.0 2.0v10.0a2 2 0 0 1 -2.0 2.0h-10.0a2 2 0 0 1 -2.0 -2.0v-10.0a2 2 0 0 1 2.0 -2.0z",
    "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
])

export const IconCopyX = pathListIcon([
    "M12 12l18 18",
    "M12 18l18 12",
    "M10.0 8.0h10.0a2 2 0 0 1 2.0 2.0v10.0a2 2 0 0 1 -2.0 2.0h-10.0a2 2 0 0 1 -2.0 -2.0v-10.0a2 2 0 0 1 2.0 -2.0z",
    "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
])

export const IconScissors = pathListIcon([
    "M6 6m-3 0a3 3 0 1 0 6.0 0a3 3 0 1 0 -6.0 0",
    "M8.12 8.12 12 12",
    "M20 4 8.12 15.88",
    "M6 18m-3 0a3 3 0 1 0 6.0 0a3 3 0 1 0 -6.0 0",
    "M14.8 14.8 20 20",
])

export const IconLink = pathListIcon([
    "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
    "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
])

export const IconUnlink = pathListIcon([
    "m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71",
    "m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71",
    "M8 2l8 5",
    "M2 8l5 8",
    "M16 19l16 22",
    "M19 16l22 16",
])

export const IconPin = pathListIcon([
    "M12 17v5",
    "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z",
])

export const IconPinOff = pathListIcon([
    "M12 17v5",
    "M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89",
    "m2 2 20 20",
    "M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11",
])

export const IconBookmark = pathIcon(
    "M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"
)

export const IconBookmarkPlus = pathListIcon([
    "M12 7v6",
    "M15 10H9",
    "M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z",
])

export const IconBookmarkMinus = pathListIcon([
    "M15 10H9",
    "M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z",
])

export const IconBookmarkX = pathListIcon([
    "m14.5 7.5-5 5",
    "M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z",
    "m9.5 7.5 5 5",
])

export const IconBookmarkCheck = pathListIcon([
    "M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z",
    "m9 10 2 2 4-4",
])

export const IconStarOff = pathListIcon([
    "m10.344 4.688 1.181-2.393a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.237 3.152",
    "m17.945 17.945.43 2.505a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a8 8 0 0 0 .4-.099",
    "m2 2 20 20",
])

export const IconHeart = pathIcon(
    "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"
)

export const IconHeartOff = pathListIcon([
    "M10.5 4.893a5.5 5.5 0 0 1 1.091.931.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 1.872-1.002 3.356-2.187 4.655",
    "m16.967 16.967-3.459 3.346a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5a5.5 5.5 0 0 1 2.747-4.761",
    "m2 2 20 20",
])

export const IconThumbsUp = pathListIcon([
    "M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z",
    "M7 10v12",
])

export const IconThumbsDown = pathListIcon([
    "M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z",
    "M17 14V2",
])

export const IconFlag = pathIcon(
    "M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"
)

export const IconFlagOff = pathListIcon([
    "M16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528",
    "m2 2 20 20",
    "M4 22V4",
    "M7.656 2H8c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10.347",
])

export const IconZap = pathIcon(
    "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
)

export const IconZapOff = pathListIcon([
    "M10.513 4.856 13.12 2.17a.5.5 0 0 1 .86.46l-1.377 4.317",
    "M15.656 10H20a1 1 0 0 1 .78 1.63l-1.72 1.773",
    "M16.273 16.273 10.88 21.83a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4a1 1 0 0 1-.78-1.63l4.507-4.643",
    "m2 2 20 20",
])

export const IconPower = pathListIcon([
    "M12 2v10",
    "M18.4 6.6a9 9 0 1 1-12.77.04",
])

export const IconPowerOff = pathListIcon([
    "M18.36 6.64A9 9 0 0 1 20.77 15",
    "M6.16 6.16a9 9 0 1 0 12.68 12.68",
    "M12 2v4",
    "m2 2 20 20",
])

export const IconRefreshCw = pathListIcon([
    "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
    "M21 3v5h-5",
    "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
    "M8 16H3v5",
])

export const IconRefreshCcw = pathListIcon([
    "M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
    "M3 3v5h5",
    "M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16",
    "M16 16h5v5",
])

export const IconRotateCw = pathListIcon([
    "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",
    "M21 3v5h-5",
])

export const IconRotateCcw = pathListIcon([
    "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
    "M3 3v5h5",
])

export const IconUndo = pathListIcon([
    "M3 7v6h6",
    "M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13",
])

export const IconRedo = pathListIcon([
    "M21 7v6h-6",
    "M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7",
])

export const IconRepeat = pathListIcon([
    "m17 2 4 4-4 4",
    "M3 11v-1a4 4 0 0 1 4-4h14",
    "m7 22-4-4 4-4",
    "M21 13v1a4 4 0 0 1-4 4H3",
])

export const IconRepeat1 = pathListIcon([
    "m17 2 4 4-4 4",
    "M3 11v-1a4 4 0 0 1 4-4h14",
    "m7 22-4-4 4-4",
    "M21 13v1a4 4 0 0 1-4 4H3",
    "M11 10h1v4",
])

export const IconShuffle = pathListIcon([
    "m18 14 4 4-4 4",
    "m18 2 4 4-4 4",
    "M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22",
    "M2 6h1.972a4 4 0 0 1 3.6 2.2",
    "M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45",
])

export const IconArrowLeft = pathListIcon(["m12 19-7-7 7-7", "M19 12H5"])

export const IconArrowLeftRight = pathListIcon([
    "M8 3 4 7l4 4",
    "M4 7h16",
    "m16 21 4-4-4-4",
    "M20 17H4",
])

export const IconArrowUpDown = pathListIcon([
    "m21 16-4 4-4-4",
    "M17 20V4",
    "m3 8 4-4 4 4",
    "M7 4v16",
])

export const IconArrowUpRight = pathListIcon(["M7 7h10v10", "M7 17 17 7"])

export const IconArrowDownLeft = pathListIcon(["M17 7 7 17", "M17 17H7V7"])

export const IconArrowDownRight = pathListIcon(["m7 7 10 10", "M17 7v10H7"])

export const IconMove = pathListIcon([
    "M12 2v20",
    "m15 19-3 3-3-3",
    "m19 9 3 3-3 3",
    "M2 12h20",
    "m5 9-3 3 3 3",
    "m9 5 3-3 3 3",
])

export const IconMoveVertical = pathListIcon([
    "M12 2v20",
    "m8 18 4 4 4-4",
    "m8 6 4-4 4 4",
])

export const IconMoveHorizontal = pathListIcon([
    "m18 8 4 4-4 4",
    "M2 12h20",
    "m6 8-4 4 4 4",
])

export const IconChevronsUpDown = pathListIcon([
    "m7 15 5 5 5-5",
    "m7 9 5-5 5 5",
])

export const IconRadio = pathListIcon([
    "M16.247 7.761a6 6 0 0 1 0 8.478",
    "M19.075 4.933a10 10 0 0 1 0 14.134",
    "M4.925 19.067a10 10 0 0 1 0-14.134",
    "M7.753 16.239a6 6 0 0 1 0-8.478",
    "M12 12m-2 0a2 2 0 1 0 4.0 0a2 2 0 1 0 -4.0 0",
])

export const IconToggleLeft = pathListIcon([
    "M9 12m-3 0a3 3 0 1 0 6.0 0a3 3 0 1 0 -6.0 0",
    "M9.0 5.0h6.0a7 7 0 0 1 7.0 7.0v0.0a7 7 0 0 1 -7.0 7.0h-6.0a7 7 0 0 1 -7.0 -7.0v-0.0a7 7 0 0 1 7.0 -7.0z",
])

export const IconToggleRight = pathListIcon([
    "M15 12m-3 0a3 3 0 1 0 6.0 0a3 3 0 1 0 -6.0 0",
    "M9.0 5.0h6.0a7 7 0 0 1 7.0 7.0v0.0a7 7 0 0 1 -7.0 7.0h-6.0a7 7 0 0 1 -7.0 -7.0v-0.0a7 7 0 0 1 7.0 -7.0z",
])

export const IconFolder = pathIcon(
    "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
)

export const IconFolderOpen = pathIcon(
    "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"
)

export const IconFolderClosed = pathListIcon([
    "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
    "M2 10h20",
])

export const IconFilePlus = pathListIcon([
    "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
    "M14 2v5a1 1 0 0 0 1 1h5",
    "M9 15h6",
    "M12 18v-6",
])

export const IconFileMinus = pathListIcon([
    "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
    "M14 2v5a1 1 0 0 0 1 1h5",
    "M9 15h6",
])

export const IconFileCheck = pathListIcon([
    "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
    "M14 2v5a1 1 0 0 0 1 1h5",
    "m9 15 2 2 4-4",
])

export const IconFileX = pathListIcon([
    "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
    "M14 2v5a1 1 0 0 0 1 1h5",
    "m14.5 12.5-5 5",
    "m9.5 12.5 5 5",
])

export const IconFileCode = pathListIcon([
    "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
    "M14 2v5a1 1 0 0 0 1 1h5",
    "M10 12.5 8 15l2 2.5",
    "m14 12.5 2 2.5-2 2.5",
])

export const IconFileType = pathListIcon([
    "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
    "M14 2v5a1 1 0 0 0 1 1h5",
    "M11 18h2",
    "M12 12v6",
    "M9 13v-.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v.5",
])

export const IconFileImage = pathListIcon([
    "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
    "M14 2v5a1 1 0 0 0 1 1h5",
    "M10 12m-2 0a2 2 0 1 0 4.0 0a2 2 0 1 0 -4.0 0",
    "m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22",
])

export const IconPlay = pathIcon(
    "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"
)

export const IconPause = pathListIcon([
    "M15.0 3.0h3.0a1 1 0 0 1 1.0 1.0v16.0a1 1 0 0 1 -1.0 1.0h-3.0a1 1 0 0 1 -1.0 -1.0v-16.0a1 1 0 0 1 1.0 -1.0z",
    "M6.0 3.0h3.0a1 1 0 0 1 1.0 1.0v16.0a1 1 0 0 1 -1.0 1.0h-3.0a1 1 0 0 1 -1.0 -1.0v-16.0a1 1 0 0 1 1.0 -1.0z",
])

export const IconSkipForward = pathListIcon([
    "M21 4v16",
    "M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z",
])

export const IconSkipBack = pathListIcon([
    "M17.971 4.285A2 2 0 0 1 21 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z",
    "M3 20V4",
])

export const IconVolume = pathIcon(
    "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"
)

export const IconVolume2 = pathListIcon([
    "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
    "M16 9a5 5 0 0 1 0 6",
    "M19.364 18.364a9 9 0 0 0 0-12.728",
])

export const IconVolumeX = pathListIcon([
    "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
    "M22 9l16 15",
    "M16 9l22 15",
])

export const IconVolume1 = pathListIcon([
    "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
    "M16 9a5 5 0 0 1 0 6",
])

export const IconMic = pathListIcon([
    "M12 19v3",
    "M19 10v2a7 7 0 0 1-14 0v-2",
    "M12.0 2.0h0.0a3 3 0 0 1 3.0 3.0v7.0a3 3 0 0 1 -3.0 3.0h-0.0a3 3 0 0 1 -3.0 -3.0v-7.0a3 3 0 0 1 3.0 -3.0z",
])

export const IconCamera = pathListIcon([
    "M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z",
    "M12 13m-3 0a3 3 0 1 0 6.0 0a3 3 0 1 0 -6.0 0",
])

export const IconVideo = pathListIcon([
    "m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",
    "M4.0 6.0h10.0a2 2 0 0 1 2.0 2.0v8.0a2 2 0 0 1 -2.0 2.0h-10.0a2 2 0 0 1 -2.0 -2.0v-8.0a2 2 0 0 1 2.0 -2.0z",
])

export const IconImagePlus = pathListIcon([
    "M16 5h6",
    "M19 2v6",
    "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5",
    "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
    "M9 9m-2 0a2 2 0 1 0 4.0 0a2 2 0 1 0 -4.0 0",
])

export const IconImageMinus = pathListIcon([
    "M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7",
    "M16 5l22 5",
    "M9 9m-2 0a2 2 0 1 0 4.0 0a2 2 0 1 0 -4.0 0",
    "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
])

export const IconImageOff = pathListIcon([
    "M2 2l22 22",
    "M10.41 10.41a2 2 0 1 1-2.83-2.83",
    "M13.5 13.5l6 21",
    "M18 12l21 15",
    "M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59",
    "M21 15V5a2 2 0 0 0-2-2H9",
])

export const IconMenu = pathListIcon(["M4 5h16", "M4 12h16", "M4 19h16"])

export const IconList = pathListIcon([
    "M3 5h.01",
    "M3 12h.01",
    "M3 19h.01",
    "M8 5h13",
    "M8 12h13",
    "M8 19h13",
])

export const IconListOrdered = pathListIcon([
    "M11 5h10",
    "M11 12h10",
    "M11 19h10",
    "M4 4h1v5",
    "M4 9h2",
    "M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02",
])

export const IconListChecks = pathListIcon([
    "M13 5h8",
    "M13 12h8",
    "M13 19h8",
    "m3 17 2 2 4-4",
    "m3 7 2 2 4-4",
])

export const IconGrid3x3 = pathListIcon([
    "M5.0 3.0h14.0a2 2 0 0 1 2.0 2.0v14.0a2 2 0 0 1 -2.0 2.0h-14.0a2 2 0 0 1 -2.0 -2.0v-14.0a2 2 0 0 1 2.0 -2.0z",
    "M3 9h18",
    "M3 15h18",
    "M9 3v18",
    "M15 3v18",
])

export const IconLayoutList = pathListIcon([
    "M4.0 3.0h5.0a1 1 0 0 1 1.0 1.0v5.0a1 1 0 0 1 -1.0 1.0h-5.0a1 1 0 0 1 -1.0 -1.0v-5.0a1 1 0 0 1 1.0 -1.0z",
    "M4.0 14.0h5.0a1 1 0 0 1 1.0 1.0v5.0a1 1 0 0 1 -1.0 1.0h-5.0a1 1 0 0 1 -1.0 -1.0v-5.0a1 1 0 0 1 1.0 -1.0z",
    "M14 4h7",
    "M14 9h7",
    "M14 15h7",
    "M14 20h7",
])

export const IconLayoutTemplate = pathListIcon([
    "M4.0 3.0h16.0a1 1 0 0 1 1.0 1.0v5.0a1 1 0 0 1 -1.0 1.0h-16.0a1 1 0 0 1 -1.0 -1.0v-5.0a1 1 0 0 1 1.0 -1.0z",
    "M4.0 14.0h7.0a1 1 0 0 1 1.0 1.0v5.0a1 1 0 0 1 -1.0 1.0h-7.0a1 1 0 0 1 -1.0 -1.0v-5.0a1 1 0 0 1 1.0 -1.0z",
    "M17.0 14.0h3.0a1 1 0 0 1 1.0 1.0v5.0a1 1 0 0 1 -1.0 1.0h-3.0a1 1 0 0 1 -1.0 -1.0v-5.0a1 1 0 0 1 1.0 -1.0z",
])

export const IconLayoutGrid = pathListIcon([
    "M4.0 3.0h5.0a1 1 0 0 1 1.0 1.0v5.0a1 1 0 0 1 -1.0 1.0h-5.0a1 1 0 0 1 -1.0 -1.0v-5.0a1 1 0 0 1 1.0 -1.0z",
    "M15.0 3.0h5.0a1 1 0 0 1 1.0 1.0v5.0a1 1 0 0 1 -1.0 1.0h-5.0a1 1 0 0 1 -1.0 -1.0v-5.0a1 1 0 0 1 1.0 -1.0z",
    "M15.0 14.0h5.0a1 1 0 0 1 1.0 1.0v5.0a1 1 0 0 1 -1.0 1.0h-5.0a1 1 0 0 1 -1.0 -1.0v-5.0a1 1 0 0 1 1.0 -1.0z",
    "M4.0 14.0h5.0a1 1 0 0 1 1.0 1.0v5.0a1 1 0 0 1 -1.0 1.0h-5.0a1 1 0 0 1 -1.0 -1.0v-5.0a1 1 0 0 1 1.0 -1.0z",
])

export const IconMaximize = pathListIcon([
    "M8 3H5a2 2 0 0 0-2 2v3",
    "M21 8V5a2 2 0 0 0-2-2h-3",
    "M3 16v3a2 2 0 0 0 2 2h3",
    "M16 21h3a2 2 0 0 0 2-2v-3",
])

export const IconMinimize = pathListIcon([
    "M8 3v3a2 2 0 0 1-2 2H3",
    "M21 8h-3a2 2 0 0 1-2-2V3",
    "M3 16h3a2 2 0 0 1 2 2v3",
    "M16 21v-3a2 2 0 0 1 2-2h3",
])

export const IconMaximize2 = pathListIcon([
    "M15 3h6v6",
    "m21 3-7 7",
    "m3 21 7-7",
    "M9 21H3v-6",
])

export const IconMinimize2 = pathListIcon([
    "m14 10 7-7",
    "M20 10h-6V4",
    "m3 21 7-7",
    "M4 14h6v6",
])

/** # Icons view */
import { type Html, type HtmlBuilder } from "foldkit/html"
// import { cn } from '@urm/utils/layout'

import {
    IconAlertCircle,
    IconAlertTriangle,
    IconArchive,
    IconArrowDown,
    IconArrowRight,
    IconArrowUp,
    IconBell,
    IconBold,
    IconBrandApple,
    IconBrandGithub,
    IconBrandGoogle,
    IconBrandInstagram,
    IconBrandPaypal,
    IconBrandReddit,
    IconBrandTypescript,
    IconBrandVercel,
    IconBrandX,
    IconBrandYoutube,
    IconBug,
    IconCalendar,
    IconChartColumnDecreasing,
    IconCheck,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronUp,
    IconChevronsLeft,
    IconChevronsRight,
    IconCircle,
    IconCircleCheck,
    IconCircleHelp,
    IconCircleOff,
    IconCirclePlus,
    IconClock,
    IconCloud,
    IconCommand,
    IconCopy,
    IconCreditCard,
    IconDesktop,
    IconDots,
    IconDotsVertical,
    IconDownload,
    IconExternalLink,
    IconEyeOff,
    IconFile,
    IconFileSpreadsheet,
    IconFileText,
    IconFlaskConical,
    IconForward,
    IconFullscreen,
    IconHash,
    IconHeading1,
    IconHeading2,
    IconHeading3,
    IconHome,
    IconImage,
    IconInbox,
    IconItalic,
    IconLaptop,
    IconLayoutDashboard,
    IconLoader,
    IconLogo,
    IconMail,
    IconMessageSquare,
    IconMessages,
    IconMinus,
    IconMobile,
    IconMoon,
    IconMoreHorizontal,
    IconPanelLeft,
    IconPencil,
    IconPlus,
    IconReply,
    IconReplyAll,
    IconRocket,
    IconSearch,
    IconSelector,
    IconSend,
    IconSettings,
    IconShoppingCart,
    IconSidebarOpen,
    IconSmile,
    IconSquareCheck,
    IconSquarePen,
    IconStar,
    IconSun,
    IconTablet,
    IconTags,
    IconTerminal,
    IconTimer,
    IconTrash,
    IconTriangleAlert,
    IconUnderline,
    IconUpdates,
    IconUser,
    IconUsers,
    IconX,
} from "@urm/ui/foldkit/icons/view.ts"

export {
    IconAlertCircle,
    IconAlertTriangle,
    IconArchive,
    IconArrowDown,
    IconArrowRight,
    IconArrowUp,
    IconBell,
    IconBold,
    IconBrandApple,
    IconBrandGithub,
    IconBrandGoogle,
    IconBrandInstagram,
    IconBrandPaypal,
    IconBrandReddit,
    IconBrandTypescript,
    IconBrandVercel,
    IconBrandX,
    IconBrandYoutube,
    IconBug,
    IconCalendar,
    IconChartColumnDecreasing,
    IconCheck,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronUp,
    IconChevronsLeft,
    IconChevronsRight,
    IconCircle,
    IconCircleCheck,
    IconCircleHelp,
    IconCircleOff,
    IconCirclePlus,
    IconClock,
    IconCloud,
    IconCommand,
    IconCopy,
    IconCreditCard,
    IconDesktop,
    IconDots,
    IconDotsVertical,
    IconDownload,
    IconExternalLink,
    IconEyeOff,
    IconFile,
    IconFileSpreadsheet,
    IconFileText,
    IconFlaskConical,
    IconForward,
    IconFullscreen,
    IconHash,
    IconHeading1,
    IconHeading2,
    IconHeading3,
    IconHome,
    IconImage,
    IconInbox,
    IconItalic,
    IconLaptop,
    IconLayoutDashboard,
    IconLoader,
    IconLogo,
    IconMail,
    IconMessageSquare,
    IconMessages,
    IconMinus,
    IconMobile,
    IconMoon,
    IconMoreHorizontal,
    IconPanelLeft,
    IconPencil,
    IconPlus,
    IconReply,
    IconReplyAll,
    IconRocket,
    IconSearch,
    IconSelector,
    IconSend,
    IconSettings,
    IconShoppingCart,
    IconSidebarOpen,
    IconSmile,
    IconSquareCheck,
    IconSquarePen,
    IconStar,
    IconSun,
    IconTablet,
    IconTags,
    IconTerminal,
    IconTimer,
    IconTrash,
    IconTriangleAlert,
    IconUnderline,
    IconUpdates,
    IconUser,
    IconUsers,
    IconX,
}

type IconCard = Readonly<{
    name: string
    render: (className?: string) => Html
}>

type IconProps = Readonly<{
    class?: string
}>

// type IconOptions = Readonly<{
//     fill?: string
//     stroke?: string
//     strokeWidth?: string
//     strokeLinecap?: string
//     strokeLinejoin?: string
//     viewBox?: string
// }>

// const icon_h = html<never>()

// const svg = (props: IconProps, children: ReadonlyArray<Html>, options: IconOptions = {}): Html =>
//     icon_h.svg(
//         [
//             icon_h.AriaHidden(true),
//             icon_h.Class(cn('size-4', props.class)),
//             icon_h.Xmlns('http://www.w3.org/2000/svg'),
//             icon_h.Fill(options.fill ?? 'none'),
//             icon_h.Stroke(options.stroke ?? 'currentColor'),
//             icon_h.StrokeWidth(options.strokeWidth ?? '2'),
//             icon_h.StrokeLinecap(options.strokeLinecap ?? 'round'),
//             icon_h.StrokeLinejoin(options.strokeLinejoin ?? 'round'),
//             icon_h.ViewBox(options.viewBox ?? '0 0 24 24'),
//         ],
//         children,
//     )

// const makeIcon = (children: ReadonlyArray<Html>, options: IconOptions = {}) =>
//     (props: IconProps = {}): Html => svg(props, children, options)

// const pathIcon = (pathData: string, options: IconOptions = {}) =>
//     makeIcon([icon_h.path([icon_h.D(pathData)], [])], options)

// const pathListIcon = (pathData: ReadonlyArray<string>, options: IconOptions = {}) =>
//     makeIcon(pathData.map((d) => icon_h.path([icon_h.D(d)], [])), options)

const createCard = (
    name: string,
    icon: (props?: IconProps) => Html
): IconCard => ({
    name,
    render: (className?: string) =>
        className === undefined ? icon() : icon({ class: className }),
})

const ICON_CARDS: ReadonlyArray<IconCard> = [
    createCard("Logo", IconLogo),
    createCard("Alert Triangle", IconAlertTriangle),
    createCard("Archive", IconArchive),
    createCard("Arrow Down", IconArrowDown),
    createCard("Arrow Right", IconArrowRight),
    createCard("Arrow Up", IconArrowUp),
    createCard("Bell", IconBell),
    createCard("Bold", IconBold),
    createCard("Brand Apple", IconBrandApple),
    createCard("Brand Github", IconBrandGithub),
    createCard("Brand Google", IconBrandGoogle),
    createCard("Brand Instagram", IconBrandInstagram),
    createCard("Brand Paypal", IconBrandPaypal),
    createCard("Brand Reddit", IconBrandReddit),
    createCard("Brand Typescript", IconBrandTypescript),
    createCard("Brand Vercel", IconBrandVercel),
    createCard("Brand X", IconBrandX),
    createCard("Brand Youtube", IconBrandYoutube),
    createCard("Calendar", IconCalendar),
    createCard("Check", IconCheck),
    createCard("Chevron Down", IconChevronDown),
    createCard("Chevron Left", IconChevronLeft),
    createCard("Chevron Right", IconChevronRight),
    createCard("Chevron Up", IconChevronUp),
    createCard("Chevrons Left", IconChevronsLeft),
    createCard("Chevrons Right", IconChevronsRight),
    createCard("Circle", IconCircle),
    createCard("Circle Check", IconCircleCheck),
    createCard("Circle Help", IconCircleHelp),
    createCard("Circle Off", IconCircleOff),
    createCard("Circle Plus", IconCirclePlus),
    createCard("Clock", IconClock),
    createCard("Cloud", IconCloud),
    createCard("Command", IconCommand),
    createCard("Copy", IconCopy),
    createCard("Credit Card", IconCreditCard),
    createCard("Desktop", IconDesktop),
    createCard("Dots", IconDots),
    createCard("Dots Vertical", IconDotsVertical),
    createCard("Download", IconDownload),
    createCard("External Link", IconExternalLink),
    createCard("Eye Off", IconEyeOff),
    createCard("File", IconFile),
    createCard("Forward", IconForward),
    createCard("Fullscreen", IconFullscreen),
    createCard("Hash", IconHash),
    createCard("Home", IconHome),
    createCard("Inbox", IconInbox),
    createCard("Italic", IconItalic),
    createCard("Laptop", IconLaptop),
    createCard("Loader", IconLoader),
    createCard("Mail", IconMail),
    createCard("Messages", IconMessages),
    createCard("Minus", IconMinus),
    createCard("Mobile", IconMobile),
    createCard("Moon", IconMoon),
    createCard("Reply", IconReply),
    createCard("Reply All", IconReplyAll),
    createCard("Plus", IconPlus),
    createCard("Rocket", IconRocket),
    createCard("Search", IconSearch),
    createCard("Selector", IconSelector),
    createCard("Send", IconSend),
    createCard("Settings", IconSettings),
    createCard("Shopping Cart", IconShoppingCart),
    createCard("Sidebar Open", IconSidebarOpen),
    createCard("Smile", IconSmile),
    createCard("Square Pen", IconSquarePen),
    createCard("Star", IconStar),
    createCard("Sun", IconSun),
    createCard("Tablet", IconTablet),
    createCard("Terminal", IconTerminal),
    createCard("Timer", IconTimer),
    createCard("Trash", IconTrash),
    createCard("Underline", IconUnderline),
    createCard("Updates", IconUpdates),
    createCard("User", IconUser),
    createCard("Users", IconUsers),
    createCard("X", IconX),
    createCard("Flask Conical", IconFlaskConical),
    createCard("Layout Dashboard", IconLayoutDashboard),
    createCard("File Text", IconFileText),
    createCard("Image", IconImage),
    createCard("Tags", IconTags),
    createCard("Bug", IconBug),
    createCard("Message Square", IconMessageSquare),
    createCard("Square Check", IconSquareCheck),
    createCard("Pencil", IconPencil),
    createCard("Chart Column Decreasing", IconChartColumnDecreasing),
    createCard("File Spreadsheet", IconFileSpreadsheet),
    createCard("Panel Left", IconPanelLeft),
    createCard("Alert Circle", IconAlertCircle),
    createCard("More Horizontal", IconMoreHorizontal),
]

const cardClassName =
    "flex flex-col gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 text-card-foreground [box-shadow:var(--shadow-surface)]"
const frameClassName =
    "flex h-20 w-full items-center justify-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background text-foreground"
const labelClassName = "text-xs font-medium text-muted-foreground"
const gridClassName = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

const iconCard = <ParentMessage>(
    card: IconCard,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.figure(
        [h.Class(cardClassName)],
        [
            h.div(
                [h.Class(frameClassName)],
                [card.render("size-8 text-foreground")]
            ),
            h.figcaption([h.Class(labelClassName)], [card.name]),
        ]
    )
}

/**
 * Browse the shared icon catalogue and its sizing conventions. Each icon uses
 * the current foreground and theme tokens so it remains legible across themes.
 */
export const view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    return h.div(
        [h.Class("space-y-6")],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h2(
                        [h.Class("text-2xl font-bold text-foreground")],
                        ["Icons"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-2xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Selected icons from packages/ui/src/media/icons.tsx, rendered with foldkit/html.",
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class(gridClassName)],
                ICON_CARDS.map((card) => iconCard<ParentMessage>(card, h))
            ),
        ]
    )
}

import { graph_view } from "./nav/graph.ts"
import { Callout } from "@urm/ui/foldkit/callout.view.ts"
import { Steps } from "@urm/ui/foldkit/steps.view.ts"
import { Match as M, Option, Schema as S } from "effect"
import { Command, Submodel, Subscription } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { DesktopRoute } from "../routing/route.ts"
import { demos, demo_href, index_href, is_ui_path } from "./catalog.ts"
import { nav_view } from "./nav.ts"
import * as SelectionSubmodels from "@urm/features/labs/selection-submodels"
import * as Button from "@urm/features/labs/button"
import * as Input from "@urm/features/labs/input"
import * as Textarea from "@urm/features/labs/textarea"
import * as Checkbox from "@urm/features/labs/checkbox"
import * as Fieldset from "@urm/features/labs/fieldset"
import * as RadioGroup from "@urm/features/labs/radio-group"
import * as Switch from "@urm/features/labs/switch"
import * as Slider from "./slider.ts"
import * as Select from "@urm/features/labs/select"
import * as Listbox from "@urm/features/labs/listbox"
import * as Combobox from "@urm/features/labs/combobox"
import * as Dialog from "@urm/features/labs/dialog"
import * as Menu from "@urm/features/labs/menu"
import * as Popover from "@urm/features/labs/popover"
import * as Tooltip from "@urm/features/labs/tooltip"
import * as Toast from "@urm/features/labs/toast"
import * as Disclosure from "@urm/features/labs/disclosure"
import * as Tabs from "@urm/features/labs/tabs"
import * as DragAndDrop from "@urm/features/labs/drag-and-drop"
import * as FileDrop from "@urm/features/labs/file-drop"
import * as FileTree from "@urm/features/labs/file-tree"
import * as Calendar from "@urm/features/labs/calendar"
import * as DatePicker from "@urm/features/labs/date-picker"
import * as TimePicker from "./time-picker.ts"
import * as Animation from "@urm/features/labs/animation"
import * as VirtualList from "@urm/features/labs/virtual-list"
import * as DataTable from "@urm/features/labs/data-table"

export const Model = S.Struct({
    path: S.String,
    selection_submodels: SelectionSubmodels.Model,
    button: Button.Model,
    input: Input.Model,
    textarea: Textarea.Model,
    checkbox: Checkbox.Model,
    fieldset: Fieldset.Model,
    radio_group: RadioGroup.Model,
    switch: Switch.Model,
    slider: Slider.Model,
    select: Select.Model,
    listbox: Listbox.Model,
    combobox: Combobox.Model,
    dialog: Dialog.Model,
    menu: Menu.Model,
    popover: Popover.Model,
    tooltip: Tooltip.Model,
    toast: Toast.Model,
    disclosure: Disclosure.Model,
    tabs: Tabs.Model,
    drag_and_drop: DragAndDrop.Model,
    file_drop: FileDrop.Model,
    calendar: Calendar.Model,
    date_picker: DatePicker.Model,
    time_picker: TimePicker.Model,
    animation: Animation.Model,
    virtual_list: VirtualList.Model,
})
export type Model = typeof Model.Type

export const GotSelectionSubmodelsMessage = taggedStruct("GotSelectionSubmodelsMessage", {
    message: SelectionSubmodels.Message,
})
export const GotButtonMessage = taggedStruct("GotButtonMessage", {
    message: Button.Message,
})
export const GotInputMessage = taggedStruct("GotInputMessage", { message: Input.Message })
export const GotTextareaMessage = taggedStruct("GotTextareaMessage", {
    message: Textarea.Message,
})
export const GotCheckboxMessage = taggedStruct("GotCheckboxMessage", {
    message: Checkbox.Message,
})
export const GotFieldsetMessage = taggedStruct("GotFieldsetMessage", {
    message: Fieldset.Message,
})
export const GotRadioGroupMessage = taggedStruct("GotRadioGroupMessage", {
    message: RadioGroup.Message,
})
export const GotSwitchMessage = taggedStruct("GotSwitchMessage", {
    message: Switch.Message,
})
export const GotSliderMessage = taggedStruct("GotSliderMessage", {
    message: Slider.Message,
})
export const GotSelectMessage = taggedStruct("GotSelectMessage", {
    message: Select.Message,
})
export const GotListboxMessage = taggedStruct("GotListboxMessage", {
    message: Listbox.Message,
})
export const GotComboboxMessage = taggedStruct("GotComboboxMessage", {
    message: Combobox.Message,
})
export const GotDialogMessage = taggedStruct("GotDialogMessage", {
    message: Dialog.Message,
})
export const GotMenuMessage = taggedStruct("GotMenuMessage", { message: Menu.Message })
export const GotPopoverMessage = taggedStruct("GotPopoverMessage", {
    message: Popover.Message,
})
export const GotTooltipMessage = taggedStruct("GotTooltipMessage", {
    message: Tooltip.Message,
})
export const GotToastMessage = taggedStruct("GotToastMessage", { message: Toast.Message })
export const GotDisclosureMessage = taggedStruct("GotDisclosureMessage", {
    message: Disclosure.Message,
})
export const GotTabsMessage = taggedStruct("GotTabsMessage", { message: Tabs.Message })
export const GotDragAndDropMessage = taggedStruct("GotDragAndDropMessage", {
    message: DragAndDrop.Message,
})
export const GotFileDropMessage = taggedStruct("GotFileDropMessage", {
    message: FileDrop.Message,
})
export const GotCalendarMessage = taggedStruct("GotCalendarMessage", {
    message: Calendar.Message,
})
export const GotDatePickerMessage = taggedStruct("GotDatePickerMessage", {
    message: DatePicker.Message,
})
export const GotTimePickerMessage = taggedStruct("GotTimePickerMessage", {
    message: TimePicker.Message,
})
export const GotAnimationMessage = taggedStruct("GotAnimationMessage", {
    message: Animation.Message,
})
export const GotVirtualListMessage = taggedStruct("GotVirtualListMessage", {
    message: VirtualList.Message,
})
export const Message = S.Union([
    GotSelectionSubmodelsMessage,
    GotButtonMessage,
    GotInputMessage,
    GotTextareaMessage,
    GotCheckboxMessage,
    GotFieldsetMessage,
    GotRadioGroupMessage,
    GotSwitchMessage,
    GotSliderMessage,
    GotSelectMessage,
    GotListboxMessage,
    GotComboboxMessage,
    GotDialogMessage,
    GotMenuMessage,
    GotPopoverMessage,
    GotTooltipMessage,
    GotToastMessage,
    GotDisclosureMessage,
    GotTabsMessage,
    GotDragAndDropMessage,
    GotFileDropMessage,
    GotCalendarMessage,
    GotDatePickerMessage,
    GotTimePickerMessage,
    GotAnimationMessage,
    GotVirtualListMessage,
])
export type Message = typeof Message.Type

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const path_for_route = (route: DesktopRoute): string =>
    route._tag === "Labs" && is_ui_path(route.labs_path)
        ? route.labs_path.replace(/\/$/, "")
        : ""

export const init = (route: DesktopRoute): UpdateReturn => {
    const selection_submodels = SelectionSubmodels.initialModel
    const button = Button.initialModel
    const [input, input_commands] = Input.init()
    const textarea = Textarea.initialModel
    const checkbox = Checkbox.initialModel
    const [fieldset, fieldset_commands] = Fieldset.init()
    const [radio_group, radio_group_commands] = RadioGroup.init()
    const switch_model = Switch.initialModel
    const { model: slider, commands: slider_commands } = Slider.init()
    const select = Select.initialModel
    const [listbox, listbox_commands] = Listbox.init()
    const [combobox, combobox_commands] = Combobox.init()
    const [dialog, dialog_commands] = Dialog.init()
    const [menu, menu_commands] = Menu.init()
    const [popover, popover_commands] = Popover.init()
    const [tooltip, tooltip_commands] = Tooltip.init()
    const [toast, toast_commands] = Toast.init()
    const [disclosure, disclosure_commands] = Disclosure.init()
    const [tabs, tabs_commands] = Tabs.init()
    const [drag_and_drop, drag_and_drop_commands] = DragAndDrop.init()
    const [file_drop, file_drop_commands] = FileDrop.init()
    const [calendar, calendar_commands] = Calendar.init()
    const [date_picker, date_picker_commands] = DatePicker.init()
    const [time_picker, time_picker_commands] = TimePicker.init()
    const [animation, animation_commands] = Animation.init()
    const [virtual_list, virtual_list_commands] = VirtualList.init()
    return [
        {
            path: path_for_route(route),
            selection_submodels,
            button,
            input,
            textarea,
            checkbox,
            fieldset,
            radio_group,
            switch: switch_model,
            slider,
            select,
            listbox,
            combobox,
            dialog,
            menu,
            popover,
            tooltip,
            toast,
            disclosure,
            tabs,
            drag_and_drop,
            file_drop,
            calendar,
            date_picker,
            time_picker,
            animation,
            virtual_list,
        },
        [
            ...Command.mapMessages(input_commands, (message) =>
                GotInputMessage({ message })
            ),
            ...Command.mapMessages(fieldset_commands, (message) =>
                GotFieldsetMessage({ message })
            ),
            ...Command.mapMessages(radio_group_commands, (message) =>
                GotRadioGroupMessage({ message })
            ),
            ...Command.mapMessages(slider_commands ?? [], (message) =>
                GotSliderMessage({ message })
            ),
            ...Command.mapMessages(listbox_commands, (message) =>
                GotListboxMessage({ message })
            ),
            ...Command.mapMessages(combobox_commands, (message) =>
                GotComboboxMessage({ message })
            ),
            ...Command.mapMessages(dialog_commands, (message) =>
                GotDialogMessage({ message })
            ),
            ...Command.mapMessages(menu_commands, (message) =>
                GotMenuMessage({ message })
            ),
            ...Command.mapMessages(popover_commands, (message) =>
                GotPopoverMessage({ message })
            ),
            ...Command.mapMessages(tooltip_commands, (message) =>
                GotTooltipMessage({ message })
            ),
            ...Command.mapMessages(toast_commands, (message) =>
                GotToastMessage({ message })
            ),
            ...Command.mapMessages(disclosure_commands, (message) =>
                GotDisclosureMessage({ message })
            ),
            ...Command.mapMessages(tabs_commands, (message) =>
                GotTabsMessage({ message })
            ),
            ...Command.mapMessages(drag_and_drop_commands, (message) =>
                GotDragAndDropMessage({ message })
            ),
            ...Command.mapMessages(file_drop_commands, (message) =>
                GotFileDropMessage({ message })
            ),
            ...Command.mapMessages(calendar_commands, (message) =>
                GotCalendarMessage({ message })
            ),
            ...Command.mapMessages(date_picker_commands, (message) =>
                GotDatePickerMessage({ message })
            ),
            ...Command.mapMessages(time_picker_commands, (message) =>
                GotTimePickerMessage({ message })
            ),
            ...Command.mapMessages(animation_commands, (message) =>
                GotAnimationMessage({ message })
            ),
            ...Command.mapMessages(virtual_list_commands, (message) =>
                GotVirtualListMessage({ message })
            ),
        ],
    ]
}

export const changed_route = (
    model: Model,
    route: DesktopRoute
): UpdateReturn =>
    model.path === path_for_route(route) ? [model, []] : init(route)

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotSelectionSubmodelsMessage: ({ message }) => {
                if (model.path !== "/labs/ui/selection-submodels")
                    return [model, []]
                const [selection_submodels, commands] =
                    SelectionSubmodels.update(
                        model.selection_submodels,
                        message
                    )
                return [
                    { ...model, selection_submodels },
                    Command.mapMessages(commands, (message) =>
                        GotSelectionSubmodelsMessage({ message })
                    ),
                ]
            },
            GotButtonMessage: ({ message }) => {
                if (model.path !== "/labs/ui/button") return [model, []]
                const [button, commands] = Button.update(model.button, message)
                return [
                    { ...model, button },
                    Command.mapMessages(commands, (message) =>
                        GotButtonMessage({ message })
                    ),
                ]
            },
            GotInputMessage: ({ message }) => {
                if (model.path !== "/labs/ui/input") return [model, []]
                const [input, commands] = Input.update(model.input, message)
                return [
                    { ...model, input },
                    Command.mapMessages(commands, (message) =>
                        GotInputMessage({ message })
                    ),
                ]
            },
            GotTextareaMessage: ({ message }) => {
                if (model.path !== "/labs/ui/textarea") return [model, []]
                const [textarea, commands] = Textarea.update(
                    model.textarea,
                    message
                )
                return [
                    { ...model, textarea },
                    Command.mapMessages(commands, (message) =>
                        GotTextareaMessage({ message })
                    ),
                ]
            },
            GotCheckboxMessage: ({ message }) => {
                if (model.path !== "/labs/ui/checkbox") return [model, []]
                const [checkbox, commands] = Checkbox.update(
                    model.checkbox,
                    message
                )
                return [
                    { ...model, checkbox },
                    Command.mapMessages(commands, (message) =>
                        GotCheckboxMessage({ message })
                    ),
                ]
            },
            GotFieldsetMessage: ({ message }) => {
                if (model.path !== "/labs/ui/fieldset") return [model, []]
                const [fieldset, commands] = Fieldset.update(
                    model.fieldset,
                    message
                )
                return [
                    { ...model, fieldset },
                    Command.mapMessages(commands, (message) =>
                        GotFieldsetMessage({ message })
                    ),
                ]
            },
            GotRadioGroupMessage: ({ message }) => {
                if (model.path !== "/labs/ui/radio-group") return [model, []]
                const [radio_group, commands] = RadioGroup.update(
                    model.radio_group,
                    message
                )
                return [
                    { ...model, radio_group },
                    Command.mapMessages(commands, (message) =>
                        GotRadioGroupMessage({ message })
                    ),
                ]
            },
            GotSwitchMessage: ({ message }) => {
                if (model.path !== "/labs/ui/switch") return [model, []]
                const [switch_model, commands] = Switch.update(
                    model.switch,
                    message
                )
                return [
                    { ...model, switch: switch_model },
                    Command.mapMessages(commands, (message) =>
                        GotSwitchMessage({ message })
                    ),
                ]
            },
            GotSliderMessage: ({ message }) => {
                if (model.path !== "/labs/ui/slider") return [model, []]
                const { model: slider, commands } = Slider.update(
                    model.slider,
                    message
                )
                return [
                    { ...model, slider },
                    Command.mapMessages(commands ?? [], (message) =>
                        GotSliderMessage({ message })
                    ),
                ]
            },
            GotSelectMessage: ({ message }) => {
                if (model.path !== "/labs/ui/select") return [model, []]
                const [select, commands] = Select.update(model.select, message)
                return [
                    { ...model, select },
                    Command.mapMessages(commands, (message) =>
                        GotSelectMessage({ message })
                    ),
                ]
            },
            GotListboxMessage: ({ message }) => {
                if (model.path !== "/labs/ui/listbox") return [model, []]
                const [listbox, commands] = Listbox.update(
                    model.listbox,
                    message
                )
                return [
                    { ...model, listbox },
                    Command.mapMessages(commands, (message) =>
                        GotListboxMessage({ message })
                    ),
                ]
            },
            GotComboboxMessage: ({ message }) => {
                if (model.path !== "/labs/ui/combobox") return [model, []]
                const [combobox, commands] = Combobox.update(
                    model.combobox,
                    message
                )
                return [
                    { ...model, combobox },
                    Command.mapMessages(commands, (message) =>
                        GotComboboxMessage({ message })
                    ),
                ]
            },
            GotDialogMessage: ({ message }) => {
                if (model.path !== "/labs/ui/dialog") return [model, []]
                const [dialog, commands] = Dialog.update(model.dialog, message)
                return [
                    { ...model, dialog },
                    Command.mapMessages(commands, (message) =>
                        GotDialogMessage({ message })
                    ),
                ]
            },
            GotMenuMessage: ({ message }) => {
                if (model.path !== "/labs/ui/menu") return [model, []]
                const [menu, commands] = Menu.update(model.menu, message)
                return [
                    { ...model, menu },
                    Command.mapMessages(commands, (message) =>
                        GotMenuMessage({ message })
                    ),
                ]
            },
            GotPopoverMessage: ({ message }) => {
                if (model.path !== "/labs/ui/popover") return [model, []]
                const [popover, commands] = Popover.update(
                    model.popover,
                    message
                )
                return [
                    { ...model, popover },
                    Command.mapMessages(commands, (message) =>
                        GotPopoverMessage({ message })
                    ),
                ]
            },
            GotTooltipMessage: ({ message }) => {
                if (model.path !== "/labs/ui/tooltip") return [model, []]
                const [tooltip, commands] = Tooltip.update(
                    model.tooltip,
                    message
                )
                return [
                    { ...model, tooltip },
                    Command.mapMessages(commands, (message) =>
                        GotTooltipMessage({ message })
                    ),
                ]
            },
            GotToastMessage: ({ message }) => {
                if (model.path !== "/labs/ui/toast") return [model, []]
                const [toast, commands] = Toast.update(model.toast, message)
                return [
                    { ...model, toast },
                    Command.mapMessages(commands, (message) =>
                        GotToastMessage({ message })
                    ),
                ]
            },
            GotDisclosureMessage: ({ message }) => {
                if (model.path !== "/labs/ui/disclosure") return [model, []]
                const [disclosure, commands] = Disclosure.update(
                    model.disclosure,
                    message
                )
                return [
                    { ...model, disclosure },
                    Command.mapMessages(commands, (message) =>
                        GotDisclosureMessage({ message })
                    ),
                ]
            },
            GotTabsMessage: ({ message }) => {
                if (model.path !== "/labs/ui/tabs") return [model, []]
                const [tabs, commands] = Tabs.update(model.tabs, message)
                return [
                    { ...model, tabs },
                    Command.mapMessages(commands, (message) =>
                        GotTabsMessage({ message })
                    ),
                ]
            },
            GotDragAndDropMessage: ({ message }) => {
                if (model.path !== "/labs/ui/drag-and-drop") return [model, []]
                const [drag_and_drop, commands] = DragAndDrop.update(
                    model.drag_and_drop,
                    message
                )
                return [
                    { ...model, drag_and_drop },
                    Command.mapMessages(commands, (message) =>
                        GotDragAndDropMessage({ message })
                    ),
                ]
            },
            GotFileDropMessage: ({ message }) => {
                if (model.path !== "/labs/ui/file-drop") return [model, []]
                const [file_drop, commands] = FileDrop.update(
                    model.file_drop,
                    message
                )
                return [
                    { ...model, file_drop },
                    Command.mapMessages(commands, (message) =>
                        GotFileDropMessage({ message })
                    ),
                ]
            },
            GotCalendarMessage: ({ message }) => {
                if (model.path !== "/labs/ui/calendar") return [model, []]
                const [calendar, commands] = Calendar.update(
                    model.calendar,
                    message
                )
                return [
                    { ...model, calendar },
                    Command.mapMessages(commands, (message) =>
                        GotCalendarMessage({ message })
                    ),
                ]
            },
            GotDatePickerMessage: ({ message }) => {
                if (model.path !== "/labs/ui/date-picker") return [model, []]
                const [date_picker, commands] = DatePicker.update(
                    model.date_picker,
                    message
                )
                return [
                    { ...model, date_picker },
                    Command.mapMessages(commands, (message) =>
                        GotDatePickerMessage({ message })
                    ),
                ]
            },
            GotTimePickerMessage: ({ message }) => {
                if (model.path !== "/labs/ui/time-picker") return [model, []]
                const [time_picker, commands] = TimePicker.update(
                    model.time_picker,
                    message
                )
                return [
                    { ...model, time_picker },
                    Command.mapMessages(commands, (message) =>
                        GotTimePickerMessage({ message })
                    ),
                ]
            },
            GotAnimationMessage: ({ message }) => {
                if (model.path !== "/labs/ui/animation") return [model, []]
                const [animation, commands] = Animation.update(
                    model.animation,
                    message
                )
                return [
                    { ...model, animation },
                    Command.mapMessages(commands, (message) =>
                        GotAnimationMessage({ message })
                    ),
                ]
            },
            GotVirtualListMessage: ({ message }) => {
                if (model.path !== "/labs/ui/virtual-list") return [model, []]
                const [virtual_list, commands] = VirtualList.update(
                    model.virtual_list,
                    message
                )
                return [
                    { ...model, virtual_list },
                    Command.mapMessages(commands, (message) =>
                        GotVirtualListMessage({ message })
                    ),
                ]
            },
        })
    )

const content_view = (model: Model, h: HtmlBuilder<Message>): Html => {
    switch (model.path) {
        case "/labs/ui/data-table":
            return DataTable.view()
        case "/labs/ui/file-tree":
            return FileTree.view()
        case "/labs/ui/selection-submodels":
            return SelectionSubmodels.view(
                model.selection_submodels.listbox,
                model.selection_submodels.maybeSelectedPlan,
                (message) => GotSelectionSubmodelsMessage({ message }),
                h
            )
        case "/labs/ui/button":
            return Button.view(
                model.button,
                (message) => GotButtonMessage({ message }),
                h
            )
        case "/labs/ui/input":
            return Input.view(
                model.input,
                (message) => GotInputMessage({ message }),
                h
            )
        case "/labs/ui/textarea":
            return Textarea.view(
                model.textarea,
                (message) => GotTextareaMessage({ message }),
                h
            )
        case "/labs/ui/checkbox":
            return Checkbox.view(
                model.checkbox,
                (message) => GotCheckboxMessage({ message }),
                h
            )
        case "/labs/ui/fieldset":
            return Fieldset.view(
                model.fieldset,
                (message) => GotFieldsetMessage({ message }),
                h
            )
        case "/labs/ui/radio-group":
            return RadioGroup.view(
                model.radio_group.horizontal,
                model.radio_group.vertical,
                (message) => GotRadioGroupMessage({ message }),
                h
            )
        case "/labs/ui/switch":
            return Switch.view(
                model.switch,
                (message) => GotSwitchMessage({ message }),
                h
            )
        case "/labs/ui/slider":
            return Slider.view(
                model.slider,
                (message) => GotSliderMessage({ message }),
                h
            )
        case "/labs/ui/select":
            return Select.view(
                model.select,
                (message) => GotSelectMessage({ message }),
                h
            )
        case "/labs/ui/listbox":
            return Listbox.view(
                model.listbox,
                (message) => GotListboxMessage({ message }),
                h
            )
        case "/labs/ui/combobox":
            return Combobox.view(
                model.combobox,
                (message) => GotComboboxMessage({ message }),
                h
            )
        case "/labs/ui/dialog":
            return Dialog.view(
                model.dialog,
                (message) => GotDialogMessage({ message }),
                h
            )
        case "/labs/ui/menu":
            return Menu.view(
                model.menu,
                (message) => GotMenuMessage({ message }),
                h
            )
        case "/labs/ui/popover":
            return Popover.view(
                model.popover.basic,
                model.popover.animated,
                (message) =>
                    GotPopoverMessage({
                        message: Popover.GotBasicMessage({ message }),
                    }),
                (message) =>
                    GotPopoverMessage({
                        message: Popover.GotAnimatedMessage({ message }),
                    }),
                h
            )
        case "/labs/ui/tooltip":
            return Tooltip.view(
                model.tooltip.basic,
                model.tooltip.noDelay,
                (message) =>
                    GotTooltipMessage({
                        message: Tooltip.GotBasicMessage({ message }),
                    }),
                (message) =>
                    GotTooltipMessage({
                        message: Tooltip.GotNoDelayMessage({ message }),
                    }),
                h
            )
        case "/labs/ui/toast":
            return Toast.view(
                model.toast,
                (message) => GotToastMessage({ message }),
                h
            )
        case "/labs/ui/disclosure":
            return Disclosure.view(
                model.disclosure,
                (message) => GotDisclosureMessage({ message }),
                h
            )
        case "/labs/ui/tabs":
            return Tabs.view(
                model.tabs.horizontalTabs,
                model.tabs.horizontalValue,
                model.tabs.verticalTabs,
                model.tabs.verticalValue,
                (message) =>
                    GotTabsMessage({
                        message: Tabs.GotHorizontalTabsMessage({ message }),
                    }),
                (message) =>
                    GotTabsMessage({
                        message: Tabs.GotVerticalTabsMessage({ message }),
                    }),
                h
            )
        case "/labs/ui/drag-and-drop":
            return DragAndDrop.view(
                model.drag_and_drop,
                (message) => GotDragAndDropMessage({ message }),
                h
            )
        case "/labs/ui/file-drop":
            return FileDrop.view(
                model.file_drop,
                (message) => GotFileDropMessage({ message }),
                h
            )
        case "/labs/ui/calendar":
            return Calendar.view(
                model.calendar,
                (message) => GotCalendarMessage({ message }),
                h
            )
        case "/labs/ui/date-picker":
            return DatePicker.view(
                model.date_picker,
                (message) => GotDatePickerMessage({ message }),
                h
            )
        case "/labs/ui/time-picker":
            return TimePicker.view(
                model.time_picker,
                (message) => GotTimePickerMessage({ message }),
                h
            )
        case "/labs/ui/animation":
            return Animation.view(
                model.animation.animation,
                model.animation.isShowing,
                () =>
                    GotAnimationMessage({
                        message: Animation.ToggledAnimationDemo(),
                    }),
                (message) =>
                    GotAnimationMessage({
                        message: Animation.GotAnimationDemoMessage({ message }),
                    }),
                h
            )
        case "/labs/ui/virtual-list":
            return VirtualList.view(
                model.virtual_list.fixed,
                model.virtual_list.variable,
                (message) =>
                    GotVirtualListMessage({
                        message: VirtualList.GotFixedMessage({ message }),
                    }),
                (message) =>
                    GotVirtualListMessage({
                        message: VirtualList.GotVariableMessage({ message }),
                    }),
                (message) => GotVirtualListMessage({ message }),
                h
            )
        case "/labs/ui/callout":
            return h.div(
                [],
                [
                    Callout({ children: ["Context for the current task."] }),
                    Callout({
                        tone: "Tip",
                        title: "Use rich content",
                        children: [
                            h.p(
                                [],
                                ["Pass ordinary Foldkit views as children."]
                            ),
                            h.a(
                                [
                                    h.Href(demo_href("steps")),
                                    h.Class("underline"),
                                ],
                                ["View Steps"]
                            ),
                        ],
                    }),
                    Callout({
                        tone: "Warning",
                        children: ["Review your changes before continuing."],
                    }),
                    Callout({
                        tone: "Danger",
                        children: ["This action cannot be undone."],
                    }),
                ]
            )
        case "/labs/ui/steps":
            return Steps({
                items: [
                    [
                        h.h3(
                            [h.Class("font-semibold")],
                            ["Choose a component"]
                        ),
                        h.p([], ["Import a shared Foldkit view helper."]),
                    ],
                    [
                        h.h3(
                            [h.Class("font-semibold")],
                            ["Compose its content"]
                        ),
                        Callout({
                            tone: "Tip",
                            children: [
                                "Steps accept rich views, including callouts.",
                            ],
                        }),
                    ],
                    [
                        h.h3([h.Class("font-semibold")], ["Review the result"]),
                        h.a(
                            [
                                h.Href(demo_href("callout")),
                                h.Class("underline"),
                            ],
                            ["View Callout"]
                        ),
                    ],
                ],
            })
        case "/labs/ui/nav/graph":
            return graph_view(h)
        case "/labs/ui/nav":
            return nav_view(h)
        case "/labs/ui/hover-intent":
            return h.p(
                [],
                [
                    "Hover Intent has no demo in packages/features/src/labs or API in the pinned UI source.",
                ]
            )
        case "/labs/ui/anchor":
            return h.p(
                [],
                [
                    "Anchor has no standalone lab in packages/features/src/labs. Anchored positioning is demonstrated in Popover, Menu, and Tooltip.",
                ]
            )
        case "/labs/ui":
            return h.div(
                [h.Class("grid gap-3 sm:grid-cols-2 lg:grid-cols-3")],
                demos.map((demo) =>
                    h.a(
                        [
                            h.Href(demo_href(demo.slug)),
                            h.Class(
                                "rounded border border-border p-4 hover:bg-accent"
                            ),
                        ],
                        [demo.label]
                    )
                )
            )
        default:
            return h.p([], ["UI lab not found."])
    }
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.section(
        [h.Class("mx-auto w-full max-w-6xl space-y-6 px-6 py-8")],
        [
            h.a(
                [
                    h.Href(index_href()),
                    h.Class("text-sm text-muted-foreground hover:underline"),
                ],
                ["UI Labs"]
            ),
            h.h1(
                [h.Class("text-2xl font-semibold")],
                [
                    demos.find((demo) => model.path === `/labs/ui/${demo.slug}`)
                        ?.label ?? "UI Labs",
                ]
            ),
            h.keyed("div")(model.path, [], [content_view(model, h)]),
        ]
    )
)

export const subscriptions = Subscription.aggregate<Model, Message>()(
    Subscription.lift(DragAndDrop.subscriptions)<Model, Message>({
        when: (model) => model.path === "/labs/ui/drag-and-drop",
        read: (model) => Option.some(model.drag_and_drop),
        toParentMessage: (message) => GotDragAndDropMessage({ message }),
    }),
    Subscription.lift(Slider.subscriptions)<Model, Message>({
        when: (model) => model.path === "/labs/ui/slider",
        read: (model) => Option.some(model.slider),
        toParentMessage: (message) => GotSliderMessage({ message }),
    })
)

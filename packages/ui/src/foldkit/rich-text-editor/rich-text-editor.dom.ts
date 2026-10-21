import {
    UpdatedRichTextEditorSelection,
    type RichTextSelection,
} from "./rich-text-editor.schema.ts"

const textLengthBeforeChildOffset = (
    element: Element,
    childOffset: number
): number =>
    Array.from(element.childNodes)
        .slice(0, childOffset)
        .reduce((length, child) => length + (child.textContent?.length ?? 0), 0)

const isPlaceholderTextElement = (element: HTMLElement): boolean =>
    element.dataset.rtePlaceholder === "true"

const textOffsetWithin = (
    target: Node,
    targetOffset: number,
    textLength: number
): number => {
    const element =
        target.nodeType === Node.ELEMENT_NODE
            ? (target as Element)
            : target.parentElement
    const textElement = element?.closest(
        "[data-rte-start][data-rte-end]"
    ) as HTMLElement | null
    if (textElement) {
        const start = Number(textElement.dataset.rteStart ?? 0)
        if (isPlaceholderTextElement(textElement)) return start
        const localOffset =
            target.nodeType === Node.ELEMENT_NODE
                ? textLengthBeforeChildOffset(target as Element, targetOffset)
                : targetOffset
        return Math.max(0, Math.min(start + localOffset, textLength))
    }

    if (target.nodeType === Node.ELEMENT_NODE) {
        const endpointElement = target as Element
        const child = endpointElement.childNodes.item(targetOffset)
        const nextTextElement = (
            child?.nodeType === Node.ELEMENT_NODE
                ? (child as Element)
                : child?.parentElement
        )?.querySelector?.(
            "[data-rte-start][data-rte-end]"
        ) as HTMLElement | null
        if (nextTextElement)
            return Number(nextTextElement.dataset.rteStart ?? 0)

        const previousTextElement = Array.from(
            endpointElement.querySelectorAll<HTMLElement>(
                "[data-rte-start][data-rte-end]"
            )
        ).at(-1)
        if (previousTextElement)
            return Number(previousTextElement.dataset.rteEnd ?? textLength)
    }

    return textLength
}

const collapsedSelectionMessage = (
    offset: number
): typeof UpdatedRichTextEditorSelection.Type =>
    UpdatedRichTextEditorSelection({ start: offset, end: offset })

export const richTextSelectionMessageFromDom = (
    textLength: number
): typeof UpdatedRichTextEditorSelection.Type => {
    if (
        typeof window === "undefined" ||
        typeof window.getSelection !== "function"
    ) {
        return collapsedSelectionMessage(textLength)
    }
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0)
        return collapsedSelectionMessage(textLength)

    const range = selection.getRangeAt(0)
    const root = (
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
            ? (range.commonAncestorContainer as Element)
            : range.commonAncestorContainer.parentElement
    )?.closest('[contenteditable="true"]')
    if (!root) return collapsedSelectionMessage(textLength)

    return UpdatedRichTextEditorSelection({
        start: textOffsetWithin(
            selection.anchorNode ?? range.startContainer,
            selection.anchorOffset,
            textLength
        ),
        end: textOffsetWithin(
            selection.focusNode ?? range.endContainer,
            selection.focusOffset,
            textLength
        ),
    })
}

export const selectRichTextEditorDomAll = (id: string): void => {
    if (
        typeof document === "undefined" ||
        typeof window === "undefined" ||
        typeof window.getSelection !== "function"
    )
        return
    const root = document.getElementById(id)
    if (!root) return

    const range = document.createRange()
    range.selectNodeContents(root)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    root.focus()
}

const textNodeForOffset = (
    root: Element,
    offset: number
): { node: Text; offset: number } | undefined => {
    const elements = Array.from(
        root.querySelectorAll<HTMLElement>("[data-rte-start][data-rte-end]")
    )
    const element =
        elements.find((candidate) => {
            const start = Number(candidate.dataset.rteStart ?? 0)
            const end = Number(candidate.dataset.rteEnd ?? start)
            return offset >= start && offset < end
        }) ??
        elements.find(
            (candidate) => Number(candidate.dataset.rteStart ?? 0) === offset
        ) ??
        elements.at(-1)
    if (!element) return undefined

    const start = Number(element.dataset.rteStart ?? 0)
    const textNode = Array.from(element.childNodes).find(
        (node): node is Text => node.nodeType === Node.TEXT_NODE
    )
    if (!textNode) return undefined

    const textLength = textNode.textContent?.length ?? 0
    return {
        node: textNode,
        offset: isPlaceholderTextElement(element)
            ? 0
            : Math.max(0, Math.min(offset - start, textLength)),
    }
}

export const restoreRichTextDomSelection = (
    element: Element,
    selection: RichTextSelection,
    should_focus = true
): void => {
    const root = element.closest('[contenteditable="true"]') ?? element
    const anchor = textNodeForOffset(root, selection.anchor)
    const focus = textNodeForOffset(root, selection.focus)
    if (!anchor || !focus) return

    const windowSelection = window.getSelection()
    windowSelection?.removeAllRanges()
    if (typeof windowSelection?.setBaseAndExtent === "function") {
        windowSelection.setBaseAndExtent(
            anchor.node,
            anchor.offset,
            focus.node,
            focus.offset
        )
    } else {
        const range = document.createRange()
        const start = selection.anchor <= selection.focus ? anchor : focus
        const end = selection.anchor <= selection.focus ? focus : anchor
        range.setStart(start.node, start.offset)
        range.setEnd(end.node, end.offset)
        windowSelection?.addRange(range)
    }
    if (should_focus && root instanceof HTMLElement) root.focus()
}

export const positionRichTextSlashMenu = (
    element: HTMLElement,
    selection: RichTextSelection
): void => {
    const container =
        element.offsetParent instanceof HTMLElement
            ? element.offsetParent
            : element.parentElement
    const root = container?.querySelector('[contenteditable="true"]')
    if (!container || !root) return

    const caret = textNodeForOffset(root, selection.focus)
    if (!caret) return

    const range = document.createRange()
    range.setStart(caret.node, caret.offset)
    range.setEnd(caret.node, caret.offset)
    const caretRect = range.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const rootRect = root.getBoundingClientRect()
    const styles = getComputedStyle(element)
    const offset = Number.parseFloat(styles.getPropertyValue("--space-2")) || 6
    const padding = 8
    const viewport = window.visualViewport
    const viewport_left = viewport?.offsetLeft ?? 0
    const viewport_top = viewport?.offsetTop ?? 0
    const viewport_right =
        viewport_left + (viewport?.width ?? window.innerWidth)
    const viewport_bottom =
        viewport_top + (viewport?.height ?? window.innerHeight)
    const container_left = containerRect.left + container.clientLeft
    const container_top = containerRect.top + container.clientTop
    const leading_edge = Math.max(container_left, viewport_left) + padding
    const trailing_edge =
        Math.min(container_left + container.clientWidth, viewport_right) -
        padding
    const upper_edge = Math.max(container_top, viewport_top) + padding
    const lower_edge =
        Math.min(container_top + container.clientHeight, viewport_bottom) -
        padding
    const has_caret_rect = caretRect.width !== 0 || caretRect.height !== 0
    const caret_left = has_caret_rect ? caretRect.left : rootRect.left
    const caret_right = has_caret_rect ? caretRect.right : rootRect.right
    const caret_top = has_caret_rect ? caretRect.top : rootRect.top
    const caret_bottom = has_caret_rect ? caretRect.bottom : rootRect.top

    element.style.maxWidth = `${Math.max(0, trailing_edge - leading_edge)}px`
    element.style.maxHeight = ""
    const menu_rect = element.getBoundingClientRect()
    const space_below = Math.max(0, lower_edge - caret_bottom - offset)
    const space_above = Math.max(0, caret_top - offset - upper_edge)
    const place_above =
        menu_rect.height > space_below && space_above > space_below
    const available_height = place_above ? space_above : space_below
    const menu_height = Math.min(menu_rect.height, available_height)
    const preferred_left =
        getComputedStyle(root).direction === "rtl"
            ? caret_right - menu_rect.width
            : caret_left
    const left = Math.max(
        leading_edge,
        Math.min(preferred_left, trailing_edge - menu_rect.width)
    )
    const top = Math.max(
        upper_edge,
        Math.min(
            place_above
                ? caret_top - offset - menu_height
                : caret_bottom + offset,
            lower_edge - menu_height
        )
    )

    element.style.maxHeight = `${available_height}px`
    element.style.left = `${left - container_left + container.scrollLeft}px`
    element.style.top = `${top - container_top + container.scrollTop}px`
}

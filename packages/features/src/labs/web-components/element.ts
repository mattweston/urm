// A plain web component, written without Foldkit. It is here so the page can
// demonstrate the interop without adding a third-party element library: the
// upstream Foldkit example binds Shoelace and vanilla-colorful instead.
//
// The contract is the one any custom element offers: properties written by the
// host, and CustomEvents dispatched back out.
const ELEMENT_TAG = "urm-rating-stars"

const STAR_PATH =
    "M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"

class RatingStarsElement extends HTMLElement {
    #value = 0
    #max = 5
    // Resolves against inherited text colour until the host writes a value.
    #accent = "currentColor"

    static get observedAttributes(): ReadonlyArray<string> {
        return []
    }

    get value(): number {
        return this.#value
    }

    set value(next: number) {
        this.#value = next
        this.#render()
    }

    get max(): number {
        return this.#max
    }

    set max(next: number) {
        this.#max = next
        this.#render()
    }

    get accent(): string {
        return this.#accent
    }

    set accent(next: string) {
        this.#accent = next
        this.#render()
    }

    connectedCallback(): void {
        this.#render()
    }

    #emit(rating: number): void {
        this.dispatchEvent(
            new CustomEvent("rating-changed", {
                detail: { rating },
                bubbles: true,
                composed: true,
            })
        )
    }

    #render(): void {
        this.replaceChildren()

        const row = document.createElement("div")
        row.style.display = "flex"
        row.style.gap = "0.25rem"

        for (let index = 1; index <= this.#max; index += 1) {
            const isFilled = index <= this.#value
            const button = document.createElement("button")
            button.type = "button"
            button.setAttribute("aria-label", `Rate ${index}`)
            button.style.background = "none"
            button.style.border = "none"
            button.style.padding = "0"
            button.style.cursor = "pointer"
            button.style.lineHeight = "0"
            button.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" fill="${
                isFilled ? this.#accent : "transparent"
            }" stroke="${this.#accent}" stroke-width="1.5"><path d="${STAR_PATH}"/></svg>`
            button.addEventListener("click", () => this.#emit(index))
            row.appendChild(button)
        }

        this.appendChild(row)
    }
}

// Registration is global and one-shot, so it is guarded for the prerender pass
// and for a module reload during development.
if (
    typeof customElements !== "undefined" &&
    customElements.get(ELEMENT_TAG) === undefined
) {
    customElements.define(ELEMENT_TAG, RatingStarsElement)
}

export { ELEMENT_TAG }

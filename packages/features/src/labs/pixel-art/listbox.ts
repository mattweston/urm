import { Listbox } from "@foldkit/ui"

// Neutral module: the update function folds the listbox and the toolbar view
// renders it, and neither should have to import the other.
export const ThemeListbox = Listbox.create<string>()

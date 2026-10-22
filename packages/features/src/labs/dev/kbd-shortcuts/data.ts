import { Option } from "effect"

export type AppId = "chrome" | "zed" | "bash" | "vim"

export type ShortcutApp = Readonly<{
    id: AppId
    label: string
}>

export type Shortcut = Readonly<{
    keys: ReadonlyArray<string>
    commands: Readonly<Record<AppId, Option.Option<string>>>
}>

export const shortcutApps: ReadonlyArray<ShortcutApp> = [
    { id: "chrome", label: "Chrome" },
    { id: "zed", label: "Zed" },
    { id: "bash", label: "Bash" },
    { id: "vim", label: "Vim" },
]

const cmd = (description: string): Option.Option<string> =>
    Option.some(description)

// Every app has holes in its keymap, and an empty cell is part of the
// comparison — the filter has to skip it rather than treat it as a match.
const unbound: Option.Option<string> = Option.none()

export const shortcuts: ReadonlyArray<Shortcut> = [
    {
        keys: ["Ctrl", "A"],
        commands: {
            chrome: cmd("Select everything on the page"),
            zed: cmd("Select all"),
            bash: cmd("Move to the start of the line"),
            vim: cmd("Increment the number under the cursor"),
        },
    },
    {
        keys: ["Ctrl", "B"],
        commands: {
            chrome: unbound,
            zed: cmd("Toggle the project panel"),
            bash: cmd("Move back one character"),
            vim: cmd("Scroll back one full page"),
        },
    },
    {
        keys: ["Ctrl", "C"],
        commands: {
            chrome: cmd("Copy the selection"),
            zed: cmd("Copy the selection"),
            bash: cmd("Interrupt the running process"),
            vim: cmd("Return to normal mode"),
        },
    },
    {
        keys: ["Ctrl", "D"],
        commands: {
            chrome: cmd("Bookmark the current tab"),
            zed: cmd("Select the next occurrence"),
            bash: cmd("Delete the character ahead, or exit on an empty line"),
            vim: cmd("Scroll down half a page"),
        },
    },
    {
        keys: ["Ctrl", "E"],
        commands: {
            chrome: cmd("Search from the address bar"),
            zed: unbound,
            bash: cmd("Move to the end of the line"),
            vim: cmd("Scroll down one line"),
        },
    },
    {
        keys: ["Ctrl", "F"],
        commands: {
            chrome: cmd("Find in page"),
            zed: cmd("Find in the open buffer"),
            bash: cmd("Move forward one character"),
            vim: cmd("Scroll forward one full page"),
        },
    },
    {
        keys: ["Ctrl", "G"],
        commands: {
            chrome: cmd("Jump to the next find match"),
            zed: cmd("Go to line"),
            bash: cmd("Abort the current edit"),
            vim: cmd("Show the file name and cursor position"),
        },
    },
    {
        keys: ["Ctrl", "H"],
        commands: {
            chrome: cmd("Open browsing history"),
            zed: cmd("Find and replace in the open buffer"),
            bash: cmd("Delete the character before the cursor"),
            vim: cmd("Move left one character"),
        },
    },
    {
        keys: ["Ctrl", "J"],
        commands: {
            chrome: cmd("Open downloads"),
            zed: unbound,
            bash: cmd("Accept the current line"),
            vim: cmd("Move down one line"),
        },
    },
    {
        keys: ["Ctrl", "K"],
        commands: {
            chrome: cmd("Search from the address bar"),
            zed: cmd("Start an editor key chord"),
            bash: cmd("Cut from the cursor to the end of the line"),
            vim: cmd("Insert a digraph"),
        },
    },
    {
        keys: ["Ctrl", "L"],
        commands: {
            chrome: cmd("Focus the address bar"),
            zed: cmd("Select the current line"),
            bash: cmd("Clear the screen"),
            vim: cmd("Redraw the screen"),
        },
    },
    {
        keys: ["Ctrl", "N"],
        commands: {
            chrome: cmd("Open a new window"),
            zed: cmd("Open a new file"),
            bash: cmd("Recall the next command in history"),
            vim: cmd("Jump to the next completion match"),
        },
    },
    {
        keys: ["Ctrl", "O"],
        commands: {
            chrome: cmd("Open a file in the browser"),
            zed: cmd("Open a folder"),
            bash: cmd("Run the line and fetch the next one from history"),
            vim: cmd("Jump to the previous position"),
        },
    },
    {
        keys: ["Ctrl", "P"],
        commands: {
            chrome: cmd("Print the page"),
            zed: cmd("Open the file finder"),
            bash: cmd("Recall the previous command in history"),
            vim: cmd("Jump to the previous completion match"),
        },
    },
    {
        keys: ["Ctrl", "Q"],
        commands: {
            chrome: cmd("Quit the browser"),
            zed: cmd("Quit the editor"),
            bash: cmd("Resume terminal output"),
            vim: unbound,
        },
    },
    {
        keys: ["Ctrl", "R"],
        commands: {
            chrome: cmd("Reload the page"),
            zed: cmd("Rerun the last task"),
            bash: cmd("Search history backwards"),
            vim: cmd("Redo the last undo"),
        },
    },
    {
        keys: ["Ctrl", "S"],
        commands: {
            chrome: cmd("Save the page"),
            zed: cmd("Save the file"),
            bash: cmd("Pause terminal output"),
            vim: unbound,
        },
    },
    {
        keys: ["Ctrl", "T"],
        commands: {
            chrome: cmd("Open a new tab"),
            zed: cmd("Search project symbols"),
            bash: cmd("Transpose the last two characters"),
            vim: cmd("Jump back up the tag stack"),
        },
    },
    {
        keys: ["Ctrl", "U"],
        commands: {
            chrome: cmd("View the page source"),
            zed: unbound,
            bash: cmd("Cut from the cursor to the start of the line"),
            vim: cmd("Scroll up half a page"),
        },
    },
    {
        keys: ["Ctrl", "V"],
        commands: {
            chrome: cmd("Paste the clipboard"),
            zed: cmd("Paste the clipboard"),
            bash: cmd("Insert the next keystroke literally"),
            vim: cmd("Start blockwise visual mode"),
        },
    },
    {
        keys: ["Ctrl", "W"],
        commands: {
            chrome: cmd("Close the current tab"),
            zed: cmd("Close the active tab"),
            bash: cmd("Delete the word before the cursor"),
            vim: cmd("Start a window command"),
        },
    },
    {
        keys: ["Ctrl", "X"],
        commands: {
            chrome: cmd("Cut the selection"),
            zed: cmd("Cut the selection"),
            bash: cmd("Start a readline command chord"),
            vim: cmd("Decrement the number under the cursor"),
        },
    },
    {
        keys: ["Ctrl", "Y"],
        commands: {
            chrome: unbound,
            zed: unbound,
            bash: cmd("Paste the last cut text"),
            vim: cmd("Scroll up one line"),
        },
    },
    {
        keys: ["Ctrl", "Z"],
        commands: {
            chrome: cmd("Undo the last edit"),
            zed: cmd("Undo the last edit"),
            bash: cmd("Suspend the running process"),
            vim: cmd("Suspend the editor"),
        },
    },
    {
        keys: ["Ctrl", "/"],
        commands: {
            chrome: unbound,
            zed: cmd("Toggle a line comment"),
            bash: cmd("Undo the last edit"),
            vim: unbound,
        },
    },
    {
        keys: ["Ctrl", "Shift", "P"],
        commands: {
            chrome: unbound,
            zed: cmd("Open the command palette"),
            bash: unbound,
            vim: unbound,
        },
    },
    {
        keys: ["Ctrl", "Shift", "F"],
        commands: {
            chrome: unbound,
            zed: cmd("Search across the whole project"),
            bash: unbound,
            vim: unbound,
        },
    },
    {
        keys: ["Ctrl", "Shift", "T"],
        commands: {
            chrome: cmd("Reopen the last closed tab"),
            zed: cmd("Reopen the last closed tab"),
            bash: unbound,
            vim: unbound,
        },
    },
    {
        keys: ["Ctrl", "Shift", "Z"],
        commands: {
            chrome: cmd("Redo the last undo"),
            zed: cmd("Redo the last undo"),
            bash: unbound,
            vim: unbound,
        },
    },
]

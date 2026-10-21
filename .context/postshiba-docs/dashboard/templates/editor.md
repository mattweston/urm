# Template editor

> Edit HTML, text, and global CSS with a live preview.

The template editor is where you write a template, preview it with sample data, send yourself a test, and publish. Open it from **Controls** → **Templates** by selecting a template.

## Editor layout

| Area | What it holds |
| --- | --- |
| Header | The template name, a **Draft** or **Published** badge, **Publish**, and **More** (**Duplicate**, **Remove**). |
| Alias pill | The alias. Select it to copy. |
| From pill | Opens a dialog for **Name**, **Alias**, **From**, and **Reply-To**. |
| Subject | The line above the tabs. Liquid works here. |
| Tabs | **HTML**, **Text**, **CSS**, and **Variables**. |
| Preview | The right-hand pane. It renders the current form with **Variables**. |
| Footer | **Save**, the test recipient menu, and **Send test**. |

## Edit each tab

| Tab | What it edits |
| --- | --- |
| HTML | The HTML body, in Liquid. |
| Text | The plain-text part. Fill in both HTML and text to send multipart mail. |
| CSS | [Global CSS](/docs/dashboard/templates/css). PostShiba injects it into the HTML, then inlines it. |
| Variables | A JSON object for the preview and the dashboard test send. |

Subject, HTML, Text, and CSS all take [Liquid](/docs/dashboard/templates/liquid). From and Reply-To do not.

The preview never sends mail. Select **Save** to keep your changes to the draft. Invalid Liquid or invalid **Variables** JSON blocks the save and shows the error.

## Send a test

1. Select **Save**. The test uses the last saved draft, not unsaved edits.
2. Pick a teammate in the recipient menu.
3. Select **Send test**.

The notice reads `Test queued as <message-id>`. The test goes out on your first sending-ready cluster. More on [Send test emails](/docs/dashboard/emails/send-test-emails).

## Publish

**Publish** appears while the saved draft differs from the published version, or before the first publish. It copies the saved draft (From, Reply-To, Subject, HTML, Text, and CSS) into the published version. REST sends keep that version until you publish again. Save before you publish, because unsaved edits are not included.

## Next steps

- [Liquid](/docs/dashboard/templates/liquid)
- [Global CSS](/docs/dashboard/templates/css)
- [Send with a template](/docs/dashboard/templates/send-with-a-template)

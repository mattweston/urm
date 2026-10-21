# Global CSS

> Write CSS once. PostShiba injects it and inlines it for the inbox.

Each template has a **CSS** tab. That CSS styles the whole email, so you do not need a `<style>` tag in the HTML.

## How PostShiba applies it

At preview and send time, PostShiba does three things.

1. Renders any Liquid in the CSS, so `a { color: {{ brand_color }} }` works.
2. Injects the result into `<head>` as `<style type="text/css">`. If the HTML has no `<head>`, PostShiba adds one.
3. Inlines the rules onto the HTML elements, so inbox clients that strip `<style>` still show the design.

## Example

```css global.css
body {
  margin: 0;
  background: #f4f4f5;
  color: #18181b;
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.container {
  max-width: 560px;
  margin: 0 auto;
  padding: 32px 16px;
}
.button {
  display: inline-block;
  padding: 10px 16px;
  background: #18181b;
  color: #fafafa;
  text-decoration: none;
  border-radius: 6px;
}
```

```html example.html
<div class="container">
  <p>Hi {{ name }},</p>
  <p><a class="button" href="{{ action_url }}">Continue</a></p>
</div>
```

## Tips for email CSS

- Prefer table layouts and simple properties. They work in more inbox clients than flexbox or grid.
- A `<style>` tag in the HTML still works, and it is inlined too. Keep shared rules in the **CSS** tab.
- `<link rel="stylesheet">` is not fetched. Keep every style in the template.

## Next steps

- [Template editor](/docs/dashboard/templates/editor)
- [Liquid](/docs/dashboard/templates/liquid)
- [Send with a template](/docs/dashboard/templates/send-with-a-template)

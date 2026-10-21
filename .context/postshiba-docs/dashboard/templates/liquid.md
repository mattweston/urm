# Liquid

> Variables, filters, if, and for.

Templates use [Liquid](https://shopify.github.io/liquid/) to fill in per-message values. This page covers the tags and filters you need most, and what Liquid will not do in PostShiba.

## Where Liquid runs

Liquid works in the subject, HTML, text, and CSS of a template. From and Reply-To are plain text.

Values come from `template.variables` on the send. In the dashboard, the **Variables** tab uses the same JSON shape for the preview and test sends.

## Variables

```html greeting.html
<p>Hi {{ name }},</p>
<p>{{ body | default: "Thanks for signing up." }}</p>
```

```json variables.json
{
  "name": "Ada",
  "body": "Your account is ready."
}
```

A missing variable renders as empty. Use `| default` when you want a fallback.

### Nested keys

```html nested.html
<p>{{ user.name }}</p>
```

```json nested.json
{
  "user": {"name": "Ada"}
}
```

### Escaping

Liquid does not escape HTML for you. `{{ name }}` is inserted exactly as sent. Escape untrusted values in your app, or use `| escape`. Pass a value that is already HTML when you want markup in the body.

## Filters

Common Liquid filters.

| Filter | Example |
| --- | --- |
| `default` | `{{ name \| default: "there" }}` |
| `upcase`, `downcase`, `capitalize` | `{{ name \| upcase }}` |
| `escape` | `{{ name \| escape }}` |
| `date` | `{{ created_at \| date: "%b %-d, %Y" }}` |
| `truncate` | `{{ body \| truncate: 80 }}` |
| `join` | `{{ tags \| join: ", " }}` |

An unknown filter is an error, not a silent no-op.

## Conditions

```html conditions.html
{% if action_url %}
  <p><a href="{{ action_url }}">Continue</a></p>
{% endif %}

{% unless items %}
  <p>No items.</p>
{% endunless %}
```

## Loops

```html list.html
{% for item in items %}
  <p>{{ item.name }}, {{ item.price }}</p>
{% endfor %}
```

```json items.json
{
  "items": [
    {"name": "Vintage Macintosh", "price": "499"},
    {"name": "Keyboard", "price": "79"}
  ]
}
```

When `items` is an array of strings, `{{ item }}` prints each one.

## Comments and raw text

```html comments.html
{% comment %}Not sent.{% endcomment %}
{% raw %}{{ this stays literal }}{% endraw %}
```

## Limits and errors

- `{% include %}` and `{% render %}` do not work. Templates cannot read files.
- Liquid is parsed strictly. Invalid syntax or an unknown filter blocks **Save** in the dashboard.
- At send time, a template that fails to render returns `422` `{"error": "invalid", "field": "template"}`.

## Next steps

- [Template editor](/docs/dashboard/templates/editor)
- [Global CSS](/docs/dashboard/templates/css)
- [Send with a template](/docs/dashboard/templates/send-with-a-template)
- [Shopify Liquid reference](https://shopify.github.io/liquid/)

# Street view in an overlay iframe

Open question from the interactive-map details panel: instead of the Street view
row leaving for Google Maps in a new tab, open a panorama in an iframe overlaying
the map, with an exit button.

## Short answer

Possible, but **not** by framing the link we currently use.

## What was checked

`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=<lat>,<lng>` —
the URL `streetViewHref` builds in `interactive-map.view.ts` — responds with:

```
x-frame-options: SAMEORIGIN
```

So the browser refuses to render it in our iframe. This was confirmed against
the live URL, not assumed.

**Not** confirmed: that the Maps Embed API serves a framable response. Its
endpoint needs a valid key, and the 404 returned for an invalid one also carries
`SAMEORIGIN`, so the header on a successful response was not observed. Worth
verifying with a real key before building anything.

## Options

### 1. Google Maps Embed API — the intended route

```
https://www.google.com/maps/embed/v1/streetview?key=<KEY>&location=<lat>,<lng>
```

- Designed for framing, unlike the plain maps URL.
- Needs a Google Cloud API key with **Maps Embed API** enabled, and a billing
  account attached even where the calls themselves are not billed. Check current
  pricing before committing — Embed API terms have changed before.
- The key ships to the browser, so it must be restricted by HTTP referrer in the
  Google Cloud console. It cannot be kept secret.
- That means a second provider key alongside `VITE_MAPBOX_ACCESS_TOKEN`, with
  its own env var, its own console and its own quota.

### 2. Mapillary

Open, crowd-sourced street-level imagery with an embeddable JS viewer. Own
access token, no billing account.

Coverage is the risk: it is contributor-driven, and the Slad and Golden valley
lanes are exactly where it thins out. **Check a handful of real studio
coordinates on mapillary.com before considering this** — a viewer that opens
empty for half the studios is worse than a link that always works.

### 3. Leave it as a link

What it does now. Costs nothing, no key, no provider terms, always works.

## Recommendation

Only worth doing if the panorama is genuinely part of finding a studio door
rather than a flourish. If it is, take option 1 and accept the second key.

If it goes ahead, note that this reintroduces exactly what was removed from the
storymap: a third-party iframe. The difference is that this one is opened
deliberately by the user and dismissed, rather than being the page itself. Worth
being deliberate about that rather than drifting back into it.

## If building it

Model and messages, following the shape the demo already uses:

- `maybeStreetViewStudioId: S.Option(S.String)` on the Model — Some while the
  overlay is open. Not a boolean plus a separate id, so the two cannot disagree.
- `OpenedStreetView({ studioId })` / `ClosedStreetView` messages.
- The row in `studioDetailsView` becomes a button dispatching `OpenedStreetView`
  rather than an anchor.
- Overlay view over the map pane, absolutely positioned like the details panel,
  with the iframe plus a close button.

Details worth getting right:

- **Escape should close it.** The demo has no keyboard subscription yet; this
  would be the first, and it belongs in `interactive-map.subscription.ts`
  alongside the marker-click seam.
- **Focus** should move into the overlay on open and back to the row on close.
- The iframe wants `loading="lazy"`, a `title`, and
  `referrerpolicy="no-referrer-when-downgrade"` — the Embed API matches requests
  against the referrer restriction on the key.
- Keep the "open in Google Maps" link as well as the overlay. The panorama is
  useful; a full map with directions is sometimes what someone actually wants.
- Only render the iframe while the overlay is open. Leaving a hidden one mounted
  keeps a Google frame live on every page view.

## Files

- `interactive-map.view.ts` — `streetViewHref`, and the Street view row in
  `studioDetailsView`
- `interactive-map.model.ts`, `interactive-map.message.ts`,
  `interactive-map.update.ts` — overlay state
- `interactive-map.subscription.ts` — Escape to close

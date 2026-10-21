Yes, with one caveat worth designing around.

The caveat: most studio pairs are very close together. Four of the town-centre studios are within a few hundred metres of each other; a route between two of those animates in about a second and the camera work has nothing to do. The current 15-stop version looks good precisely because it's long and winding.

So: make it selectable, but keep it capable of being long.

What I'd build:

Click a marker to set From, click another to set To. A third click starts over.
A small From/To readout in the panel with a Swap and Clear, so the state is visible rather than implicit in click order.
Default to Stroud town centre → The Camp — around 8 km with real turns, so the demo looks right before anyone touches it, and there's something to press play on immediately.
All 39 studios selectable, not just the Slad valley, so cross-valley routes are possible.
Duration scaled to route length rather than the fixed 24 s, otherwise a short hop crawls and a long one races.
That last one matters more than it sounds: with a fixed duration, picking two adjacent studios gives you 24 seconds of camera drifting over one street.

What it costs: the fixed journeyStudios list becomes two ids in the Model, FetchJourney takes them as args instead of being argument-less, and marker clicks need the handler seam — which is the same one the interactive map already uses, so it's a known shape.

What it loses: routing through all 15 stops makes the line wiggle into each studio, which reads as a trail. A two-point route is just a drive. If you want both, I'd add a "via every studio between" toggle rather than choosing — but that's a second thing to explain, so I'd start without it.

Want me to build the two-marker version?

This is a small weblog living inside the URM documentation, and it exists to
show one thing: prose written in markdown can be a first-class part of a
Foldkit application rather than a lump of HTML dropped beside it.

Everything below the navigation is compiled from `.md` files at build time. No
markdown parser ships to the browser. What arrives is a typed tree of blocks,
folded into ordinary Foldkit views, participating in the vdom exactly like the
rest of the site.

The two posts cover how that works and what may be written. Both of them
contain a live counter sitting between paragraphs, which is the part worth
looking at.

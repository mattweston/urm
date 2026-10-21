
```sh
# For viewing the minipc’s localhost on your Mac
# Though since urmdev is on your tailnet, if the dev server binds 0.0.0.0 rather than 127.0.0.1 you don’t need a tunnel at all — http://urmdev.tail4eaae8.ts.net:3000 reaches it directly. Your history does show sudo mount -t davfs http://100.100.100.100:8080 /mount/tailscale, so you’ve worked over tailnet addresses before.
# One caveat for this repo: per CLAUDE.md a site is addressed by its own host, and *.localhost can’t carry a session cookie — so a tunnel to localhost:3000 won’t work for the *.urm.test sites. For those you’d want the forward plus an /etc/hosts entry on the Mac pointing the .urm.test names at 127.0.0.1, which may be what that cat /etc/hosts was about.
ssh -N -L 3000:localhost:3000 urmdev
```

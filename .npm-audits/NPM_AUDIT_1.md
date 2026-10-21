Found 20 packages (38 CVEs) with known OSV matches from pnpm-lock
┌──────────┬──────┬────────┬─────┬─────────┐
│ Critical │ High │ Medium │ Low │ Unknown │
├──────────┼──────┼────────┼─────┼─────────┤
│    2     │  4   │   12   │  2  │    0    │
└──────────┴──────┴────────┴─────┴─────────┘

Quick take
- 9 vulnerable packages look directly fixable in this project.
- 10 issues come through other dependencies.
- 1 package could not be clearly classified as direct or transitive.
- 38 CVEs matched overall.
- 20 packages include a fixed-version hint from OSV.

🛠  Copy And Run These Fix Commands
Detected package manager: pnpm (pnpm-lock.yaml)
7 command groups ready across 12 packages (1 critical, 2 high, 4 medium).

Critical severity fix commands
┌─────────┬─────────┬────────┬───────┬──────────────────┬────────────────────────┬───────────┐
│ Package │ Current │ Target │ Usage │ Versions scanned │ Still known vulnerable │ Breaking? │
├─────────┼─────────┼────────┼───────┼──────────────────┼────────────────────────┼───────────┤
│ vitest  │ 3.0.0   │ 3.0.5  │ n/a   │ 5                │ 4                      │           │
├─────────┼─────────┼────────┼───────┼──────────────────┼────────────────────────┼───────────┤
│ Total   │ -       │ -      │ -     │ 5                │ 4                      │           │
└─────────┴─────────┴────────┴───────┴──────────────────┴────────────────────────┴───────────┘
┌───────────────────────────────┬─────────┬────────────────────┬───────┬──────────────────────────────────────────────────────────────┐
│ Package                       │ Current │ Recommended target │ Usage │ Context                                                      │
├───────────────────────────────┼─────────┼────────────────────┼───────┼──────────────────────────────────────────────────────────────┤
│ @happy-dom/global-registrator │ 15.0.0  │ 20.0.0             │ n/a   │ Path-specific parent upgrade for project ->                  │
│                               │         │                    │       │ @happy-dom/global-registrator -> happy-dom                   │
│                               │         │                    │       │ (happy-dom@15.11.7); run this command, then rescan. 2 other  │
│                               │         │                    │       │ known paths may still need separate parent upgrades.         │
└───────────────────────────────┴─────────┴────────────────────┴───────┴──────────────────────────────────────────────────────────────┘
> pnpm add --filter ./apps/web-tan --filter ./packages/client --filter ./packages/contracts --filter ./packages/domain --filter ./packages/features --filter ./packages/rpc --filter ./packages/utils vitest@3.0.5 && pnpm add @happy-dom/global-registrator@20.0.0

High severity fix commands
┌─────────┬─────────┬─────────┬───────┬──────────────────┬────────────────────────┬───────────┐
│ Package │ Current │ Target  │ Usage │ Versions scanned │ Still known vulnerable │ Breaking? │
├─────────┼─────────┼─────────┼───────┼──────────────────┼────────────────────────┼───────────┤
│ glob    │ 11.0.0  │ 11.1.0  │ n/a   │ 4                │ 3                      │           │
│ three   │ 0.80.0  │ 0.125.0 │ n/a   │ 69               │ 68                     │           │
├─────────┼─────────┼─────────┼───────┼──────────────────┼────────────────────────┼───────────┤
│ Total   │ -       │ -       │ -     │ 73               │ 71                     │           │
└─────────┴─────────┴─────────┴───────┴──────────────────┴────────────────────────┴───────────┘
> pnpm add --filter ./packages/tools/ai-docgen --filter ./packages/tools/docgen glob@11.1.0 && pnpm add --filter ./packages/ui three@0.125.0

High severity parent updates within range
┌───────────────────────┬─────────┬────────────────────┬───────┬──────────────────────────────────────────────────────────────┐
│ Package               │ Current │ Recommended target │ Usage │ Context                                                      │
├───────────────────────┼─────────┼────────────────────┼───────┼──────────────────────────────────────────────────────────────┤
│ devalue               │ 5.8.0   │ lockfile refresh   │ n/a   │ devalue@5.8.0 can be refreshed to 5.8.1+ — no parent upgrade │
│                       │         │                    │       │ needed.                                                      │
└───────────────────────┴─────────┴────────────────────┴───────┴──────────────────────────────────────────────────────────────┘
> pnpm update --recursive --no-save devalue

Medium severity direct fixes
┌─────────────────────┬─────────┬─────────┬───────┬──────────────────┬────────────────────────┬───────────┐
│ Package             │ Current │ Target  │ Usage │ Versions scanned │ Still known vulnerable │ Breaking? │
├─────────────────────┼─────────┼─────────┼───────┼──────────────────┼────────────────────────┼───────────┤
│ @astrojs/cloudflare │ 13.1.5  │ 13.2.0  │ n/a   │ -                │ -                      │           │
│ @sentry/astro       │ 10.19.0 │ 10.27.0 │ n/a   │ 8                │ 7                      │           │
│ turbo               │ 2.3.3   │ 2.9.14  │ n/a   │ 64               │ 63                     │           │
├─────────────────────┼─────────┼─────────┼───────┼──────────────────┼────────────────────────┼───────────┤
│ Total               │ -       │ -       │ -     │ 72               │ 70                     │           │
└─────────────────────┴─────────┴─────────┴───────┴──────────────────┴────────────────────────┴───────────┘
> pnpm add --filter ./apps/labs --filter ./apps/marketing-go-to-web --filter ./apps/web --filter ./apps/web-fold-labs --filter ./styleguide @astrojs/cloudflare@13.2.0 && pnpm add --filter ./styleguide @sentry/astro@10.27.0 && pnpm add turbo@2.9.14

Medium severity direct fixes (registry-adjusted)
┌─────────────────────┬─────────┬─────────┬───────┬──────────────────┬────────────────────────┬───────────┐
│ Package             │ Current │ Target  │ Usage │ Versions scanned │ Still known vulnerable │ Breaking? │
├─────────────────────┼─────────┼─────────┼───────┼──────────────────┼────────────────────────┼───────────┤
│ @astrojs/node       │ 9.5.1   │ 10.0.5  │ n/a   │ 10               │ 9                      │ ⚠         │
│ astro               │ 6.1.4   │ 6.1.10  │ n/a   │ 6                │ 5                      │           │
├─────────────────────┼─────────┼─────────┼───────┼──────────────────┼────────────────────────┼───────────┤
│ Total               │ -       │ -       │ -     │ 16               │ 14                     │           │
└─────────────────────┴─────────┴─────────┴───────┴──────────────────┴────────────────────────┴───────────┘
> pnpm add --filter ./apps/labs --filter ./apps/marketing-go-to-web --filter ./apps/web --filter ./apps/web-fold-labs --filter ./styleguide @astrojs/node@10.0.5 astro@6.1.10

Medium severity parent updates within range
┌───────────────────────┬─────────┬────────────────────┬───────┬──────────────────────────────────────────────────────────────┐
│ Package               │ Current │ Recommended target │ Usage │ Context                                                      │
├───────────────────────┼─────────┼────────────────────┼───────┼──────────────────────────────────────────────────────────────┤
│ ws                    │ 8.20.0  │ lockfile refresh   │ n/a   │ ws@8.20.0 can be refreshed to 8.21.0+ — no parent upgrade    │
│                       │         │                    │       │ needed.                                                      │
└───────────────────────┴─────────┴────────────────────┴───────┴──────────────────────────────────────────────────────────────┘
> pnpm update --recursive --no-save ws

Medium severity parent upgrades
┌───────────────────────┬─────────┬────────────────────┬───────┬──────────────────────────────────────────────────────────────┐
│ Package               │ Current │ Recommended target │ Usage │ Context                                                      │
├───────────────────────┼─────────┼────────────────────┼───────┼──────────────────────────────────────────────────────────────┤
│ @tanstack/solid-start │ 1.167.6 │ 1.167.61           │ n/a   │ Path-specific parent upgrade for project ->                  │
│                       │         │                    │       │ @tanstack/solid-start -> @tanstack/start-server-core         │
│                       │         │                    │       │ (@tanstack/start-server-core@1.167.3); run this command,     │
│                       │         │                    │       │ then rescan. 2 other known paths may still need separate     │
│                       │         │                    │       │ parent upgrades.                                             │
└───────────────────────┴─────────┴────────────────────┴───────┴──────────────────────────────────────────────────────────────┘
> pnpm add @tanstack/solid-start@1.167.61

Running all commands above should fix 14 of 20 findings.

Showing medium+ findings in the main table. Use --all to show everything.
┌─────────────────────────────┬─────────────┬──────────┬────────────┬───────┬──────────┬──────────────────────────────────────────┐
│ Package                     │ Version     │ Severity │ Type       │ Usage │ Fixed    │ IDs                                      │
├─────────────────────────────┼─────────────┼──────────┼────────────┼───────┼──────────┼──────────────────────────────────────────┤
│ vitest                      │ 3.0.0       │ critical │ direct     │ n/a   │ 3.0.5    │ GHSA-9crc-q9x8-hgqq                      │
│ happy-dom                   │ 15.11.7     │ critical │ transitive │ n/a   │ 20.8.9   │ GHSA-37j7-fg3j-429f, GHSA-6q6h-j7hj-3r6… │
│ glob                        │ 11.0.0      │ high     │ direct     │ n/a   │ 11.1.0   │ GHSA-5j98-mcp5-4vw2                      │
│ three                       │ 0.80.0      │ high     │ direct     │ n/a   │ 0.125.0  │ GHSA-fq6p-x6j3-cmmq                      │
│ devalue                     │ 5.8.0       │ high     │ transitive │ n/a   │ 5.8.1    │ GHSA-77vg-94rm-hx3p                      │
│ next                        │ 16.2.4      │ high     │ transitive │ n/a   │ 16.2.6   │ GHSA-267c-6grr-h53f, GHSA-26hh-7cqf-hhc… │
│ @astrojs/node               │ 9.5.1       │ medium   │ direct     │ n/a   │ 10.0.5   │ GHSA-3rmj-9m5h-8fpv, GHSA-c57f-mm3j-27q… │
│ @sentry/astro               │ 10.19.0     │ medium   │ direct     │ n/a   │ 10.27.0  │ GHSA-6465-jgvq-jhgp                      │
│ astro                       │ 6.1.4       │ medium   │ direct     │ n/a   │ 6.1.10   │ GHSA-j687-52p2-xcff, GHSA-xr5h-phrj-8vxv │
│ turbo                       │ 2.3.3       │ medium   │ direct     │ n/a   │ 2.9.14   │ GHSA-3qcw-2rhx-2726, GHSA-hcf7-66rw-9f5r │
│ @sentry/node                │ 10.19.0     │ medium   │ transitive │ n/a   │ 10.27.0  │ GHSA-6465-jgvq-jhgp                      │
│ @sentry/node-core           │ 10.19.0     │ medium   │ transitive │ n/a   │ 10.27.0  │ GHSA-6465-jgvq-jhgp                      │
│ @tanstack/start-server-core │ 1.167.3     │ medium   │ transitive │ n/a   │ 1.167.30 │ GHSA-9m65-766c-r333                      │
│ brace-expansion             │ 5.0.5       │ medium   │ transitive │ n/a   │ 5.0.6    │ GHSA-jxxr-4gwj-5jf2                      │
│ h3                          │ 2.0.1-rc.16 │ medium   │ unknown    │ n/a   │ 1.15.9   │ GHSA-2j6q-whv2-gh6w, GHSA-4hxc-9384-m38… │
│ postcss                     │ 8.4.31      │ medium   │ transitive │ n/a   │ 8.5.10   │ GHSA-qx2v-qp2m-jg93                      │
│ ws                          │ 8.18.0      │ medium   │ transitive │ n/a   │ 8.20.1   │ GHSA-58qx-3vcg-4xpx                      │
│ ws                          │ 8.20.0      │ medium   │ transitive │ n/a   │ 8.20.1   │ GHSA-58qx-3vcg-4xpx                      │
└─────────────────────────────┴─────────────┴──────────┴────────────┴───────┴──────────┴──────────────────────────────────────────┘
Tip: use --all to include low findings, or --min-severity high to focus only on urgent issues.

Coverage notes
• Scanned resolved dependency versions from pnpm-lock.yaml.
• Dependency paths are approximated from importer relationships and package snapshots.
• This MVP checks package versions against OSV advisories. It does not prove exploitability or runtime reachability.
• Installed node_modules contents are not verified in this scan.
• Container images, binaries, secrets, and IaC files are not scanned.
• Monorepo workspace boundaries are only partially modeled in this version.

────────────────────────────────
✖ Scan complete. 20 issues found (2 critical, 4 high). Start with the priority fixes above.

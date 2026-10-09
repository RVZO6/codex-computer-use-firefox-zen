# RVZO6 test fork — 2026.10.09.2

This is an unsigned experimental Firefox/Zen build, based on the installed
Chrome extension **1.26.901.11451**, build
`834ab2c3159a7637c75db757ad053344da009e8b`. It includes the upstream UI,
background, page bridges, and packaged assets, with the Firefox adapters retained.
No browser storage, credentials, run logs, or browser profile files are packaged.

## Try it

1. Download and extract the extension ZIP from this fork's prerelease.
2. In Zen, open `about:debugging#/runtime/this-firefox` and select **Load Temporary
   Add-on…**, then select the extracted `manifest.json`.
3. Open the Codex sidebar and try your normal browser tasks. Keep the existing
   **1.4.12 native companion** installed; no bridge reinstall is needed.

This deliberately retains the existing Gecko extension ID and version **1.4.12**
so the companion's exact-version check accepts it. Loading it temporarily can
replace/disable the installed add-on for that browser session; don't do it while
an agent is using the old extension. Restart Zen to remove the temporary build
and return to the signed version. The fork build identifier is separate from the
companion ABI version. This package is **not Mozilla-signed** and is not a
permanent-install replacement. No AMO release or native-host installation is
performed by the build scripts. The inherited publishing workflow is archived
outside the workflows directory; the fork CI only tests and packages unsigned
artifacts.

## Changes

- The static Playwright helper supports common role/name/heading selectors,
  text filters, regex matching, quoted selector chains, and same-origin frame
  entry. Text filters keep the link/control as their target.
- Accessibility snapshots exclude hidden scripts/styles and hidden subtrees,
  suppress password values, use StaticText nodes for visible text, and avoid
  repeating a whole page in each container. They also recognize H4–H6,
  aria-labelledby, native control roles, and open shadow roots.
- The sidebar uses the current upstream UI and its explicit Tailwind layer
  order. The Firefox root uses a predictable rem baseline and host-relative
  height; narrow composers hide secondary effort text rather than scale down
  every control. Normal page zoom remains available.
- A scoped readable adapter uses `font: revert-layer` to bypass the upstream
  unlayered `button,textarea { font: inherit }` reset. It previously overrode every normal typography utility:
  composer controls inherited 16px even though their `--text-sm` token was 13px.
  The earlier root-only layout check missed this. Computed control fonts and
  explicit button/textarea size and weight utilities are now asserted in live Zen.
- Current upstream side-panel option queries and persisted destinations work
  through the Firefox adapter. Controlled-tab request headers use Firefox's
  native DNR API; the extension adds its required permission. The adapter
  supplies Chromium's missing DNR action/header enum constants and maps the
  Gecko extension ID to the real moz-extension initiator hostname. Without
  those adaptations, the new upstream reconciler fails on the first tab claim.
- File-reference **Copy path** resolves against the supplied run working
  directory, with the thread's working directory as a fallback. POSIX, Windows,
  UNC and file URLs are supported. If no working directory is available, the
  action is explicitly named **Copy relative path**, rather than inventing an
  absolute path. Copy contents reads that same resolved path.
- `pnpm package` builds deterministic ZIP/XPI artifacts on macOS, Linux and
  Windows, plus a source archive and SHA-256 checksums. It requires committed
  source so the downloadable source matches the extension.

## Validation and remaining limits

`pnpm test` covers the adapters and existing feature parity. The isolated live
Zen tests use disposable profiles, not the user's profile:

```sh
FIREFOX_BINARY=/Applications/Zen.app/Contents/MacOS/zen npm run test:live
```

A private, one-off full-extension smoke test (not another maintained suite) blocks native messaging and renders real packaged
composer components at 260, 320, 384, 438 and 600 CSS pixels. It tests background
startup, actual controlled-tab DNR rule installation/removal, visible action
geometry, a 20px browser font default with the UI retaining its 16px rem baseline, and the
sidebar's disconnected startup surface. The font regression was reproduced in a
clean profile and fails against the preceding build with `Composer font override`
(16px rendered versus the 13px token). The patched build renders 13px controls
and preserves 12/13/14px utilities and medium weight with 16px and 20px browser
font defaults. No user browser preferences or installed add-on files are changed.
It does **not** exercise an authenticated
ChatGPT conversation. Testing that final integration needs the user's temporary
load and an actual run.

`web-ext lint` reports zero errors and zero notices, with 123 warnings from
minified code, guarded Chrome APIs, and dynamic evaluation sites. This is a
validation result, not a claim that every upstream feature works in Firefox.
The new accessibility regression also fails against the original collector,
which leaks its hidden script fixture; the patched collector returns 7,151 bytes
without that content.

The selector helper remains a partial Playwright/AccName implementation.
Cross-origin frame selectors require the bridge's separate CDP frame sessions;
this build doesn't claim to fix every Excel interaction. The Chrome-only Work
side-panel host isn't supported; Firefox retains the local Codex sidebar.

## Run-history audit

A local-only scan covered 521 stored session files and found 82 runs containing
browser/computer-use calls (1,828 such calls). The clearest Firefox-specific
failure was the pair of 3-second Amazon role/text-selector timeouts. A recent
Excel run also exposed script bodies and repeatedly duplicated page text in its
accessibility output, which the old adapter produced directly.

Other observed failures included unmatched or non-actionable Helium locators,
waiting for downloads that didn't arrive, browser reconnection delays, and
undefined agent variables. These are not established Firefox defects, and this
fork doesn't claim to repair them. The audit contains no published raw logs,
conversation text, personal filenames, account identifiers, or URLs.

The modifications to minified upstream assets are reproducible with
`node scripts/apply-upstream-patches.mjs`; the script is idempotent and rejects
changed upstream call sites rather than silently patching the wrong code.

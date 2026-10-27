# Solflare Wallet Onboarding — E2E Test

A WebdriverIO + TypeScript + Mocha end-to-end test for the Solflare wallet
onboarding flow at [solflare.com/onboard](https://solflare.com/onboard):
create a wallet, add two more wallets via "Show or hide wallets," and verify
the recovery phrase list ends up containing exactly the original wallet plus
the two newly added ones.

## Prerequisites

- Node.js 22 or later (tested on v24; CI uses Node 24)
- Nothing else. Browser binaries (Chrome and Firefox) are downloaded
  automatically by WebdriverIO's driver manager on first run — there's no
  need to have either browser, or a matching driver, already installed.

## Install

```bash
npm install
```

## Run

```bash
npm test                      # Chrome, headed (default)
npm run test:chrome           # Chrome, headed
npm run test:firefox          # Firefox, headed
npm run test:headless         # Chrome, headless
npm run test:firefox:headless # Firefox, headless
```

Browser and headless mode are controlled by the `BROWSER` and `HEADLESS`
environment variables, so any combination also works directly:

```bash
BROWSER=firefox HEADLESS=true npm test
```

`BROWSER` accepts `chrome` (default) or `firefox`; anything else fails fast
with a clear error. `HEADLESS` accepts `true` or `false` (default); any
other value also fails fast rather than silently running headed.

### Test password

The test creates a throwaway wallet and needs a password for it. It reads
`TEST_PASSWORD` from the environment, falling back to a committed default
(`Wdio-Test-Password-1!`) if unset — this is a dummy password for a wallet
that's discarded at the end of the run, not a real credential, so a
committed default is safe:

```bash
TEST_PASSWORD='Some-Other-Password-1!' npm test
```

## CI

A minimal GitHub Actions workflow (`.github/workflows/e2e.yml`) runs on
every push: typecheck, then the suite in Firefox headless — chosen over
Chrome headless for CI since it needs no extra flags (see "Other
environment notes" below for what Chrome headless requires and why).

## Typecheck

```bash
npm run typecheck
```

## Project structure

```
test/
  pageobjects/
    base.page.ts               # shared navigation + click helpers
    onboarding.page.ts         # wallet creation: password, terms, continue
    wallet-management.page.ts  # wallet list, show/hide wallets, save
  specs/
    wallet-onboarding.e2e.ts   # the end-to-end test
  utils/
    logger.ts                  # winston logger (console + logs/test.log)
    screenshot.ts              # failure screenshot capture (screenshots/)
wdio.conf.ts                   # runner config, browser selection, hooks
tsconfig.json
```

## Logs and screenshots

- Every meaningful page object action (clicking a button, entering a
  password, toggling a wallet, etc.) is logged via
  [winston](https://github.com/winstonjs/winston) to both the console and
  `logs/test.log`.
- If a test fails, a timestamped screenshot is saved automatically to
  `screenshots/` via an `afterTest` hook in `wdio.conf.ts`. Both
  directories are git-ignored and created on demand — they won't exist
  until a test has actually run.

## Test data cleanup

No cleanup step is needed after a test run. The wallet this test creates
is generated client-side and stored in the browser profile. WebdriverIO
starts every session with a fresh temporary profile and discards it when
the session ends, so each run is isolated and no test data accumulates
between runs.

This holds per spec file, not just per run: each spec file gets its own
worker and its own fresh browser session. If more tests are ever added to
the same spec file, each should start from a clean state too — e.g. via
`browser.reloadSession()` in an `afterEach` hook. That isn't included now
because the suite has a single test; adding it today would only add
runtime without changing any actual behavior.

## Assumptions and deviations from the written steps

The written test steps don't match the live site exactly in a few places.
Each deviation below was confirmed by hand against the live site before
being encoded into the page objects:

1. **An extra screen after "Get started."** The written steps go straight
   from "Get started" to "Enter password," but the live site inserts a
   "Create new wallet / Continue with Google / I already have a wallet"
   screen first. The test clicks "Create new wallet," the only path that
   leads to the password fields.
2. **The "arrow icon next to the RECOVERY PHRASE label" is the options
   (⋮) button, not the chevron.** There's a separate chevron next to the
   same label that only expands/collapses the wallet list in place and
   doesn't lead anywhere. The icon that actually opens the menu containing
   "Show or hide wallets" is the three-dot options button.
3. **The terms checkbox is a visually-hidden input, wrapped in two nested
   `<label>`s.** `input[name="termsAccepted"]` renders as a 1×1px
   accessibility target; the visible 24×24px checkbox box is drawn by an
   inner `<label>`, which is itself nested inside a second, outer `<label>`
   spanning the whole "I agree to the Terms of Service and Privacy
   Policy." row (including both links). The test clicks the inner label —
   selected via `ancestor::label[not(.//label)]`, since a plain
   `ancestor::label` match is ambiguous between the two.
4. **Wallet and toggle identifiers are dynamic.** Both the wallet-row and
   toggle `data-testid`s are the wallet's public key appended to a fixed
   prefix (e.g. `tgl-li-wallets-<publicKey>`), and a fresh key is
   generated every time a wallet is created — including every test run.
   So list items are matched by position ("3rd and 4th"), and where the
   test needs to assert on *which* wallets ended up in the final list, it
   reads the public key back out of the testid rather than hardcoding one.

### Other environment notes

- **Chrome headless needs a standard user-agent.** Solflare's bot
  protection blocks sessions whose user-agent advertises itself as
  `HeadlessChrome/<version>` (Chrome's default in `--headless=new` mode),
  returning `{"errors": ["Too many requests."]}` instead of rendering the
  app. This was isolated deliberately:
  - Chrome **headed**, Firefox **headed**, and Firefox **headless** all
    passed reliably with the unmodified page objects, ruling out a bug in
    the suite itself.
  - Chrome headless failed instantly and consistently, including after a
    20+ hour gap (ruling out a simple time-based rate limit) and with
    `--disable-blink-features=AutomationControlled` added (ruling out the
    most common automation-detection fingerprint).
  - Overriding `--user-agent` to a standard desktop Chrome string (see
    `wdio.conf.ts`) — without changing anything else about the session —
    resolved it, confirmed across two consecutive runs. This narrows the
    cause specifically to the user-agent string, not headless rendering,
    automation flags, or TLS/network fingerprinting in general.
- **Fixed window size.** `wdio.conf.ts` pins the browser window to
  1600×1000 in a `before` hook. Chrome and Firefox otherwise open headed
  windows at different default sizes, and the app's layout responds to
  viewport width — without this, the two browsers exercise different
  layouts and the "My wallets" panel can fail to render as expected.

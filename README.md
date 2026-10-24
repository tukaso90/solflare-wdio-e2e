# Solflare Wallet Onboarding — E2E Test

A WebdriverIO + TypeScript + Mocha end-to-end test for the Solflare wallet
onboarding flow at [solflare.com/onboard](https://solflare.com/onboard):
create a wallet, add two more wallets via "Show or hide wallets," and verify
the recovery phrase list ends up containing exactly the original wallet plus
the two newly added ones.

## Prerequisites

- Node.js 20 or later (tested on v24)
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
npm run test:headless         # Chrome, headless (see note below)
npm run test:chrome:headless  # Chrome, headless (see note below)
npm run test:firefox:headless # Firefox, headless
```

Browser and headless mode are controlled by the `BROWSER` and `HEADLESS`
environment variables, so any combination also works directly:

```bash
BROWSER=firefox HEADLESS=true npm test
```

`BROWSER` accepts `chrome` (default) or `firefox`; anything else fails fast
with a clear error. `HEADLESS` defaults to `false`.

> **Note:** Chrome headless (`test:headless` / `test:chrome:headless`) is
> currently blocked by Solflare's own bot protection, independent of this
> suite — see "Other environment notes" below for how that was isolated.
> `test:firefox:headless` is the verified headless path.

### Test password

The test creates a throwaway wallet and needs a password for it. It reads
`TEST_PASSWORD` from the environment, falling back to a committed default
(`Wdio-Test-Password-1!`) if unset — this is a dummy password for a wallet
that's discarded at the end of the run, not a real credential, so a
committed default is safe:

```bash
TEST_PASSWORD='Some-Other-Password-1!' npm test
```

## Project structure

```
test/
  pageobjects/
    base.page.ts              # shared navigation helper
    onboarding.page.ts        # wallet creation: password, terms, continue
    wallet-management.page.ts # wallet list, show/hide wallets, save
  specs/
    wallet-onboarding.e2e.ts  # the end-to-end test
  utils/
    logger.ts                 # winston logger (console + logs/test.log)
    screenshot.ts              # failure screenshot capture (screenshots/)
wdio.conf.ts                  # runner config, browser selection, hooks
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
3. **The terms checkbox is a visually-hidden input.** `input[name="termsAccepted"]`
   renders as a 1×1px accessibility target; the visible checkbox is drawn
   by its wrapping `<label>`. The test clicks the label (via
   `closest('label')`), which is what a real user actually clicks.
4. **Wallet and toggle identifiers are dynamic.** Both the wallet-row and
   toggle `data-testid`s are the wallet's public key appended to a fixed
   prefix (e.g. `tgl-li-wallets-<publicKey>`), and a fresh key is
   generated every time a wallet is created — including every test run.
   So list items are matched by position ("3rd and 4th"), and where the
   test needs to assert on *which* wallets ended up in the final list, it
   reads the public key back out of the testid rather than hardcoding one.

### Other environment notes

- **Chrome's headless mode is currently blocked by Solflare's bot
  protection.** `npm run test:chrome:headless` / `npm run test:headless`
  reliably fail with the app returning `{"errors": ["Too many requests."]}`
  instead of rendering — this is the site's own WAF/bot-detection response,
  not a bug in the suite. This was isolated deliberately, not assumed:
  - Chrome **headed**, Firefox **headed**, and Firefox **headless** all
    pass reliably, using the exact same page objects and test logic.
  - Chrome headless fails instantly and consistently, including after a
    20+ hour gap (ruling out a simple time-based rate limit) and with
    `--disable-blink-features=AutomationControlled` added (ruling out the
    most common automation fingerprint).
  - This narrows it to something specific to Chrome's `--headless=new`
    rendering path being fingerprinted and blocked — a known category of
    behavior for bot-management WAFs (e.g. Cloudflare) against headless
    Chrome specifically, distinct from Firefox's headless implementation.

  Given three of the four browser/mode combinations verifiably work end to
  end against the live site, and Chrome headless differs from passing
  Chrome headed only by the `--headless=new` launch flag, the suite's
  logic itself isn't in question here — this is an external, site-side
  block. No further automation-evasion flags were attempted beyond the one
  standard mitigation above, as that's outside the scope of what this
  suite should be doing.
- **Fixed window size.** `wdio.conf.ts` pins the browser window to
  1600×1000 in a `before` hook. Chrome and Firefox otherwise open headed
  windows at different default sizes, and the app's layout responds to
  viewport width — without this, the two browsers exercise different
  layouts and the "My wallets" panel can fail to render as expected.

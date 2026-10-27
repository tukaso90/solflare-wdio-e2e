import BasePage from './base.page.ts';
import { logger } from '../utils/logger.ts';

// Both the wallet-row and toggle testids are the wallet's public key
// appended to one of these prefixes. The key is generated fresh for every
// wallet created in every test run, so it can never be hardcoded — list
// items are matched by position (see walletListItems/walletToggles below),
// and the key is read back from the testid itself when the test needs to
// assert on *which* wallets ended up in the final list.
const WALLET_ROW_TESTID_PREFIX = 'li-wallets-';
const WALLET_TOGGLE_TESTID_PREFIX = 'tgl-li-wallets-';

function publicKeyFromTestId(testId: string | null, prefix: string): string {
    if (!testId?.startsWith(prefix)) {
        throw new Error(`Expected a testid starting with "${prefix}", got "${testId}"`);
    }
    return testId.slice(prefix.length);
}

/**
 * "My wallets" management panel, opened from the avatar in the app header.
 *
 * Models the recovery-phrase wallet list: viewing the main wallet, opening
 * the "Show or hide wallets" screen, toggling additional wallets on, and
 * saving. The panel this page object targets is reached from the portfolio
 * page the app lands on right after onboarding. Exposes elements (rather
 * than pre-computed booleans) so the spec can assert on them directly with
 * expect-webdriverio matchers.
 */
class WalletManagementPage extends BasePage {
    // Targets the avatar itself rather than the wider wallet-picker section:
    // that section also contains a "copy address" button, and a real mouse
    // click at the section's bounding-box center can land on it instead.
    private get avatarWalletPicker() {
        return $('[data-testid="wallet-picker-avatar"]');
    }

    // The "arrow icon next to the RECOVERY PHRASE label" from the written
    // steps is this options (kebab) button, not the separate chevron that
    // only expands/collapses the list in place — see README.
    private get recoveryPhraseOptionsButton() {
        return $('[data-testid="icon-btn-wallet-section-options"]');
    }

    private get btnShowOrHideWallets() {
        return $('[data-testid="li-recovery-phrase-show-or-hide"]');
    }

    private get btnSave() {
        return $('[data-testid="btn-save"]');
    }

    // Wallet rows rendered under "Recovery phrase" in the "My wallets" panel.
    // Scoped to the stable testid prefix rather than a page-wide selector;
    // see the WALLET_ROW_TESTID_PREFIX comment above for why positional
    // matching is still required on top of that.
    private get walletListItems() {
        return $$(`[data-testid^="${WALLET_ROW_TESTID_PREFIX}"]`);
    }

    // The main wallet's row: always first, and the only one present before
    // any wallets are added.
    public get firstWalletListItem() {
        return this.walletListItems[0];
    }

    // Visibility toggles on the "Show or hide wallets" screen. Scoped to the
    // stable testid prefix (rather than the page-wide [role="switch"]) so
    // this can't accidentally match an unrelated switch control elsewhere
    // on the screen. Same positional-matching constraint as walletListItems.
    private get walletToggles() {
        return $$(`[data-testid^="${WALLET_TOGGLE_TESTID_PREFIX}"]`);
    }

    // The main wallet's toggle: always first, and always on and disabled —
    // the main wallet can't be hidden.
    public get firstWalletToggle() {
        return this.walletToggles[0];
    }

    /**
     * Resolves a toggle by its wallet's full public key rather than by
     * list position — used to re-locate a toggle after it's been clicked,
     * since toggling one wallet can re-render the list and invalidate a
     * previously-fetched element reference.
     */
    public getToggleByPublicKey(publicKey: string) {
        return $(`[data-testid="${WALLET_TOGGLE_TESTID_PREFIX}${publicKey}"]`);
    }

    public async openWalletManagement(): Promise<void> {
        logger.info('Opening wallet management via the header avatar');
        await this.clickWhenReady(this.avatarWalletPicker);
    }

    /**
     * Public keys of every wallet currently shown in the recovery-phrase
     * list, in list order. Used to capture the main wallet's identity
     * before selection, and to verify list membership after saving.
     */
    public async getWalletPublicKeys(): Promise<string[]> {
        const items = await this.walletListItems;
        const publicKeys: string[] = [];
        for (const item of items) {
            const testId = await item.getAttribute('data-testid');
            publicKeys.push(publicKeyFromTestId(testId, WALLET_ROW_TESTID_PREFIX));
        }
        return publicKeys;
    }

    /**
     * Waits until the recovery-phrase list renders exactly `expectedCount`
     * rows. Intended to be called after save() — saving navigates back from
     * the toggle screen to this list, and this is what confirms that
     * transition finished (and actually took effect) before the caller
     * reads the list's contents.
     */
    public async waitForWalletCount(expectedCount: number): Promise<void> {
        await browser.waitUntil(
            async () => (await this.walletListItems).length === expectedCount,
            {
                timeout: 10000,
                timeoutMsg: `Expected ${expectedCount} wallet(s) in the recovery phrase list, but the count never matched.`
            }
        );
    }

    public async openShowOrHideWallets(): Promise<void> {
        logger.info('Opening the recovery phrase options menu');
        await this.clickWhenReady(this.recoveryPhraseOptionsButton);

        logger.info('Clicking "Show or hide wallets"');
        await this.clickWhenReady(this.btnShowOrHideWallets);
    }

    /**
     * Resolves the toggle at a 1-based position in the list *as currently
     * displayed*. Only meaningful as a one-time lookup against the list
     * before any click happens on this screen — see selectWalletsAtPositions
     * for why positions aren't re-resolved after a click.
     */
    private async getToggleAtPosition(position: number): Promise<WebdriverIO.Element> {
        const toggles = await this.walletToggles;
        const toggle = toggles[position - 1];
        if (!toggle) {
            throw new Error(
                `Expected at least ${position} wallet toggle(s) in the "Show or hide wallets" list, found ${toggles.length}.`
            );
        }
        return toggle;
    }

    /**
     * Toggles on the wallets at the given 1-based positions in the list as
     * *initially displayed*, matching the "select the 3rd and 4th list
     * item" wording in the test steps. Returns each selected wallet's
     * public key, so the caller can assert on wallet identity and re-locate
     * each toggle afterward via getToggleByPublicKey().
     *
     * Deliberately two phases. Phase 1 resolves every requested position to
     * a wallet identity (public key) and checks its pre-click toggle state,
     * all against the list as it existed before any click — re-reading a
     * position after a click would be wrong if toggling re-renders/reorders
     * the list, since position 4 could then point to the wallet just
     * toggled, or a different one entirely. Phase 2 clicks each toggle,
     * addressed by public key (getToggleByPublicKey), never by position.
     */
    public async selectWalletsAtPositions(positions: number[]): Promise<string[]> {
        const selections: Array<{ position: number; publicKey: string }> = [];

        for (const position of positions) {
            const toggle = await this.getToggleAtPosition(position);
            const testId = await toggle.getAttribute('data-testid');
            const publicKey = publicKeyFromTestId(testId, WALLET_TOGGLE_TESTID_PREFIX);

            const state = await toggle.getAttribute('data-state');
            if (state !== 'unchecked') {
                throw new Error(
                    `Wallet at position ${position} is already on (data-state="${state}", publicKey ${publicKey}) — expected "unchecked" before toggling.`
                );
            }

            selections.push({ position, publicKey });
        }

        for (const { position, publicKey } of selections) {
            logger.info(`Toggling on wallet at position ${position} (${publicKey})`);
            await this.clickWhenReady(this.getToggleByPublicKey(publicKey));
        }

        return selections.map((selection) => selection.publicKey);
    }

    public async save(): Promise<void> {
        logger.info('Clicking "Save"');
        await this.clickWhenReady(this.btnSave);

        // Saving navigates back from the toggle screen to the wallet list;
        // wait for that screen to unmount before the caller reads the list
        // (via waitForWalletCount, which confirms the list itself updated).
        await this.btnSave.waitForExist({ reverse: true });
    }
}

export default new WalletManagementPage();

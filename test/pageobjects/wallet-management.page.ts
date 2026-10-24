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
 * page the app lands on right after onboarding.
 */
class WalletManagementPage extends BasePage {
    // Targets the avatar itself rather than the wider wallet-picker section:
    // that section also contains a "copy address" button, and a real mouse
    // click at the section's bounding-box center can land on it instead.
    public get avatarWalletPicker() {
        return $('[data-testid="wallet-picker-avatar"]');
    }

    // The "arrow icon next to the RECOVERY PHRASE label" from the written
    // steps is this options (kebab) button, not the separate chevron that
    // only expands/collapses the list in place — see README.
    public get recoveryPhraseOptionsButton() {
        return $('[data-testid="icon-btn-wallet-section-options"]');
    }

    public get btnShowOrHideWallets() {
        return $('[data-testid="li-recovery-phrase-show-or-hide"]');
    }

    public get btnSave() {
        return $('[data-testid="btn-save"]');
    }

    // Wallet rows rendered under "Recovery phrase" in the "My wallets" panel.
    // Scoped to the stable testid prefix rather than a page-wide selector;
    // see the WALLET_ROW_TESTID_PREFIX comment above for why positional
    // matching is still required on top of that.
    public get walletListItems() {
        return $$(`[data-testid^="${WALLET_ROW_TESTID_PREFIX}"]`);
    }

    // Visibility toggles on the "Show or hide wallets" screen. Scoped to the
    // stable testid prefix (rather than the page-wide [role="switch"]) so
    // this can't accidentally match an unrelated switch control elsewhere
    // on the screen. Same positional-matching constraint as walletListItems.
    public get walletToggles() {
        return $$(`[data-testid^="${WALLET_TOGGLE_TESTID_PREFIX}"]`);
    }

    public async openWalletManagement(): Promise<void> {
        logger.info('Opening wallet management via the header avatar');
        await this.clickWhenReady(this.avatarWalletPicker);
    }

    public async isMainWalletDisplayed(): Promise<boolean> {
        const firstWallet = this.walletListItems[0];
        await firstWallet.waitForDisplayed();
        const isDisplayed = (await firstWallet.getText()).includes('Main Wallet');
        logger.info(`Checked "Main Wallet" is displayed: ${isDisplayed}`);
        return isDisplayed;
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

    public async openShowOrHideWallets(): Promise<void> {
        logger.info('Opening the recovery phrase options menu');
        await this.clickWhenReady(this.recoveryPhraseOptionsButton);

        logger.info('Clicking "Show or hide wallets"');
        await this.clickWhenReady(this.btnShowOrHideWallets);
    }

    public async isFirstToggleDisabled(): Promise<boolean> {
        const firstToggle = this.walletToggles[0];
        await firstToggle.waitForDisplayed();
        const isDisabled = !(await firstToggle.isEnabled());
        logger.info(`Checked first wallet toggle is disabled: ${isDisabled}`);
        return isDisabled;
    }

    public async isFirstToggleOn(): Promise<boolean> {
        const firstToggle = this.walletToggles[0];
        await firstToggle.waitForDisplayed();
        const isOn = (await firstToggle.getAttribute('data-state')) === 'checked';
        logger.info(`Checked first wallet toggle is on: ${isOn}`);
        return isOn;
    }

    /**
     * Resolves the toggle at a 1-based list position, re-querying the DOM
     * fresh rather than reusing a previously-fetched list. Toggling one
     * wallet can re-render the list (the toggled row may re-sort, for
     * instance), so indexing into a stale snapshot risks acting on the
     * wrong wallet for a later position.
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
     * Toggles on the wallets at the given 1-based list positions, matching
     * the "select the 3rd and 4th list item" wording in the test steps, and
     * returns each selected wallet's public key (read from its toggle's
     * testid before clicking) so the caller can assert on wallet identity
     * later rather than just a count.
     */
    public async selectWalletsAtPositions(positions: number[]): Promise<string[]> {
        const publicKeys: string[] = [];
        for (const position of positions) {
            const toggle = await this.getToggleAtPosition(position);
            const testId = await toggle.getAttribute('data-testid');
            const publicKey = publicKeyFromTestId(testId, WALLET_TOGGLE_TESTID_PREFIX);
            publicKeys.push(publicKey);
            logger.info(`Toggling on wallet at position ${position} (${publicKey})`);
            await this.clickWhenReady(toggle);
        }
        return publicKeys;
    }

    public async save(): Promise<void> {
        logger.info('Clicking "Save"');
        await this.clickWhenReady(this.btnSave);

        // Saving navigates back from the toggle screen to the wallet list;
        // wait for that screen to unmount, then for the wallet list to
        // actually render, so callers never read it mid-transition.
        await this.btnSave.waitForExist({ reverse: true });
        await this.walletListItems[0].waitForDisplayed();
    }
}

export default new WalletManagementPage();

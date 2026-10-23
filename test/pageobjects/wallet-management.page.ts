import BasePage from './base.page.ts';

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
    // Each row's data-testid is suffixed with that wallet's public key,
    // which is generated fresh on every run, so rows are matched by
    // position rather than by a fixed testid.
    public get walletListItems() {
        return $$('[data-testid^="li-wallets-"]');
    }

    // Visibility toggles on the "Show or hide wallets" screen. Same
    // positional-matching constraint as walletListItems above.
    public get walletToggles() {
        return $$('[role="switch"]');
    }

    public async openWalletManagement(): Promise<void> {
        await this.avatarWalletPicker.waitForClickable();
        await this.avatarWalletPicker.click();
    }

    public async isMainWalletDisplayed(): Promise<boolean> {
        const firstWallet = this.walletListItems[0];
        await firstWallet.waitForDisplayed();
        return (await firstWallet.getText()).includes('Main Wallet');
    }

    public async openShowOrHideWallets(): Promise<void> {
        await this.recoveryPhraseOptionsButton.waitForClickable();
        await this.recoveryPhraseOptionsButton.click();

        await this.btnShowOrHideWallets.waitForClickable();
        await this.btnShowOrHideWallets.click();
    }

    public async isFirstToggleDisabled(): Promise<boolean> {
        const firstToggle = this.walletToggles[0];
        await firstToggle.waitForDisplayed();
        return !(await firstToggle.isEnabled());
    }

    public async isFirstToggleOn(): Promise<boolean> {
        const firstToggle = this.walletToggles[0];
        return (await firstToggle.getAttribute('data-state')) === 'checked';
    }

    /**
     * Toggles on the wallets at the given 1-based list positions, matching
     * the "select the 3rd and 4th list item" wording in the test steps.
     */
    public async selectWalletsAtPositions(positions: number[]): Promise<void> {
        const toggles = this.walletToggles;
        for (const position of positions) {
            await toggles[position - 1].click();
        }
    }

    public async save(): Promise<void> {
        await this.btnSave.waitForClickable();
        await this.btnSave.click();

        // Saving navigates back from the toggle screen to the wallet list;
        // wait for that screen to unmount so the list isn't read mid-transition.
        await this.btnSave.waitForExist({ reverse: true });
    }

    public async getWalletNames(): Promise<string[]> {
        const items = await this.walletListItems;
        const names: string[] = [];
        for (const item of items) {
            names.push(await item.getText());
        }
        return names;
    }
}

export default new WalletManagementPage();

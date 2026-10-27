import { expect } from '@wdio/globals';
import onboardingPage from '../pageobjects/onboarding.page.ts';
import walletManagementPage from '../pageobjects/wallet-management.page.ts';

// Overridable so CI/other machines don't need to share a hardcoded secret;
// this is a throwaway password for a freshly created test wallet, not a
// real credential, so a committed default is safe.
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'Wdio-Test-Password-1!';

describe('Wallet onboarding', () => {
    it('adds two wallets to the recovery phrase and lists them alongside the original wallet', async () => {
        await onboardingPage.open();
        await onboardingPage.startWalletCreation();
        await onboardingPage.setPassword(TEST_PASSWORD);
        await onboardingPage.acceptTerms();
        await expect(onboardingPage.checkboxTermsAccepted).toBeSelected();
        await onboardingPage.clickContinue();

        await walletManagementPage.openWalletManagement();
        await expect(walletManagementPage.firstWalletListItem).toBeDisplayed();
        await expect(walletManagementPage.firstWalletListItem).toHaveText('Main Wallet', { containing: true });
        const [mainWalletPublicKey] = await walletManagementPage.getWalletPublicKeys();

        await walletManagementPage.openShowOrHideWallets();
        await expect(walletManagementPage.firstWalletToggle).toBeDisabled();
        await expect(walletManagementPage.firstWalletToggle).toHaveAttribute('aria-checked', 'true');

        const selectedPublicKeys = await walletManagementPage.selectWalletsAtPositions([3, 4]);
        for (const publicKey of selectedPublicKeys) {
            // Re-located by full testid rather than reusing the element
            // captured before the click: toggling one wallet can re-render
            // the list, which would invalidate a stale element reference.
            await expect(walletManagementPage.getToggleByPublicKey(publicKey)).toHaveAttribute(
                'aria-checked',
                'true'
            );
        }

        await walletManagementPage.save();
        await walletManagementPage.waitForWalletCount(1 + selectedPublicKeys.length);

        // The recovery phrase list must contain exactly the original wallet
        // plus the two newly selected ones — not just the right count.
        const finalPublicKeys = await walletManagementPage.getWalletPublicKeys();
        expect(finalPublicKeys.sort()).toEqual([mainWalletPublicKey, ...selectedPublicKeys].sort());
    });
});

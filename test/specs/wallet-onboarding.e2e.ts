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
        await onboardingPage.clickContinue();

        await walletManagementPage.openWalletManagement();
        expect(await walletManagementPage.isMainWalletDisplayed()).toBe(true);

        await walletManagementPage.openShowOrHideWallets();
        expect(await walletManagementPage.isFirstToggleDisabled()).toBe(true);
        expect(await walletManagementPage.isFirstToggleOn()).toBe(true);

        await walletManagementPage.selectWalletsAtPositions([3, 4]);
        await walletManagementPage.save();

        // Original wallet plus the two newly added ones.
        const walletNames = await walletManagementPage.getWalletNames();
        expect(walletNames).toHaveLength(3);
        expect(walletNames[0]).toContain('Main Wallet');
    });
});

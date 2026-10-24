import BasePage from './base.page.ts';
import { logger } from '../utils/logger.ts';

/**
 * Wallet creation flow served at /onboard.
 *
 * Only models what this suite drives: starting wallet creation, setting a
 * password, accepting the terms, and continuing into the app. Note that the
 * live flow inserts a "Create new wallet / Continue with Google" screen
 * between "Get started" and the password step; this isn't mentioned in the
 * written test steps but is required to reach the password fields (see
 * README for the full list of deviations from the written steps).
 */
class OnboardingPage extends BasePage {
    public get btnGetStarted() {
        return $('[data-testid="btn-get-started"]');
    }

    public get btnCreateNewWallet() {
        return $('[data-testid="btn-manual-create"]');
    }

    public get inputNewPassword() {
        return $('[data-testid="input-new-password"]');
    }

    public get inputRepeatPassword() {
        return $('[data-testid="input-repeat-password"]');
    }

    // No data-testid is exposed on the checkbox; `name` is the most stable
    // attribute available, as its CSS classes are generated.
    public get checkboxTermsAccepted() {
        return $('input[name="termsAccepted"]');
    }

    public get btnContinue() {
        return $('[data-testid="btn-continue"]');
    }

    public async open(): Promise<void> {
        logger.info('Opening the onboarding page (/onboard)');
        await super.open('/onboard');
    }

    /**
     * Clicks through "Get started" and the intermediate "Create new wallet"
     * choice, landing on the set-a-password screen.
     */
    public async startWalletCreation(): Promise<void> {
        logger.info('Clicking "Get started"');
        await this.btnGetStarted.waitForClickable();
        await this.btnGetStarted.click();

        logger.info('Clicking "Create new wallet"');
        await this.btnCreateNewWallet.waitForClickable();
        await this.btnCreateNewWallet.click();
    }

    public async setPassword(password: string): Promise<void> {
        logger.info('Entering password into both password fields');
        await this.inputNewPassword.waitForDisplayed();
        await this.inputNewPassword.setValue(password);
        await this.inputRepeatPassword.setValue(password);
    }

    /**
     * The native checkbox renders as a visually-hidden 1x1px accessibility
     * target with the visible box drawn by its wrapping <label>, so the
     * label (the surface a real user clicks) is what gets clicked here.
     */
    public async acceptTerms(): Promise<void> {
        logger.info('Accepting the Terms of Service and Privacy Policy');
        await this.checkboxTermsAccepted.waitForExist();
        const checkbox = await this.checkboxTermsAccepted;
        await browser.execute(
            (el) => (el as HTMLElement).closest('label')?.click(),
            checkbox
        );
    }

    public async clickContinue(): Promise<void> {
        logger.info('Clicking "Continue"');
        await this.btnContinue.waitForClickable();
        await this.btnContinue.click();
    }
}

export default new OnboardingPage();

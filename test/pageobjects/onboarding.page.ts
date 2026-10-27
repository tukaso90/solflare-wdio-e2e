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
    private get btnGetStarted() {
        return $('[data-testid="btn-get-started"]');
    }

    private get btnCreateNewWallet() {
        return $('[data-testid="btn-manual-create"]');
    }

    private get inputNewPassword() {
        return $('[data-testid="input-new-password"]');
    }

    private get inputRepeatPassword() {
        return $('[data-testid="input-repeat-password"]');
    }

    // No data-testid is exposed on the checkbox; `name` is the most stable
    // attribute available, as its CSS classes are generated.
    public get checkboxTermsAccepted() {
        return $('input[name="termsAccepted"]');
    }

    // The checkbox's visible click target is a wrapping <label> sized to
    // the checkbox box itself (24x24px) — the input is a 1x1px
    // accessibility target with no visible box of its own. That inner
    // label is itself nested inside a second, outer <label> spanning the
    // whole "I agree to the Terms of Service and Privacy Policy." row
    // (which also wraps the two links), so a plain `ancestor::label` match
    // is ambiguous: it resolves to both. This XPath isolates the inner one
    // by selecting the ancestor label that itself contains no nested label.
    private get labelTermsAccepted() {
        return $('//input[@name="termsAccepted"]/ancestor::label[not(.//label)]');
    }

    private get btnContinue() {
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
        await this.clickWhenReady(this.btnGetStarted);

        logger.info('Clicking "Create new wallet"');
        await this.clickWhenReady(this.btnCreateNewWallet);
    }

    public async setPassword(password: string): Promise<void> {
        logger.info('Entering password into both password fields');
        await this.inputNewPassword.waitForDisplayed();
        await this.inputNewPassword.setValue(password);
        await this.inputRepeatPassword.setValue(password);
    }

    /**
     * Clicks the checkbox's wrapping <label> rather than the checkbox
     * itself — the input is a 1x1px accessibility target, so a real user
     * clicks the visible label instead. See labelTermsAccepted above for
     * why it's resolved via XPath rather than the checkbox's own selector.
     */
    public async acceptTerms(): Promise<void> {
        logger.info('Accepting the Terms of Service and Privacy Policy');
        await this.clickWhenReady(this.labelTermsAccepted);
    }

    public async clickContinue(): Promise<void> {
        logger.info('Clicking "Continue"');
        await this.clickWhenReady(this.btnContinue);
    }
}

export default new OnboardingPage();

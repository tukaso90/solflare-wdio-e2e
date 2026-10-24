import type { ChainablePromiseElement } from 'webdriverio';

/**
 * Common ancestor for every page object in this suite.
 *
 * Keeps navigation in one place so individual page objects only need to
 * describe their own elements and the actions a test performs on them.
 */
export default abstract class BasePage {
    /**
     * Opens the given path relative to `baseUrl` (configured in wdio.conf.ts).
     */
    public async open(path: string): Promise<void> {
        await browser.url(path);
    }

    /**
     * Waits for an element to be clickable, then clicks it. Shared because
     * nearly every action in this suite's page objects is this exact pair.
     * Accepts both a `$()` getter directly and an already-resolved element
     * (e.g. one previously fetched to read an attribute off of first) —
     * both expose the same waitForClickable/click commands at runtime, but
     * their types don't unify cleanly, hence the two overloads.
     */
    protected async clickWhenReady(element: ChainablePromiseElement): Promise<void>;
    protected async clickWhenReady(element: WebdriverIO.Element): Promise<void>;
    protected async clickWhenReady(element: ChainablePromiseElement | WebdriverIO.Element): Promise<void> {
        const target = element as WebdriverIO.Element;
        await target.waitForClickable();
        await target.click();
    }
}

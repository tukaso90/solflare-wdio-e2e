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
}

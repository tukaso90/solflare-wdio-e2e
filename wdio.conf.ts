import { captureFailureScreenshot } from './test/utils/screenshot.ts';
import { logger } from './test/utils/logger.ts';

type SupportedBrowser = 'chrome' | 'firefox';

const SUPPORTED_BROWSERS: SupportedBrowser[] = ['chrome', 'firefox'];

// Selected via `BROWSER=chrome|firefox` and `HEADLESS=true`, e.g.
// `BROWSER=firefox HEADLESS=true npm test` (see package.json for the
// matching npm run shortcuts). Both default to a headed Chrome run.
function resolveBrowserName(): SupportedBrowser {
    const requested = (process.env.BROWSER ?? 'chrome').trim().toLowerCase();
    if (!SUPPORTED_BROWSERS.includes(requested as SupportedBrowser)) {
        throw new Error(
            `Unsupported BROWSER "${requested}". Supported values: ${SUPPORTED_BROWSERS.join(', ')}.`
        );
    }
    return requested as SupportedBrowser;
}

// Stricter than a plain `=== 'true'` check so a typo (e.g. `HEADLESS=1`)
// fails loudly instead of silently running headed.
function resolveHeadless(): boolean {
    const requested = (process.env.HEADLESS ?? 'false').trim().toLowerCase();
    if (requested !== 'true' && requested !== 'false') {
        throw new Error(`Unsupported HEADLESS "${requested}". Supported values: true, false.`);
    }
    return requested === 'true';
}

function buildCapabilities(browserName: SupportedBrowser, headless: boolean): WebdriverIO.Capabilities[] {
    if (browserName === 'firefox') {
        return [
            {
                browserName: 'firefox',
                'moz:firefoxOptions': {
                    args: headless ? ['-headless'] : []
                }
            }
        ];
    }

    return [
        {
            browserName: 'chrome',
            'goog:chromeOptions': {
                // --headless=new matches modern Chrome's headed rendering
                // path, which this app (canvas-heavy wallet UI) relies on.
                // Window size is pinned separately in the `before` hook below.
                // NOTE: Solflare's bot protection currently blocks sessions
                // launched with --headless=new specifically — see README.
                args: headless ? ['--headless=new'] : []
            }
        }
    ];
}

const browserName = resolveBrowserName();
const headless = resolveHeadless();

export const config: WebdriverIO.Config = {
    //
    // ====================
    // Runner Configuration
    // ====================
    runner: 'local',
    tsConfigPath: './tsconfig.json',

    //
    // ==================
    // Specify Test Files
    // ==================
    specs: ['./test/specs/**/*.e2e.ts'],
    exclude: [],

    //
    // ============
    // Capabilities
    // ============
    maxInstances: 1,
    capabilities: buildCapabilities(browserName, headless),

    //
    // ===================
    // Test Configurations
    // ===================
    logLevel: 'info',
    bail: 0,

    // Shortens url() calls in page objects/tests to relative paths.
    baseUrl: 'https://solflare.com',

    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    framework: 'mocha',
    reporters: ['spec'],

    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },

    onPrepare: function () {
        logger.info(`Starting test run — browser: ${browserName}, headless: ${headless}`);
    },

    // Firefox and Chrome open headed windows at different default sizes on
    // this machine, and the app's layout responds to viewport width. Pin a
    // consistent size so both browsers (and any other machine) exercise the
    // same layout.
    before: async function () {
        await browser.setWindowSize(1600, 1000);
    },

    // Generic screenshot-on-failure hook: fires for every spec, independent
    // of which test/page object is running.
    afterTest: async function (test, _context, { passed }) {
        if (!passed) {
            await captureFailureScreenshot(test.title);
        }
    }
};

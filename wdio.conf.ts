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
    // Chrome only for now. Firefox + the headless/BROWSER env toggle are added
    // in a later phase once the happy-path test is proven out in one browser.
    maxInstances: 1,
    capabilities: [
        {
            browserName: 'chrome'
        }
    ],

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
    }
};

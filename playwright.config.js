const { defineConfig, devices } = require('@playwright/test');

const baseURL = (process.env.BASE_URL || 'http://127.0.0.1:4183').replace(/\/+$/, '') + '/';
const isRemoteRun = Boolean(process.env.BASE_URL);

module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    expect: {
        timeout: 5_000,
    },
    fullyParallel: false,
    workers: 1,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['json', { outputFile: 'artifacts/results.json' }],
    ],
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: isRemoteRun
        ? undefined
        : {
              command: 'node server.js',
              url: 'http://127.0.0.1:4183',
              reuseExistingServer: !process.env.CI,
              timeout: 30_000,
          },
});

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { logger } from './logger.ts';

const screenshotsDir = path.join(process.cwd(), 'screenshots');

function timestampForFilename(): string {
    // Colons aren't valid in filenames on Windows, so swap them (and the
    // dot before milliseconds) out of the ISO timestamp.
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function slugify(text: string): string {
    return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Generic failure-screenshot capture, intended to be called from a test
 * framework's afterTest-style hook. Saves a timestamped PNG under
 * screenshots/ named after the failing test, and logs where it went.
 */
export async function captureFailureScreenshot(testTitle: string): Promise<void> {
    mkdirSync(screenshotsDir, { recursive: true });

    const fileName = `${slugify(testTitle)}-${timestampForFilename()}.png`;
    const filePath = path.join(screenshotsDir, fileName);

    await browser.saveScreenshot(filePath);
    logger.info(`Saved failure screenshot: ${filePath}`);
}

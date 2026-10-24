import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createLogger, format, transports } from 'winston';

// winston's File transport doesn't create its parent directory, so
// ensure it exists before the transport is wired up below.
const logsDir = path.join(process.cwd(), 'logs');
mkdirSync(logsDir, { recursive: true });

/**
 * Shared logger for page object actions and test-run diagnostics.
 *
 * Writes to the console (for live test runs) and to logs/test.log (so a
 * reviewer or CI run can inspect what happened after the fact).
 */
export const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: path.join(logsDir, 'test.log') })
    ]
});

import { Logger } from '../src/logger';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('Logger', () => {
  let tmpDir: string;

  beforeAll(() => {
    // Create a temporary directory so all log files land here
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vicky-logger-test-'));
    process.chdir(tmpDir);
  });

  afterAll(() => {
    // Clean up: delete the temp folder recursively
    process.chdir(__dirname);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('creates a log file and writes INFO/WARN/ERROR lines', () => {
    const runId = 'unit-test';
    const logger = new Logger(runId);

    // The logger path should exist immediately
    const logPath = logger.path;
    expect(fs.existsSync(logPath)).toBe(true);

    // Write a few log lines
    logger.info('Hello world');
    logger.warn('This is a warning');
    logger.error('Serious error');

    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.trim().split(/\r?\n/);
    expect(lines.length).toBe(3);

    expect(lines[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T.*\] INFO: Hello world/);
    expect(lines[1]).toMatch(/\[\d{4}-\d{2}-\d{2}T.*\] WARN: This is a warning/);
    expect(lines[2]).toMatch(/\[\d{4}-\d{2}-\d{2}T.*\] ERROR: Serious error/);
  });
});

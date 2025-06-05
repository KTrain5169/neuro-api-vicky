import { runTest } from '../src/runner';
import { Logger } from '../src/logger';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.mock('child_process');

describe('runTest()', () => {
  let tmpDir: string;
  let logger: Logger;
  let runId: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vicky-runner-test-'));
    process.chdir(tmpDir);
    runId = 'runner-test';
    logger = new Logger(runId);
  });

  afterAll(() => {
    process.chdir(__dirname);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  test('resolves success when spawn exits with code 0', async () => {
    const mockChild = {
      on: jest.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') {
          process.nextTick(() => cb(0));
        }
        return mockChild;
      }),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    };
    (child_process.spawn as jest.Mock).mockReturnValue(mockChild);

    const result = await runTest('node', 'someTestFile.js', logger);
    expect(result.success).toBe(true);
    expect(typeof result.durationMs).toBe('number');

    const content = fs.readFileSync(logger.path, 'utf8');
    expect(content).toMatch(/Test process succeeded in \d+ ms/);
  });

  test('resolves failure when spawn exits with nonzero code', async () => {
    // Simulate exit code 42
    const mockChild = {
      on: jest.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') {
          process.nextTick(() => cb(42));
        }
        return mockChild;
      }),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    };
    (child_process.spawn as jest.Mock).mockReturnValue(mockChild);

    const result = await runTest('python', 'fakeTest.py', logger);
    expect(result.success).toBe(false);
    expect(typeof result.durationMs).toBe('number');

    const content = fs.readFileSync(logger.path, 'utf8');
    expect(content).toMatch(/Test process exited with code 42/);
  });

  test('handles spawn error event', async () => {
    // Simulate an error in spawning
    const mockChild = {
      on: jest.fn((event: string, cb: (arg: any) => void) => {
        if (event === 'error') {
          process.nextTick(() => cb(new Error('spawn failed')));
        }
        return mockChild;
      }),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    };
    (child_process.spawn as jest.Mock).mockReturnValue(mockChild);

    const result = await runTest('doesNotExist', 'noFile.js', logger);
    expect(result.success).toBe(false);
    expect(typeof result.durationMs).toBe('number');

    const content = fs.readFileSync(logger.path, 'utf8');
    expect(content).toMatch(/Failed to spawn test process: Error: spawn failed/);
  });
});

import * as core from '@actions/core'
import { runRandy } from './simulators/randy.js';
import { runJippity } from './simulators/jippity.js';

export async function run(): Promise<void> {
  try {
    const simulator = core.getInput('simulator');
    const version = core.getInput('version');
    const runFile = core.getInput('run-file');
    const actionsCount = parseInt(core.getInput('actions-count'), 10);

    if (simulator === 'Randy') {
      await runRandy(version, runFile, actionsCount);
    } else if (simulator === 'Jippity') {
      await runJippity(version, runFile, actionsCount);
    } else {
      core.setFailed(`Unsupported simulator: ${simulator}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();

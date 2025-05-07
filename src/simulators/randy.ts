import * as core from '@actions/core';
import { exec } from 'child_process';
import { promisify } from 'util';
import WebSocket from 'ws';

const execAsync = promisify(exec);

export async function runRandy(version: string, runFile: string, actionsCount: number): Promise<void> {
  const repoUrl = 'https://github.com/VedalAI/neuro-game-sdk.git';
  const subdirectory = 'Randy';

  // Clone the repository
  await execAsync(`git clone --branch ${version} ${repoUrl} randy-simulator`);
  core.info('Cloned Randy simulator repository.');

  // Navigate to the subdirectory
  const simulatorPath = `randy-simulator/${subdirectory}`;

  // Install dependencies and start the server
  await execAsync('npm install', { cwd: simulatorPath });
  core.info('Installed dependencies.');

  const serverProcess = exec(`node ${runFile}`, { cwd: simulatorPath });
  core.info('Started Randy simulator server.');

  // Connect to WebSocket
  const ws = new WebSocket('ws://localhost:8080');
  let messageCount = 0;

  ws.on('message', () => {
    messageCount++;
    if (messageCount > actionsCount) {
      core.info('Message count exceeded actions-count. Exiting...');
      ws.close();
      serverProcess.kill();
      core.setOutput('observed_message_count', messageCount);
    }
  });

  ws.on('open', async () => {
    core.info('Connected to Randy WebSocket server.');

    // Execute the command in runFile
    try {
      await execAsync(`node ${runFile}`, { cwd: simulatorPath });
      core.info(`Executed command from runFile: ${runFile}`);
    } catch (error) {
      core.setFailed(`Failed to execute runFile command: ${error}`);
      serverProcess.kill();
      ws.close();
    }
  });

  ws.on('error', (err) => {
    core.setFailed(`WebSocket error: ${err.message}`);
    serverProcess.kill();
  });
}
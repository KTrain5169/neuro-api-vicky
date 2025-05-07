import * as core from '@actions/core';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';
import WebSocket from 'ws';

const execAsync = promisify(exec);

export async function runJippity(version: string, runFile: string, actionsCount: number): Promise<void> {
  const repoUrl = 'https://github.com/EnterpriseScratchDev/neuro-api-jippity.git';
  const subdirectory = 'backend';

  // Clone the repository
  await execAsync(`git clone --branch ${version} ${repoUrl} jippity-simulator`);
  core.info('Cloned Jippity simulator repository.');

  // Navigate to the subdirectory
  const simulatorPath = `jippity-simulator/${subdirectory}`;

  // Write the OpenAI API key to the .env file
  const apiKey = core.getInput('jippity-api-key');
  const aiModel = core.getInput('jippity-ai-model');
  if (!apiKey) {
    core.setFailed('Jippity requires an OpenAI API key, but none was provided.');
    return;
  }
  const envContent = `OPENAI_API_KEY=${apiKey}\nOPENAI_MODEL=${aiModel}`;
  await writeFile(`${simulatorPath}/.env`, envContent);
  core.info('Wrote OpenAI API key & OpenAI model to .env file.');

  // Install dependencies and start the server
  await execAsync('npm install', { cwd: simulatorPath });
  core.info('Installed dependencies.');

  const serverProcess = exec(`npm start`, { cwd: simulatorPath });
  core.info('Started Jippity simulator server.');

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
    core.info('Connected to Jippity WebSocket server.');

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
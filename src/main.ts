import * as core from '@actions/core'
import * as fs from 'fs'
import { Logger, Store } from './logger.js'
import { startServer, stopServer, PacketList } from './server.js'
import { runTest } from './runner.js'

export async function run() {
  try {
    // 1) Read inputs
    const portInput = core.getInput('port')
    const port = parseInt(portInput, 10) || 8080

    const testFile = core.getInput('testFile')
    const runner = core.getInput('runner')
    const packetListPath = core.getInput('packet-list')

    const runId = process.env.GITHUB_RUN_ID || 'local'
    const logger = new Logger(runId)
    const store = new Store(runId)

    console.log('🏁 Inputs:', {
      port,
      testFile,
      runner,
      packetListPath
    })

    // 2) Load packet list JSON if provided
    let packetList: PacketList | null = null
    if (packetListPath && packetListPath.trim().length > 0) {
      if (!fs.existsSync(packetListPath)) {
        logger.error(`Packet list file not found: ${packetListPath}`)
        core.setFailed(`Packet list file not found: ${packetListPath}`)
        return
      }
      try {
        const raw = fs.readFileSync(packetListPath, 'utf8')
        packetList = JSON.parse(raw) as PacketList
      } catch (e: any) {
        logger.error(`Error parsing packet list JSON: ${e}`)
        core.setFailed(`Error parsing packet list JSON: ${e}`)
        return
      }
    }

    // 3) Start WS server
    const wss = startServer(port, logger, packetList)
    core.setOutput('log', logger.path)
    core.setOutput('context-store', store.contextPath)
    core.setOutput('actions-store', store.actionsPath)

    // 4) Run the test process
    const { success, durationMs } = await runTest(runner, testFile, logger)

    // 5) Stop WS server (give clients time to disconnect)
    stopServer(wss, logger)

    // 6) Set outputs
    core.setOutput('success', success.toString())
    core.setOutput('time', durationMs.toString())

    if (!success) {
      core.setFailed('Test run failed; see log for details.')
    }
  } catch (err: any) {
    core.setFailed(err.message)
  }
}

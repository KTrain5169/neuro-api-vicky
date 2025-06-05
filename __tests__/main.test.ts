import { run } from '../src/main'
import * as core from '@actions/core'
import * as fs from 'fs'
import { Logger } from '../src/logger'
import * as serverModule from '../src/server'
import * as runnerModule from '../src/runner'

jest.mock('@actions/core')
jest.mock('../src/server')
jest.mock('../src/runner')

describe('main.run()', () => {
  const fakeWss = { some: 'dummy' }
  let existsSyncMock: jest.SpyInstance

  beforeEach(() => {
    jest.resetAllMocks()
    existsSyncMock = jest.spyOn(fs, 'existsSync').mockImplementation(() => true)
    delete process.env.GITHUB_RUN_ID
  })

  afterEach(() => {
    existsSyncMock.mockRestore()
  })

  test('A) No packet-list provided: server starts, runTest succeeds, outputs set', async () => {
    ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
      switch (name) {
        case 'port':
          return '3000'
        case 'testFile':
          return 'test-file.js'
        case 'runner':
          return 'node'
        case 'packet-list':
          return ''
        default:
          return ''
      }
    })
    ;(serverModule.startServer as jest.Mock).mockReturnValue(fakeWss)
    ;(serverModule.stopServer as jest.Mock).mockImplementation(() => {})
    ;(runnerModule.runTest as jest.Mock).mockResolvedValue({
      success: true,
      durationMs: 123
    })

    await run()

    expect(serverModule.startServer).toHaveBeenCalledTimes(1)
    const [portArg, loggerArg, packetListArg] = (
      serverModule.startServer as jest.Mock
    ).mock.calls[0]
    expect(portArg).toBe(3000)
    expect(loggerArg).toBeInstanceOf(Logger)
    expect(packetListArg).toBeNull()

    expect(core.setOutput).toHaveBeenCalledWith('log', expect.any(String))
    expect(runnerModule.runTest).toHaveBeenCalledWith(
      'node',
      'test-file.js',
      loggerArg
    )
    expect(serverModule.stopServer).toHaveBeenCalledWith(fakeWss, loggerArg)
    expect(core.setOutput).toHaveBeenCalledWith('success', 'true')
    expect(core.setOutput).toHaveBeenCalledWith('time', '123')
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  test('B) packet-list provided but file does NOT exist → setFailed called early', async () => {
    ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
      switch (name) {
        case 'port':
          return '4000'
        case 'testFile':
          return 'ignore.js'
        case 'runner':
          return 'node'
        case 'packet-list':
          return 'nonexistent.json'
        default:
          return ''
      }
    })

    existsSyncMock.mockImplementation(
      (p: any) => p.toString() !== 'nonexistent.json'
    )
    ;(serverModule.startServer as jest.Mock).mockClear()
    ;(runnerModule.runTest as jest.Mock).mockClear()
    ;(serverModule.stopServer as jest.Mock).mockClear()

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      'Packet list file not found: nonexistent.json'
    )
    expect(serverModule.startServer).not.toHaveBeenCalled()
    expect(runnerModule.runTest).not.toHaveBeenCalled()
    expect(serverModule.stopServer).not.toHaveBeenCalled()
  })

  test('C) packet-list provided but invalid JSON → setFailed called with parse error', async () => {
    ;(core.getInput as jest.Mock).mockImplementation((name: string) => {
      switch (name) {
        case 'port':
          return '5000'
        case 'testFile':
          return 'ignore2.js'
        case 'runner':
          return 'node'
        case 'packet-list':
          return 'bad.json'
        default:
          return ''
      }
    })

    existsSyncMock.mockImplementation((p: any) => p.toString() === 'bad.json')

    const readMock = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation((p: any) =>
        p.toString() === 'bad.json' ? '{ invalid JSON ' : ''
      )

    ;(serverModule.startServer as jest.Mock).mockClear()
    ;(runnerModule.runTest as jest.Mock).mockClear()
    ;(serverModule.stopServer as jest.Mock).mockClear()

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringMatching(/^Error parsing packet list JSON:/)
    )
    expect(serverModule.startServer).not.toHaveBeenCalled()
    expect(runnerModule.runTest).not.toHaveBeenCalled()
    expect(serverModule.stopServer).not.toHaveBeenCalled()

    readMock.mockRestore()
  })
})

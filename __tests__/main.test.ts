/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

let run: () => Promise<void>
beforeAll(async () => {
  const mainModule = await import('../src/main.js')
  run = mainModule.run
})

describe('main.ts', () => {
  beforeEach(() => {
    jest.spyOn(core, 'getInput').mockImplementation(() => '500')
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('Sets the time output', async () => {
    await run()
    expect(core.setOutput).toHaveBeenNthCalledWith(
      1,
      'time',
      expect.stringMatching(/^\d{2}:\d{2}:\d{2}/)
    )
  })

  it('Sets a failed status', async () => {
    jest.spyOn(core, 'getInput').mockImplementationOnce(() => 'this is not a number')
    await run()
    expect(core.setFailed).toHaveBeenNthCalledWith(1, 'milliseconds is not a number')
  })
})
import { getFormattedTimestamp, logOutput } from '../src/utils'

describe('Utils', () => {
  test('getFormattedTimestamp returns valid format', () => {
    const ts = getFormattedTimestamp()
    // Expect format like: 2025-05-10-15-30-20+? (simple regex)
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}[+-]\d+$/)
  })

  test('logOutput writes to log file using fs.appendFileSync', () => {
    const spy = jest.spyOn(require('fs'), 'appendFileSync').mockImplementation(() => {})
    logOutput('TEST', 'This is a test message')
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/^vicky-/),
      expect.stringContaining('[TEST] This is a test message')
    )
    spy.mockRestore()
  })
})
import type * as core from '@actions/core'
import { jest } from '@jest/globals'

export const debug: typeof core.debug = jest.fn();
export const error: typeof core.error = jest.fn();
export const info: typeof core.info = jest.fn();
export const getInput: typeof core.getInput = jest.fn<(name: string, options?: core.InputOptions) => string>();
export const setOutput: typeof core.setOutput = jest.fn();
export const setFailed: typeof core.setFailed = jest.fn();
export const warning: typeof core.warning = jest.fn();

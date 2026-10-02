/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { execFileMock, clipboardyMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
  clipboardyMock: {
    read: vi.fn(),
    write: vi.fn(),
  },
}));

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, execFile: execFileMock };
});

vi.mock('clipboardy', () => ({
  default: clipboardyMock,
}));

import {
  isTermuxEnvironment,
  readClipboard,
  writeClipboard,
} from './clipboard.js';

const ORIGINAL_PLATFORM = Object.getOwnPropertyDescriptor(process, 'platform');

const setPlatform = (value: string) => {
  Object.defineProperty(process, 'platform', { value });
};

const clearTermuxEnv = () => {
  delete process.env['TERMUX_VERSION'];
  delete process.env['PREFIX'];
  delete process.env['HOME'];
};

describe('clipboard (Termux-safe wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTermuxEnv();
    setPlatform('linux');
  });

  afterEach(() => {
    clearTermuxEnv();
    if (ORIGINAL_PLATFORM) {
      Object.defineProperty(process, 'platform', ORIGINAL_PLATFORM);
    }
  });

  describe('isTermuxEnvironment', () => {
    it('is false on a regular Linux desktop', () => {
      expect(isTermuxEnvironment()).toBe(false);
    });

    it('is true when process.platform is android', () => {
      setPlatform('android');
      expect(isTermuxEnvironment()).toBe(true);
    });

    it('is true when TERMUX_VERSION is set even if platform is linux', () => {
      process.env['TERMUX_VERSION'] = '0.118.0';
      expect(isTermuxEnvironment()).toBe(true);
    });

    it('is true when PREFIX points into the Termux app dir', () => {
      process.env['PREFIX'] = '/data/data/com.termux/files/usr';
      expect(isTermuxEnvironment()).toBe(true);
    });

    it('is true when HOME points into the Termux app dir', () => {
      process.env['HOME'] = '/data/data/com.termux/files/home';
      expect(isTermuxEnvironment()).toBe(true);
    });
  });

  describe('on Termux', () => {
    beforeEach(() => {
      setPlatform('android');
    });

    it('reads the clipboard via termux-clipboard-get', async () => {
      execFileMock.mockImplementation(
        (_cmd: string, _args: string[], _opts: unknown, cb: Function) =>
          cb(null, { stdout: 'pasted text' }),
      );
      await expect(readClipboard()).resolves.toBe('pasted text');
      expect(execFileMock).toHaveBeenCalledWith(
        'termux-clipboard-get',
        [],
        expect.objectContaining({ timeout: expect.any(Number) }),
        expect.any(Function),
      );
      expect(clipboardyMock.read).not.toHaveBeenCalled();
    });

    it('returns an empty string when termux-api is unavailable', async () => {
      execFileMock.mockImplementation(
        (_cmd: string, _args: string[], _opts: unknown, cb: Function) =>
          cb(new Error('ENOENT')),
      );
      await expect(readClipboard()).resolves.toBe('');
    });

    it('writes the clipboard via termux-clipboard-set', async () => {
      execFileMock.mockImplementation(
        (_cmd: string, _args: string[], _opts: unknown, cb: Function) =>
          cb(null, { stdout: '' }),
      );
      await writeClipboard('copied');
      expect(execFileMock).toHaveBeenCalledWith(
        'termux-clipboard-set',
        [],
        expect.objectContaining({ input: 'copied' }),
        expect.any(Function),
      );
      expect(clipboardyMock.write).not.toHaveBeenCalled();
    });

    it('ignores clipboard write failures', async () => {
      execFileMock.mockImplementation(
        (_cmd: string, _args: string[], _opts: unknown, cb: Function) =>
          cb(new Error('ENOENT')),
      );
      await expect(writeClipboard('copied')).resolves.toBeUndefined();
    });
  });

  describe('off Termux', () => {
    it('delegates reads to clipboardy', async () => {
      clipboardyMock.read.mockResolvedValue('desktop paste');
      await expect(readClipboard()).resolves.toBe('desktop paste');
      expect(execFileMock).not.toHaveBeenCalled();
    });

    it('delegates writes to clipboardy', async () => {
      clipboardyMock.write.mockResolvedValue(undefined);
      await writeClipboard('desktop copy');
      expect(clipboardyMock.write).toHaveBeenCalledWith('desktop copy');
      expect(execFileMock).not.toHaveBeenCalled();
    });
  });
});

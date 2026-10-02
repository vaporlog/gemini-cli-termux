/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Termux-safe clipboard wrapper.
 *
 * `clipboardy` evaluates its platform support at module load time and throws
 * `You need to install Termux for this module to work on Android` when
 * `process.platform === 'android'` without a `TERMUX_VERSION` env var (see
 * https://github.com/google-gemini/gemini-cli/issues/13784). Because the CLI
 * imported clipboardy statically, that turned a clipboard feature into a
 * startup crash on Android/Termux.
 *
 * This wrapper fixes that by:
 *  1. Detecting Termux explicitly (platform + PREFIX/HOME/TERMUX_VERSION).
 *  2. On Termux, shelling out to `termux-clipboard-get`/`termux-clipboard-set`
 *     (provided by the optional `termux-api` package) instead of clipboardy.
 *  3. Everywhere else, importing clipboardy lazily so its load-time platform
 *     detection can never crash the CLI, even on unrecognized platforms.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const TERMUX_CLIPBOARD_TIMEOUT_MS = 5_000;
const TERMUX_CLIPBOARD_MAX_BYTES = 10 * 1024 * 1024;

export const isTermuxEnvironment = (): boolean =>
  process.platform === 'android' ||
  process.env['TERMUX_VERSION'] !== undefined ||
  (process.env['PREFIX'] ?? '').includes('com.termux') ||
  (process.env['HOME'] ?? '').includes('com.termux');

type ExecFileWithInput = (
  command: string,
  args: readonly string[],
  options: {
    input?: string;
    timeout?: number;
    maxBuffer?: number;
  },
) => Promise<{ stdout: string; stderr: string }>;

const execFileWithInput = execFileAsync as unknown as ExecFileWithInput;

const runTermuxClipboardTool = async (
  tool: 'termux-clipboard-get' | 'termux-clipboard-set',
  input?: string,
): Promise<string> => {
  const { stdout } = await execFileWithInput(tool, [], {
    input,
    timeout: TERMUX_CLIPBOARD_TIMEOUT_MS,
    maxBuffer: TERMUX_CLIPBOARD_MAX_BYTES,
  });
  return stdout;
};

type Clipboardy = typeof import('clipboardy').default;

let clipboardyPromise: Promise<Clipboardy> | null = null;

const loadClipboardy = (): Promise<Clipboardy> => {
  clipboardyPromise ??= import('clipboardy').then((mod) => mod.default);
  return clipboardyPromise;
};

export const readClipboard = async (): Promise<string> => {
  if (isTermuxEnvironment()) {
    try {
      return await runTermuxClipboardTool('termux-clipboard-get');
    } catch {
      // termux-api is not installed; behave like an empty clipboard.
      return '';
    }
  }
  const clipboardy = await loadClipboardy();
  return clipboardy.read();
};

export const writeClipboard = async (text: string): Promise<void> => {
  if (isTermuxEnvironment()) {
    try {
      await runTermuxClipboardTool('termux-clipboard-set', text);
    } catch {
      // Best effort: clipboard writes must never crash the CLI on Termux.
    }
    return;
  }
  const clipboardy = await loadClipboardy();
  await clipboardy.write(text);
};

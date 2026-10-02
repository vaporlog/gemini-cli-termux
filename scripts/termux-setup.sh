#!/data/data/com.termux/files/usr/bin/bash
# One-shot installer for this Gemini CLI fork on Android/Termux (arm64).
# Usage: bash scripts/termux-setup.sh [repo-url]
set -euo pipefail

REPO_URL="${1:-https://github.com/vaporlog/gemini-cli-termux.git}"
INSTALL_DIR="${HOME}/gemini-cli"

echo "==> Updating Termux packages"
pkg update -y && pkg upgrade -y

echo "==> Installing dependencies (git, nodejs-lts)"
pkg install -y git nodejs-lts

# termux-api is optional but recommended: browser auth (termux-open-url) and
# clipboard integration depend on it.
if ! command -v termux-open-url >/dev/null 2>&1; then
  echo "==> Installing termux-api (recommended: URL opening, clipboard)"
  pkg install -y termux-api || echo "!! termux-api unavailable; auth URL will be printed instead"
fi

if [ ! -d "${INSTALL_DIR}/.git" ]; then
  echo "==> Cloning ${REPO_URL}"
  git clone --depth 1 "${REPO_URL}" "${INSTALL_DIR}"
fi
cd "${INSTALL_DIR}"

echo "==> Installing npm dependencies (skipping native build scripts)"
# --ignore-scripts avoids node-gyp builds of node-pty/keytar, which have no
# Android arm64 binaries. Both are optional; the CLI falls back automatically.
npm install --ignore-scripts --no-audit --no-fund

echo "==> Building the CLI bundle"
npm run bundle

echo "==> Linking the 'gemini' command"
npm link

echo
echo "Done. Try: gemini --version"
echo "Then run 'gemini' and use /auth to log in (opens your phone browser)."

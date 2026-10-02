# Gemini CLI en Android (Termux) — Guía para Samsung S25 Ultra (arm64)

Esta guía instala **este fork** de Gemini CLI (con parches para Termux) en un
Samsung S25 Ultra o cualquier Android arm64, sin root.

## ¿Qué parchea este fork respecto a upstream?

| Problema en Termux                                                                | Fix en este fork                                                                                                                                                |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clipboardy` lanza `You need to install Termux...` **al arrancar** (issue #13784) | Nuevo wrapper `packages/cli/src/ui/utils/clipboard.ts`: detecta Termux, usa `termux-clipboard-get/set` y carga `clipboardy` de forma perezosa en otros sistemas |
| El navegador no abre la URL de autenticación (`Unsupported platform: android`)    | `secure-browser-launcher.ts` y `getUrlOpenCommand()` usan `termux-open-url`                                                                                     |
| `node-pty`/`keytar` sin binarios para Android                                     | Ya son `optionalDependencies` upstream; si no cargan, el CLI cae automáticamente a `child_process`                                                              |

Todo lo demás es código oficial de `google-gemini/gemini-cli` sin tocar.

## Requisitos

- **Termux desde F-Droid o GitHub** — nunca desde Google Play (versión
  abandonada).
- **Termux:API** (opcional pero recomendado): necesaria para `termux-open-url`
  (auth en navegador) y portapapeles. Instala la APK desde el mismo sitio que
  Termux.
- Samsung S25 Ultra es **arm64**, sin root necesario.

## Instalación rápida (automática)

```bash
curl -fsSL https://raw.githubusercontent.com/vaporlog/gemini-cli-termux/main/scripts/termux-setup.sh | bash
```

O con el repo ya clonado:

```bash
bash scripts/termux-setup.sh
```

## Instalación manual

```bash
pkg update -y && pkg upgrade -y
pkg install -y git nodejs-lts termux-api

git clone --depth 1 https://github.com/vaporlog/gemini-cli-termux.git
cd gemini-cli

# --ignore-scripts evita la compilación de módulos nativos (node-pty, keytar)
# que no tienen binarios para Android. Son opcionales y el CLI funciona sin ellos.
npm install --ignore-scripts --no-audit --no-fund

npm run bundle   # genera bundle/gemini.js
npm link         # crea el comando 'gemini'
gemini --version
```

## Autenticación

```bash
gemini
```

En el TUI escribe `/auth` y elige _Login with Google_: se abrirá el navegador
del teléfono automáticamente con `termux-open-url`. Alternativa sin navegador:

```bash
export GEMINI_API_KEY="tu-api-key-de-ai-studio"
gemini
```

## Notas específicas de Android

- **Pegar imágenes del portapapeles**: no soportado (usa archivos con
  `@ruta/imagen.png`).
- **Pegar texto**: funciona vía `termux-clipboard-get` (Ctrl+V) si Termux:API
  está instalada.
- **Phantom process killer** (Android 12+): Android puede matar procesos largos
  de Termux. Mitigación: en _Opciones de desarrollador_ desactiva las
  restricciones de procesos en segundo plano de Termux, o ejecuta
  `adb shell "/system/bin/device_config put activity_manager max_phantom_processes 2147483647"`.
- **Almacenamiento compartido**: los proyectos en `/sdcard` (es decir,
  `~/storage/shared`) funcionan, pero ejecuta `termux-setup-storage` primero.
  Los archivos en el home de Termux (`~`) son más rápidos.
- **Rendimiento**: el S25 Ultra sobra para el CLI en sí; el límite es la batería
  y el calentamiento en tareas largas.

## Limitaciones conocidas

- Sin PTY nativo (no hay build de `node-pty` para bionic/arm64): los comandos de
  shell se ejecutan vía `child_process`. Comportamiento equivalente para uso
  normal.
- `keytar` (keychain) no disponible: las credenciales se guardan en fichero,
  como en upstream cuando keytar falla.

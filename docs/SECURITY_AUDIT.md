# Auditoría de seguridad del fork Termux

Fecha: 2026-10-02 · Base: `google-gemini/gemini-cli` @ `fb972b2f87fe` (main,
2026-10-02) · Licencia: Apache-2.0

## Conclusión

**El agente base es confiable y no está infectado.** Es el CLI oficial de
Google, desarrollado públicamente por Google en GitHub, con revisión continua de
la comunidad (más de 100 000 estrellas). Este fork clona directamente ese origen
y solo añade 4 archivos/cambios mínimos, todos listados abajo y auditables con
`git diff upstream/main...HEAD` (una vez publicado en GitHub).

## Incidentes de seguridad conocidos y estado

| Incidente                                                                                                      | Fecha      | Afectó a gemini-cli                                                                                                                                                         | Estado                                                      |
| -------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Ataque a la cadena de suministro npm (phishing a mantenedores de `chalk`/`debug`)                              | 2025-09-08 | **No** — Google confirmó que `@google/gemini-cli` no fue comprometido; solo usuarios que instalaron durante la ventana del ataque pudieron arrastrar dependencias afectadas | Mitigado: instalar desde fuente con lockfile                |
| RCE mediante ficheros de contexto (`README.md`/`GEMINI.md`), reportado por Tracebit                            | 2025-06/07 | Sí (≤ 0.1.13)                                                                                                                                                               | **Corregido en 0.1.14**; este fork parte de 0.64.x          |
| `TrustIssues` (CVSS 10): inyección de prompts en el workflow de triaje de issues que podía comprometer el repo | 2026-06    | Vulnerabilidad en el **workflow de GitHub**, no en el binario del usuario                                                                                                   | **Corregido en 0.39.1** en 2 días; este fork incluye el fix |

## Revisión de dependencias problemáticas en Termux

- **`clipboardy@5.2.0`**: código fuente revisado (lib/termux.js e index.js). No
  contiene código malicioso; el problema es de detección de plataforma (lanza
  una excepción al importar en Android). Aun así, **este fork ya no lo importa
  estáticamente**: `packages/cli/src/ui/utils/clipboard.ts` lo carga de forma
  perezosa y solo en plataformas no-Termux.
- **`node-pty` / `@lydell/node-pty*` / `@github/keytar`**: son
  `optionalDependencies`. No existen binarios para Android/arm64, no se cargan
  en Termux y el CLI tiene fallback a `child_process`. Ningún script de
  instalación se ejecuta (`--ignore-scripts`).
- **`web-tree-sitter`**: usa WASM, sin compilación nativa. Seguro en Termux.

## Riesgos residuales (inherentes a cualquier agente de IA, no al fork)

1. **Inyección de prompts**: un `GEMINI.md`/`README.md` malicioso de un repo
   tercero puede intentar manipular al agente. Mitigación: no ejecutar el agente
   con auto-aprobación sobre repos no confiables.
2. **Cadena de suministro npm** en la instalación de dependencias del fork.
   Mitigación: este repo incluye `package-lock.json` intacto de upstream; usar
   `npm ci` en lugar de `npm install` fija las versiones exactas auditadas.
3. **Credenciales**: sin keychain en Termux, los tokens se guardan en fichero
   bajo el home privado de Termux (`/data/data/com.termux/...`), inaccesible a
   otras apps sin root. Igual que upstream cuando keytar no está disponible.

## Verificación reproducible

```bash
git remote add upstream https://github.com/google-gemini/gemini-cli.git
git fetch upstream main
git diff upstream/main...HEAD --stat   # solo los archivos del fork
npm ci --ignore-scripts                # dependencias exactas del lockfile
npm audit                              # revisar advisories restantes
```

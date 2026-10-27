# Skills ECC instalados en Huasteca

Instalación selectiva autorizada por el usuario. Registro UTC: 2026-10-27. Fuente fijada: [affaan-m/ECC `25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b`](https://github.com/affaan-m/ECC/commit/25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b).

Se instalaron **seis skills de instrucciones, dentro del proyecto**, con nombres `ecc-*` para distinguirlos de otros skills. El conjunto son **10 archivos y 79.080 bytes (~77,2 KiB)**. No agrega dependencias npm/Python, ejecutables, hooks, MCP, profiles, vaults, observers ni configuración global. La memoria por chat y los mecanismos de navegador existentes se conservan.

La [evaluación previa](evaluacion-ecc.md) describe la revisión de sólo lectura que precedió a esta autorización; su ausencia de instalación corresponde a aquella fase.

## Inventario exacto

Todas las rutas siguientes son relativas a la raíz del proyecto.

| Archivo | Bytes | Función |
|---|---:|---|
| [.agents/skills/ecc-verification-loop/SKILL.md](../.agents/skills/ecc-verification-loop/SKILL.md) | 3.751 | Build, tipos, pruebas pertinentes, revisión del diff y evidencia. |
| [.agents/skills/ecc-e2e-testing/SKILL.md](../.agents/skills/ecc-e2e-testing/SKILL.md) | 8.851 | Patrones de Playwright y diagnóstico de fallos de flujos. |
| [.agents/skills/ecc-browser-qa/SKILL.md](../.agents/skills/ecc-browser-qa/SKILL.md) | 4.784 | QA visual/funcional, consola, red y estados inconclusos. |
| [.agents/skills/ecc-frontend-a11y/SKILL.md](../.agents/skills/ecc-frontend-a11y/SKILL.md) | 13.544 | Teclado, foco, nombres, labels, semántica y movimiento. |
| [.agents/skills/ecc-react-performance/SKILL.md](../.agents/skills/ecc-react-performance/SKILL.md) | 19.353 | Revisión del trabajo React y rendimiento de cliente, con filtro SPA. |
| [.agents/skills/ecc-security-review/SKILL.md](../.agents/skills/ecc-security-review/SKILL.md) | 13.640 | Validación, secretos, superficies de entrada y dependencias. |
| [.agents/skills/ecc-common/HUASTECA.md](../.agents/skills/ecc-common/HUASTECA.md) | 7.429 | Adaptación común a las instrucciones vigentes, Codex, Windows y producto. |
| [.agents/skills/ecc-common/LICENSE-ECC.txt](../.agents/skills/ecc-common/LICENSE-ECC.txt) | 1.071 | MIT íntegra y copyright de Affaan Mustafa. |
| [.agents/skills/ecc-common/NOTICE.md](../.agents/skills/ecc-common/NOTICE.md) | 1.141 | Procedencia y atribución Vercel de react-performance. |
| [.agents/skills/ecc-common/PROVENANCE.json](../.agents/skills/ecc-common/PROVENANCE.json) | 5.516 | Inventario, fuente, transformaciones, hashes y validaciones. |

Este informe es un archivo adicional de documentación, fuera del tamaño de instalación anterior. Los Markdown no se incorporan al bundle de Vite por instalarlos en `.agents/`.

## Procedencia y transformaciones

Se leyeron completos los seis SKILL.md de la muestra fijada, incluidos sus ejemplos, advertencias y referencias. Se preserva todo el cuerpo upstream. Las únicas transformaciones son:

1. Prefijo `ecc-` en el campo `name`.
2. Preámbulo local que remite a `ecc-common/HUASTECA.md`, licencia, avisos y hashes.
3. Seis enlaces relativos de “Related” en react-performance convertidos a URLs del SHA ECC: cinco skills relacionados y `rules/react/`. Se comprobó su existencia en el árbol fijado. Son referencias consultivas, no están instaladas; no se arrastra el catálogo completo.

Los SHA-256 originales e instalados están en PROVENANCE.json. La validación reconstruyó cada original deshaciendo las tres transformaciones y comprobó igualdad exacta de texto; no se suprimieron secciones necesarias. Los enlaces locales de los skills resuelven y los seis nombres de frontmatter coinciden con sus carpetas.

La licencia ECC se copió sin cambios. Se conservó la atribución Vercel dentro de react-performance y en NOTICE.md. Se comprobó la declaración MIT del [skill Vercel fijado](https://github.com/vercel-labs/agent-skills/blob/6ec269328bc400712ee225a173a14b6b29128df7/skills/react-best-practices/SKILL.md); ese árbol no tiene un LICENSE independiente y no se creó uno atribuido a Vercel. No se descargaron sus ZIP ni reglas completas.

## Cómo aplicarlos en Codex y Windows

Leer primero [HUASTECA.md](../.agents/skills/ecc-common/HUASTECA.md) y después el SKILL pertinente. Los nombres instalados pueden mencionarse en el chat, por ejemplo `$ecc-frontend-a11y` o `$ecc-verification-loop`; en una sesión que todavía no haya refrescado su catálogo, cargar el archivo por su ruta. La instalación no configura un comando de shell ni habilita automatismos.

Los bloques Bash upstream son referencias. PowerShell debe usar los comandos reales del proyecto y conservar sus códigos de salida. Son comprobaciones existentes que pueden aplicarse cuando el cambio las justifique:

```powershell
npm run build
git diff --check
git diff --stat
```

`npm run build` ya ejecuta TypeScript y Vite. Consultar el package.json vigente para las pruebas añadidas por el proyecto. No crear un script ficticio `lint` o `test`, instalar un runner para imitar el ejemplo ni declarar PASS de una prueba ausente. No imponer 80% de cobertura por rutina.

La suite concreta puede usar Node y el Playwright ya existente. Las recetas `@playwright/test`, navegadores múltiples, Docker, Web3, autenticación o Next no son requisitos de estos skills. Las dependencias sólo se añaden si una necesidad del producto las justifica dentro de la autorización vigente.

Hay dos correcciones técnicas expresas en HUASTECA.md:

- Las trazas de acciones/snapshots Playwright usan `context.tracing`, o la configuración de su runner. `browser.startTracing` es tracing de Chromium y no acepta ese ejemplo como sustituto. [API oficial](https://playwright.dev/docs/api/class-tracing).
- React Activity conserva estado/DOM, pero limpia los Effects cuando se oculta y los recrea al mostrar; el upstream dice que permanecen montados. No introducir Activity como optimización sin revisar el ciclo de vida real. [React oficial](https://react.dev/reference/react/Activity).

También se filtran promesas de ahorro sin medición, referencias desactualizadas del Compiler, sugerencias de `npm audit fix`/`npm update`, grep como supuesta auditoría completa y recetas de servidor que no corresponden a una SPA.

## Aplicación pertinente al avance actual

El uso inmediato recomendado tiene criterios observables; este inventario no afirma haber ejecutado QA de producto:

- **A11y:** operar selección, filtros, recorrido y estudio con Tab/Shift+Tab, Enter/Espacio y Escape; verificar foco inicial/devuelto, nombres de iconos, labels y estados de controles. Asegurar alternativa HTML al canvas y no exigir hover/arrastre para elegir un lugar.
- **Movimiento:** respetar `prefers-reduced-motion` en vuelos, recorrido automático y WebGL. No anunciar cada frame en live regions; mantener avisos útiles de selección, guardado o error.
- **Regresión funcional:** guía → atlas → estudio; crear, editar, ordenar y eliminar; recarga/persistencia; enlaces compartidos válidos y alterados; datos de almacenamiento inválidos; recursos o WebGL no disponibles. Elegir casos que ejerciten lógica propia, no repetir cada línea de implementación.
- **Visual:** móvil/escritorio con cámara y datos estables, consola/red sin fallos relevantes y baseline válida. Sin referencia visual, indicar INCONCLUSO. No confundir una captura con certificación de accesibilidad o métricas de campo.
- **Rendimiento:** revisar RAF, listeners, texturas, materiales, geometrías, controles y renderer al desmontar o cambiar de vista. Medir antes de optimizar; evitar setState por frame si basta una referencia.
- **Seguridad:** validar protocolos de URL, límites de datos compartidos/persistidos y errores. No almacenar secretos en `localStorage` ni en `VITE_*`. Las guías de auth/pagos se aplicarán cuando esas funciones existan.

Conservar SSD: reutilizar runtime/navegador instalado; informes compactos y WebP; trazas o vídeo sólo para fallos que lo requieran. No descargar todos los navegadores ni conservar reportes pesados por cada ejecución.

## Validación de la instalación

Se comprobó lectura UTF-8, nombres únicos, hashes originales/instalados, cuerpos completos preservados, enlaces locales y referencias ECC fijadas. **No se ejecutó código externo.** La modificación sólo instala instrucciones y documentación; el build y las regresiones del producto corresponden a los cambios de implementación coordinados en la tarea principal. No se tocaron App, CityScene, package.json, README ni AGENTS.

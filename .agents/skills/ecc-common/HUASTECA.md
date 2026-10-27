# Integración de los seis skills ECC en Huasteca

Esta nota adapta el catálogo al proyecto React 19 / TypeScript 5.9 / Vite 7 / Three.js y a Codex en Windows. Es parte de cada skill local `ecc-*`. Procedencia: ECC `25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b`.

## Alcance y prioridad

Las instrucciones vigentes del usuario y del entorno prevalecen sobre los ejemplos upstream. Las autorizaciones ya concedidas se conservan; el skill no amplía ni revoca permisos y no crea confirmaciones adicionales. Los ejemplos son material de referencia: no ejecutar todos sus bloques ni instalar paquetes porque aparezcan en un snippet.

Instalación de instrucciones, sin runtime. No se activan hooks, MCP, perfiles, observers, vaults, agentes remotos ni memoria global. La memoria del usuario continúa en `memoria.ps1`, por ficha/chat; no buscar otros chats por fecha o nombre. Los skills locales de navegador existentes siguen proporcionando el mecanismo de acceso; estas guías complementan sus comprobaciones.

## Verificación proporcionada al cambio

- Usar primero el `package.json` real. El build actual `npm run build` ya incluye TypeScript y Vite; conservar su código de salida y corregir fallos pertinentes.
- En PowerShell, ejecutar directamente `npm run build`; no copiar `set -o pipefail`, `sed`, `tail` o `grep`. Si hace falta buscar contenido, usar `rg`. No imprimir secretos encontrados: informar sólo ubicación y clase del hallazgo.
- Consultar los scripts vigentes: si `lint` o `test` no están declarados o la prueba no se ejecutó, indicar NO CONFIGURADO / NO EJECUTADO; nunca convertir una comprobación ausente en PASS. Elegir pruebas por riesgo y comportamiento; no imponer 80% de cobertura ni repetir una suite ya aprobada sin cambios o nueva incertidumbre.
- No ejecutar `npm audit fix`, `npm update`, `git add`, una instalación de navegadores o una migración como paso automático de una auditoría. Distinguir lectura, propuesta y modificación autorizada; evitar upgrades ajenos al objetivo.
- `git diff HEAD~1` compara contra el commit anterior, no necesariamente el alcance actual. Revisar el diff adecuado (working tree, staging o base conocida) según la tarea.

## E2E y QA visual con poco almacenamiento

Playwright ya está en el proyecto; `@playwright/test` es un runner distinto que no se añade con esta instalación. Reutilizar el navegador/runtime ya disponible. No descargar de rutina Chromium/Firefox/WebKit, vídeos ni artefactos del catálogo. Si se necesita una nueva dependencia para una suite concreta, justificarla dentro del alcance vigente.

Esperar estados observables del producto mediante locators y aserciones; `networkidle` no demuestra que una animación, una escena o un formulario esté listo. Registrar listeners de respuesta antes de la acción que dispara la petición para evitar carreras. Los ejemplos `/api/search`, puertos 3000, wallets, login, pagos y rutas de Next no describen Huasteca.

Para trazas Playwright de acciones usar `context.tracing.start({ screenshots: true, snapshots: true })` y `context.tracing.stop({ path })`, o el runner ya configurado. El ejemplo upstream de `browser.startTracing` es tracing de Chromium, no esa API de Playwright; no copiar `snapshots` allí. Ver [API oficial](https://playwright.dev/docs/api/class-tracing).

Guardar normalmente informe breve y capturas WebP optimizadas; traza/vídeo sólo ante fallos difíciles y con retención explícita. Fijar cámara, datos, viewport y estado de movimiento para una comparación visual. Si no existe baseline válida, reportar INCONCLUSO. No ocultar fallos mediante reintentos, `skip` o `fixme`; explicar las omisiones y conservarlas visibles.

La batería pertinente abarca guía → atlas → estudio; selección y filtros; guardar/editar/eliminar; recarga/persistencia; enlace compartido; errores de recursos; fallback WebGL; teclado y movimiento reducido. Usar datos de prueba y acciones reversibles dentro de lo autorizado. No probar reservas o inventario inexistentes. Las métricas de laboratorio llevan condiciones/dispositivo; un muestreo no certifica experiencia real ni cumplimiento completo WCAG.

## Accesibilidad de la experiencia

Preferir botones/enlaces y labels nativos; revisar nombres accesibles de iconos, `aria-pressed` de toggles y estados expandidos sólo cuando correspondan. Los controles HTML deben permitir seleccionar lugares y operar la guía sin depender exclusivamente del canvas, hover o arrastre.

Probar Tab / Shift+Tab, Enter / Espacio, Escape, foco visible y devolución de foco al cerrar paneles. El modal upstream sólo muestra foco inicial/restaurado: no implementa por sí solo aislamiento/focus trap. No añadir una librería por reflejo; resolver según la estructura real. Revisar que el foco no permanezca en controles ocultos o desmontados.

Respetar `prefers-reduced-motion` también en vuelos de cámara, auto recorrido y animación WebGL. Anunciar cambios relevantes sin usar un live region por cada frame de cámara o progreso. El lector de pantalla necesita nombres/contexto y alternativas operables; no sustituir revisión manual por capturas o un scan automático.

## React / Three.js y seguridad: filtro de ejemplos

- Huasteca es una SPA; no usar `next/dynamic`, `next/script`, Server Actions, RSC, SSR, cookies de servidor o Supabase porque figuren en ejemplos. Usar las APIs de las versiones instaladas y documentación primaria cuando cambien.
- Medir antes de optimizar. Evitar estado React por frame si basta una referencia; comprobar cleanup de RAF, listeners, controles, geometrías, materiales, texturas y renderer. Mantener legibilidad y calidad visual.
- **Corrección upstream:** `Activity` conserva estado/DOM, pero al ocultarse limpia Effects; al mostrarse los recrea. No mantiene subscriptions/Effects activos de forma permanente. No introducirlo sin comprobar la versión y el ciclo de vida de la escena. Ver [React Activity](https://react.dev/reference/react/Activity).
- Las afirmaciones de ahorro en milisegundos, GPU automática y estatus del React Compiler del texto upstream no son mediciones de Huasteca; verificarlas antes de apoyar una decisión. No crear microoptimizaciones por catálogo.
- La seguridad actual incluye validación de datos persistidos/enlaces, protocolos URL permitidos, límites de tamaño, errores y acceso a recursos. `localStorage` de datos de demostración no es un sistema de autenticación; no guardar credenciales allí.
- Ningún `VITE_*` es un secreto: se expone al cliente. Una variable de entorno en código de navegador no protege una clave. No añadir backend, autenticación, pagos, Zod, DOMPurify o AgentShield por el solo hecho de aparecer en un ejemplo.
- El grep upstream de dos cadenas no es una auditoría. Mantener evidencia de qué superficie y dependencias se revisaron, límites y fallos pendientes; no prometer ausencia de vulnerabilidades.

## Lectura y procedencia

Cada SKILL.md mantiene las instrucciones upstream completas, con el nombre local prefijado, este preámbulo y seis enlaces relativos relacionados reescritos al SHA remoto. Los recursos relacionados son consultivos; no están instalados ni se ejecutan. `PROVENANCE.json` registra hash original e instalado. `LICENSE-ECC.txt` conserva MIT y copyright de Affaan Mustafa. `NOTICE.md` conserva la atribución Vercel de react-performance. Ningún script ejecutable de ECC fue copiado al proyecto.


# Revisión ECC y regresiones del piloto 3D

## Alcance y procedencia

Se leyeron y aplicaron los seis skills ECC instalados desde el SHA **25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b**, empezando por [HUASTECA.md](../.agents/skills/ecc-common/HUASTECA.md). Los seis hashes locales coinciden con [PROVENANCE.json](../.agents/skills/ecc-common/PROVENANCE.json). Son instrucciones adaptadas para React 19 / Vite / Three; no se añadieron hooks, MCP, librerías ni navegadores.

| Skill aplicado | Decisión concreta |
| --- | --- |
| [verification-loop](../.agents/skills/ecc-verification-loop/SKILL.md) | Build con código de salida real; no presentar lint/tests ausentes como aprobados. |
| [e2e-testing](../.agents/skills/ecc-e2e-testing/SKILL.md) | Casos orientados a comportamiento; esperas por estado de la escena, sin networkidle como prueba de disponibilidad. |
| [browser-qa](../.agents/skills/ecc-browser-qa/SKILL.md) | Comparar escritorio/móvil y errores de recursos. Sin baseline visual válida, semejanza visual queda INCONCLUSA. |
| [frontend-a11y](../.agents/skills/ecc-frontend-a11y/SKILL.md) | Foco fuera de controles ocultos; activación por teclado; cierre de diálogo sin abandonar POV. |
| [react-performance](../.agents/skills/ecc-react-performance/SKILL.md) | Medir actualización de cámara, reconciliación y limpieza de recursos antes de optimizar. |
| [security-review](../.agents/skills/ecc-security-review/SKILL.md) | Mantener validación de selección persistida/compartida; no añadir claves, uploads o servicios por copiar ejemplos. |

La revisión estática comenzó sobre HEAD 7139b5fa57e48969a0d0531ccde47bf11b0ec780. La autorización posterior del coordinador amplió el alcance a tres correcciones de producto, descritas aquí. No se usó navegador ni node_repl compartido. La revisión no certifica accesibilidad completa ni rendimiento real.

## Tres defectos corregidos

### 1. Directorio invisible alcanzable con Tab en POV

Antes, el directorio de escritorio se ocultaba con opacity:0 y pointer-events:none. Su input y botones continuaban en el árbol interactivo: un usuario podía perder visualmente el foco o escribir en una búsqueda invisible.

Cambio: SpatialGuide calcula cuándo el directorio está cerrado en POV, aplica inert al aside y visibilidad coherente en CSS. Si una selección o el cierre oculta el control que tenía el foco, éste se devuelve al botón visible «Volver a Xilitla». El directorio abierto continúa operable.

**Regresión que debe fallar antes del cambio:** entrar en POV desde un lugar del directorio con teclado; recorrer Tab y Shift+Tab. Ninguna parada puede pertenecer a la búsqueda o a filas del directorio cerrado. Abrirlo en móvil debe devolver sus controles a la navegación normal. Comprobar comportamiento y foco activo; una captura estática no detecta este defecto.

### 2. Botones de Caminar que no respondían a Enter/Espacio

Antes, los cuatro botones sólo tenían onPointerDown. Ser elementos button les daba foco y nombre, pero su activación de teclado no realizaba la acción anunciada.

Cambio: los cuatro usan los mismos handlers de pulsación mantenida. Enter o Espacio inicia movimiento; soltar la tecla o perder foco lo detiene. La vía de puntero captura el pointer y limpia movimiento al soltar, cancelar o perder captura. El cambio de perspectiva o de ámbito también limpia walkInput para impedir que una pulsación sobreviva al desmontaje del pad.

**Regresión que debe fallar antes:** en viewport móvil, enfocar «Caminar hacia adelante», mantener Enter y observar desplazamiento; soltar y comprobar parada. Repetir con Espacio/direcciones laterales. Mientras una tecla esté mantenida, cambiar de foco o salir de POV: no debe continuar el movimiento ni reanudarse automáticamente al regresar. Usar eventos de teclado/puntero reales del navegador; un click programático aislado no representa una pulsación mantenida.

### 3. Campo de visión del minimapa calculado con el ángulo incorrecto

Antes, el cono del minimapa usaba camera.fov como apertura horizontal. PerspectiveCamera define ese FOV sobre el eje vertical, y el campo horizontal varía con aspect. Con un canvas 390×698 y FOV vertical 70°, el campo horizontal es aproximadamente **42.73°**, no 70°.

Cambio: GuideCameraState transporta aspect. CityScene lo añade al estado y a su clave de notificación, de modo que un resize se publica aunque no cambien posición/FOV. GuideMiniMap obtiene el semiancho horizontal como atan(tan(FOVvertical/2) × aspect).

**Regresión que debe fallar antes:** mantener el mismo lugar, yaw y FOV en POV; pasar de escritorio a móvil sin seleccionar de nuevo. La apertura angular del cono debe estrecharse y seguir centrada en la misma dirección. Contrastar con rayos izquierdo/derecho derivados de la cámara real. Un snapshot del SVG a un solo tamaño no detectaría el fallo anterior. La longitud del cono sigue siendo una ayuda esquemática; no representa alcance de visión física ni oclusión por edificios.

Archivos de producto de esta intervención: SpatialGuide.tsx, SpatialGuide.css, GuideMiniMap.tsx, CityScene.types.ts. En CityScene.tsx únicamente se añadieron aspect al estado de cámara y a stateKey; no se modificaron geometría, renderer o diagnósticos.

## Batería pequeña de QA de alto valor

Son requisitos para el runner coordinado con el Playwright existente; aquí no se escribió ni ejecutó un runner nuevo.

| Caso | Acción y evidencia | Fallo real que detecta |
| --- | --- | --- |
| Entrada y regreso a POV | Elegir lugar en directorio/minimapa; esperar fin del estado de vuelo; volver a vista general. Confirmar mismo lugar y cámara válida. | Selección que no mueve cámara, salto de foco o regreso a un estado ajeno. |
| Teclado del directorio | Caso de Tab descrito arriba; verificar foco visible y ausencia del input oculto en la navegación. | UI visualmente oculta pero interactiva. |
| Hold/release y cancelación | Teclado, pointerup fuera del pad, pointercancel y blur; después comprobar posición estable sin entrada activa. | Movimiento atascado o controles inaccesibles. |
| Modal sobre POV | Moverse, abrir mapa ampliado, usar Tab y Escape; el primer Escape cierra sólo el diálogo y restaura foco. Otro Escape vuelve a vista general. | Cámara moviéndose detrás del modal o Escape que rompe dos estados a la vez. |
| Resize del minimapa | Comparar ángulos del cono antes/después del resize, con dirección constante. | Aspect nuevo no comunicado o FOV vertical usado como horizontal. |
| Movimiento reducido | Activar prefers-reduced-motion antes de entrar a POV y durante un vuelo. Esperar estado final observable. | Transición continua que ignora la preferencia o motor que queda en flying. |
| Fallo de WebGL | Forzar pérdida del contexto en entorno de prueba; elegir lugares desde plano/directorio. | Pantalla vacía, spinner permanente o ficha imposible de abrir. |
| Persistencia y enlace | Guardar un lugar, recargar, compartir, abrir en contexto limpio; incluir IDs repetidos/desconocidos y JSON de localStorage inválido. | Crash, duplicados, selección de datos inexistentes o lista compartida alterada. |

Para controles o diálogos, usar getByRole y sus nombres accesibles. Registrar listeners de consola/red antes de cargar o actuar. Esperar estado de producto o cambio de posición seguido de reposo; no sustituirlo por pausas arbitrarias, networkidle ni reintentos que oculten una carrera.

Un scan automático de accesibilidad puede complementar la revisión si la herramienta ya está disponible; no debe instalarse por rutina ni sustituir teclado y lector de pantalla. Las pruebas de enlaces se limitan al producto y a fuentes públicas; no existen en esta guía reservas, pagos o disponibilidad hotelera para simular como funcionalidades reales.

## Requisitos del piloto de objeto 3D

La evaluación previa está en [evaluacion-img2threejs.md](evaluacion-img2threejs.md). Para integrar una factory generada o un modelo original deben cerrarse estos puntos:

1. **Procedencia y representación:** referencia propia/autorizada, nombre del lugar y fecha; fotos de varios lados y al menos dimensiones principales. Separar lo comprobado de las superficies interpretadas. No aceptar semejanza únicamente desde una cámara.
2. **Escala y anclaje:** metros, ejes y orientación compatibles con guidePosition; comprobar el objeto junto a edificios/persona de referencia y desde altura de ojo de la guía. Una factory válida en TypeScript no prueba escala correcta.
3. **Caminata y vuelo:** actualizar colisión y volumen de seguridad con las dimensiones del objeto final. Actualmente el kiosco se protege mediante radios/altura constantes y el resto de las colisiones depende de huellas OSM; sustituir sólo la malla puede dejar partes atravesables o cortar el vuelo con el techo. Probar aproximaciones desde varios lados.
4. **Render y controles:** conservar cámara, selección, zoom, minimapa y luces de la guía. No introducir los helpers de órbita/composer del showcase sobre el renderer principal.
5. **Propiedad de recursos:** registrar geometrías, materiales, mapas y entornos del nuevo objeto; compartir lo repetido y liberar lo que le pertenezca. El cleanup actual libera un set propio de texturas; las texturas añadidas por una factory externa no se incorporan automáticamente a él.
6. **Presupuesto medido:** registrar triángulos, draw calls, materiales, número/resolución de mapas y transferencia comprimida antes/después. Los límites iniciales propuestos en la evaluación son gates a comprobar, no mediciones ya conseguidas.
7. **Aceptación visual:** mismas cámaras, luz, viewport y datos para baseline y candidato. Órbita, laterales, trasera y aproximación peatonal. Rechazar huecos, escala falsa, textura que sustituye volumen, z-fighting, colisiones y pérdida de legibilidad.

## Rendimiento y almacenamiento proporcionados

Hay un riesgo a medir, no una regresión demostrada: CityScene comunica cámara hasta aproximadamente 10 veces por segundo; SpatialGuide la guarda en React y MapCanvas recibe un objeto nuevo, por lo que su memo no evita ese render. Los paths se calculan con useMemo, pero el JSX de cartografía estática se vuelve a recorrer junto a la flecha. Antes de dividirlo en capa estática memoizada y capa de cámara, medir coste real con la geometría actual; no introducir optimizaciones del catálogo sin evidencia.

Registro recomendado por variante: un JSON pequeño con commit, objeto, dispositivo/navegador, viewport, DPR, estado de cámara, bytes comprimidos, renderer.info de una vista fija, tiempos de carga y frame-time p50/p95/máximo de una muestra corta. No almacenar cada frame. Para cleanup, comparar ciclos idénticos de montar/desmontar y recursos creados/liberados; no exigir cero absoluto a cachés internas de Three.

Máximo habitual: informe breve y 2–4 capturas WebP compactas sólo para una comparación visual acordada o un fallo. Sin vídeo ni trace por defecto; habilitar una traza corta sólo para un fallo difícil y fijar retención. Sin modelos descargados duplicados, capturas PNG grandes o nueva instalación de navegadores. Un muestreo de laboratorio no demuestra FPS en todos los móviles ni Core Web Vitals de campo.

## Verificación de esta intervención

- **Skills / procedencia:** verificados 6/6 hashes instalados contra PROVENANCE.json.
- **Build y tipos:** PASS — npm run build terminó con código 0 e incluye tsc -b + Vite.
- **Advertencia de build:** chunk de Three superior a 500 kB minificado; advertencia existente del bundler, no fallo de compilación ni medición de transferencia de esta intervención.
- **Lint / runner de tests:** NO CONFIGURADO en package.json; Playwright core está disponible, pero eso no configura por sí mismo @playwright/test.
- **E2E / revisión visual / lector de pantalla:** NO EJECUTADOS por este agente; navegador reservado al coordinador.
- **Seguridad:** lectura acotada a estos componentes y al contrato de datos. No apareció eval, new Function o dangerouslySetInnerHTML en los tres componentes leídos; esto no es una auditoría global ni acredita ausencia de vulnerabilidades.

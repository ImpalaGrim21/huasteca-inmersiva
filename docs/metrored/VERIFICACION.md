# Verificación · MiRedMetro Valles

28-10-2026, build de producción con base `/huasteca-inmersiva/`. **`npm run verify`: exit 0.**

| Comprobación | Resultado |
| --- | --- |
| Skills ECC del proyecto | PASS: seis skills, diez archivos |
| Nous Research | PASS: dos skills, 31 archivos, 148,695 bytes, 30 blobs upstream coincidentes |
| TypeScript estricto + Vite | PASS |
| Contrato SCT y herramientas de viaje | 17/17 |
| Regresión de plataforma turística | 6/6 |
| Flujos de movilidad y offline | 12/12 |
| Nuevas funciones de ideación | 5/5 |
| **Total de pruebas** | **40/40, cero omitidas** |
| Doctor completo local | PASS, incluido img2threejs existente; no instalación nueva de autoría |
| Lint, cobertura porcentual y lector de pantalla real | No configurado / no medido / no ejecutado, respectivamente |

La suite cubre mapa real OpenFreeMap, búsqueda y aliases, identidad de puntos, guardados y recarga, enlaces, ubicación permitida/denegada/fuera de zona, actualización y caducidad, QR, borrador sin envío, nota privada, ficha copiada/descargada, diálogo nativo, foco/Escape, móvil, paisaje 844×390, fallos deliberados de mapa/chunk, recarga offline y sustitución de caché legacy de 5.9 MB. Los fixtures de coordenadas del pasajero y respuestas del contrato existen sólo en pruebas; no son posiciones de autobuses ni registros reales.

## Calidad visual y recursos

Revisión de Chrome instalado: **1440×980, 390×844 y 768×1024**, movimiento reducido y zona America/Mexico_City. Cero errores de página/consola y cero desbordamientos horizontales en esas capturas. Se cargaron tiles/estilo reales y no se solicitaron chunks Three/turismo desde movilidad. Tres warnings en escritorio/tablet pertenecen a filtros de escudos viales del estilo remoto; quedaron registrados, sin errores de aplicación. No se midieron FPS, memoria de un teléfono, Web Vitals de campo ni cumplimiento completo WCAG.

- [Escritorio](evidence/escritorio.jpg)
- [Móvil](evidence/movil.jpg)
- [Consulta al operador](evidence/consulta-operador.jpg)
- [Tablet](evidence/tablet.jpg)

Paquete offline publicado por el build: **15 archivos, 2,031,824 bytes**, presupuesto de seis millones de bytes. Versión: `6514aaf8047d0be26ab1`. Incluye sólo el grafo de movilidad, worker y fuentes necesarias; excluye tiles remotos, posiciones SCT, notas y otros datos personales, escenas turísticas y modelos. Integridad por archivo y versión HTML verificadas. La instalación es atómica; versiones anteriores permanecen coherentes hasta activar el nuevo paquete.

MapLibre está dividido en un módulo diferido. Vite informa tamaño superior a 500 KB para librerías de mapas/3D; la advertencia se conserva. No se silenció ni se confundió el tamaño de fuente con rendimiento real.

## Revalidación de la sesión Rosa

Rosa es una persona **ficticia de evaluación**, no una pasajera entrevistada. El build inicial y sus quejas permanecen en [ADVERSARIAL-UX](ADVERSARIAL-UX.md). Sobre el build final:

| Ticket | Estado comprobado |
| --- | --- |
| UX-001 · ubicación congelada | Corregido. Al cambiar la coordenada de prueba IMSS→Tec y actualizar, el primer resultado pasa de IMSS a Tecnológico; captura reciente visible. Caducidad de dos minutos probada. |
| UX-002 · lista inaccesible en horizontal | Corregido. En 844×390 se alcanza y selecciona un resultado con scroll normal del panel; en la revalidación el botón quedó entre y=190 y y=251. |
| UX-003 · IMSS 6 sin resultados | Corregido con alias ligado al referente documentado HGZ 6. Devuelve los dos IDs existentes, sin crear otro parador. |
| UX-004 · A/B ambiguo | Explicación integrada junto al selector; las preguntas requieren elegir intención y no asignan sentidos. No sustituye una prueba de comprensión con pasajeros reales. |
| UX-005 · límites de datos | UASLP se muestra como referente separado de paraderos. GPS SCT, ETA, sentidos, operación y accesibilidad física siguen pendientes de sus fuentes y validación. |

Registros detallados locales: `.work/metrored-prototype/qa/verify-pages.log`, `mobility-e2e-report.json`, `creative-tools-e2e-report.json`, `visual-review.json` y `.work/metrored-prototype/dogfood/revalidation.json`. Las capturas antiguas no se presentan como resultado del build nuevo.

No se verificó precisión de un GPS físico, servicio actual de paraderos, llegadas, permisos SCT, backend de producción o disponibilidad garantizada de proveedores. La entrega es un prototipo funcional de orientación y una integración preparada, no seguimiento de la flota en vivo.

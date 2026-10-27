# QA de adopción de skills y mejora del patrimonio 3D

Inventario previo a la prueba, 26 de octubre de 2026. Las comprobaciones nacen del pedido de instalar y usar img2threejs/ECC, de las mejoras implementadas y de las afirmaciones que se entregarán.

| Afirmación o control | Comprobación funcional | Estado visual a revisar |
| --- | --- | --- |
| Instalación real y ligera | Doctor, versiones/hashes y bytes; seis ECC y una copia canónica img2threejs | Inventario y comandos reproducibles |
| Patrimonio reconocible | Torre de San Agustín mediante pipeline img2threejs; contrato, pases y gates | Referencia junto al render, cuatro ángulos, vista peatonal e integración urbana |
| Cámara y orientación coherentes | Cono del plano coincide con rayos horizontales de cámara y cambia al redimensionar | Móvil estrecho y escritorio |
| Foco accesible | Tab no entra al directorio oculto; foco retorna a controles visibles | POV con directorio cerrado y abierto |
| Caminar con teclado | Enter/Espacio mantenidos, soltar, blur, cancel y diálogo detienen movimiento | Controles con foco visible, posición y mirada en minimapa |
| Flujos conservados | Guía compartida/persistida, descarga y CRUD de paquete | Ficha, diálogo, lista y transición guía → estudio → guía |
| Recuperación | Sin WebGL y geometría HTTP503 | Plano seleccionable y salida al directorio regional |
| Peso y recursos | Triángulos, draw calls, mapas, transferencia y cleanup; archivos de autoría fuera de dist | Misma calidad y estados útiles sin cargar modelos de IA ni medios duplicados |
| Publicación | Build estricto, E2E, CI y visita HTTPS | Escritorio/móvil sin errores, solapamientos o desbordamiento |

Exploración adicional: mantener una tecla de movimiento al abrir un diálogo; cambiar viewport en POV; seleccionar otro lugar durante vuelo; abrir y cerrar escena diez veces para observar recursos. Las pruebas de laboratorio no certifican precisión arquitectónica, WCAG completa ni rendimiento en todos los dispositivos.

El runner usa el paquete Playwright existente y el navegador disponible. Guarda JSON breve y JPEG optimizado sólo al fallar; no descarga navegadores locales ni graba vídeo. La revisión visual conserva únicamente capturas relevantes comprimidas. Los resultados se registrarán después de ejecutarlos.

## Primer cierre ECC y herramientas

Doctor completo e instalador idempotente: PASS, sin nueva descarga. Doctor de proyecto + TypeScript/Vite + seis E2E: PASS; lote local de 13,1 s en Chrome156/Windows, con escritorio1440×900 y móvil emulado390×844. Se comprobaron foco visible, persistencia sin parámetro compartido y tras reload del paquete, Enter/Espacio, parada con tecla aún mantenida bajo modal, FOV contra rayos de cámara y resize de ida/vuelta, red/consola y fallos explícitos503/WebGL. Sin reintentos ni casos omitidos. No hay linter ni cobertura porcentual configurados; no se presentan como aprobados.

Las herramientas ocupan aproximadamente7,8 MB de archivos incluyendoGit/cachés de img2threejs y79.080 B de ECC. La referencia de escena antes del piloto (cámara fija,1440×900):36drawcalls,18.636triángulos,53geometrías y5texturas. La instrumentación esDEVbajo demanda, queda fuera de producción y no mantiene un RAF adicional. No son métricas de FPS de teléfonos físicos.

El pilotoimg2threejs sigue separado de esta publicación inicial. El primer blockout fue rechazado; la geometría se corrigió y los materiales permanecen pendientes de revisión. Ningún modelo rechazado se incorpora a la experiencia pública.

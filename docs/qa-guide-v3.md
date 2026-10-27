# Verificación de la guía espacial v3

Pruebas del 26 de octubre de 2026 (hora de México). Se comprobó la transferencia original del referente a lugares turísticos y la continuidad del estudio anterior. Chrome de escritorio y emulación táctil: 1440×1000, 390×844 y 350×740. Las comprobaciones se realizaron con controles de usuario mediante Playwright y revisión visual separada; no equivalen a pruebas en teléfonos físicos.

| Requisito | Resultado observado |
| --- | --- |
| Datos y geometría | 19 fichas regionales, siete locales y seis pines; 35 huellas, 98 trazas, una plaza y un patio interior. JSON de 22,278 B. |
| Selección y perspectiva | Selección desde escena/directorio/minimapa; vuelo y llegada a 1.7 m; puntos Llegada/Entorno/Calle y retorno. Miniatura JPEG 256×144 generada desde la misma escena, incluida al abrir en vista general. |
| Mirar y caminar | Arrastre de 240 px cambió rumbo aproximadamente 1.008 rad sin mover los ojos; rueda limita FOV a 55–85°. WASD y controles táctiles mueven la cámara. Contra una huella, una pulsación W de 3.2 s se detuvo tras 7.67 m, sin atravesarla. |
| Selección durante vuelo | Posada → Cultura → Templo termina en la ficha y perspectiva del templo; sin miniatura anterior. |
| Orientación y teclado | Minimap norte arriba con posición y rumbo reales de cámara, no sólo dirección al centro. Selección por Enter y toque. Diálogo ampliado y cierre restauran foco; Escape del mapa conserva POV. |
| Directorio | Todas las categorías; búsqueda `aquismon` encuentra Aquismón; cadena sin coincidencias muestra salida regional. Catálogo regional de cuatro alojamientos y canal de servicios; enlaces a responsables y fuentes sin fotografías equivocadas. |
| Guía personal | Guardar/quitar y recarga; URL valida IDs conocidos y elimina duplicados. Al modificar una guía compartida se actualiza el parámetro, y al vaciarla desaparece. Descarga TXT con saltos de línea, descripciones y fuentes comprobada. Lista vacía desactiva descarga/compartir. |
| Herramientas | Luz día/atardecer, nombres, trazas, acercar/alejar, restablecer y fullscreen: ciclo de cambio y regreso. Herramientas sin efecto en el plano 2D se ocultan. |
| UX móvil | Directorio desplegable, ficha expandible con acciones alcanzables, ajustes agrupados con botones 48×48, caminata 44×44. «Despejar vista» da espacio al entorno y «Ver ficha» restaura la interfaz. Sin desbordamiento horizontal a 390 y 350 px. |
| Legibilidad y capas | Nombres completos, condición de maqueta visible, título regional con contraste; etiquetas evitan paneles, minimapa y controles. La ficha de escritorio y el dock conservan separación. En móvil se evita duplicar el nombre del pin bajo el minimapa; el lugar sigue identificado por la ficha. |
| Diálogos y movimiento | Un diálogo abierto suspende teclado y controles de caminata, incluso si W estaba presionada. Al cerrar se conserva el contexto. |
| Movimiento reducido | Cambio al POV inmediato, sin vuelo largo; altura 1.7 m y FOV 70°. Animaciones CSS desactivadas. |
| Sin WebGL / pérdida de contexto | Fallo de WebGL y `WEBGL_lose_context` muestran plano SVG con seis lugares seleccionables. Seleccionar el templo actualiza ficha. Se oculta la exploración POV y se ofrece abrir su ubicación OSM. Sin errores de aplicación. |
| Estudio conservado | Entrar/salir, tres paquetes previos; crear un paquete con Tamul y Xilitla, guardar, reabrir con dos paradas y eliminar: vuelve a tres. No se cambió el esquema de datos anterior. |
| Build de producción | `npm run build` pasa TypeScript strict/noUnused y Vite. Base `/huasteca-inmersiva/` probada en servidor preview con la misma variable de entorno: módulos, fuentes, JSON y miniatura cargan sin errores ni respuestas 4xx. |

La exploración adicional incluyó cambiar de categoría durante vuelo, abrir/cerrar mapa y guía personal dentro del POV, modificar un enlace compartido con IDs inválidos y duplicados, consultar alojamientos fuera de Xilitla y volver varias veces al estudio.

## Evidencia visual optimizada

- [Guía de Xilitla, escritorio](screenshots-v3/01-xilitla-desktop.webp).
- [Perspectiva humana, escritorio](screenshots-v3/02-perspectiva-desktop.webp).
- [Guía móvil](screenshots-v3/03-guia-movil.webp).
- [Vista despejada móvil](screenshots-v3/04-vista-despejada-movil.webp).

Las cuatro capturas se guardan en WebP; juntas ocupan aproximadamente 200 KB y no se incluyen en `dist/`. El build completo contiene 35 archivos y 2,755,578 bytes antes de la compresión HTTP. El motor Three compartido ocupa 523.74 KB minificado / 134.42 KB gzip y conserva la advertencia informativa de Vite de chunk mayor a 500 KB. La guía agrega un JSON urbano de 22 KB; no agrega modelos descargados ni dependencias.

## Alcance de la comprobación

No se encontraron errores de aplicación, módulos ausentes, desbordamiento horizontal ni acciones principales inaccesibles en las vistas comprobadas. Se corrigieron los nombres recortados, etiquetas bajo paneles, contraste regional, tamaño táctil, solapamiento ficha/dock, movimiento bajo modales y controles 3D presentes en fallback.

No se midieron FPS ni memoria en teléfonos físicos y no se valida precisión arquitectónica, accesibilidad de rutas, habitaciones, inventario ni reservas. Alturas, fachadas y mobiliario siguen señalados como interpretativos. La publicación HTTPS se comprueba después del despliegue y se registra abajo.
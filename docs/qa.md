# Verificación del avance funcional

Inventario previo a QA: 26 de octubre de 2026. Pruebas sobre el servidor local mediante Playwright, con entrada de usuario y revisión visual separada. Este archivo se actualizará con los resultados.

| Flujo o control | Comprobación funcional | Estado visual a inspeccionar |
| --- | --- | --- |
| Inicio, menú, negocio, ayuda y créditos | Navegar entre las cuatro secciones, abrir/cerrar diálogos y regresar | Vista completa en escritorio, ventana nativa y móvil |
| Mapa Three.js | Canvas activo; arrastrar, zoom ±, centrar, capas, 2D/3D y pantalla completa | Relieve geográfico, satélite, ruta y marcadores legibles, sin superposición relevante |
| Selección y búsqueda | Abrir marcadores y foto; filtrar categorías, buscar municipio y limpiar | Destino seleccionado, filtro y estado sin resultados |
| Recorrido | Reproducir, esperar avance, pausar, volver a reproducir | Cámara/punto en tránsito y selección asociada |
| Paquetes | Cambiar ruta mediante tarjeta; filtrar publicados/borradores, buscar | Catálogo denso y ruta actual |
| Crear y editar | Elegir lugares, quitar, reordenar, completar campos, guardar y recargar | Editor, itinerario y paquete persistido |
| Validación | Intentar guardar sin destinos y precio inválido | Mensaje útil y borrador conservado |
| Eliminación | Cancelar confirmación; después borrar prueba | Colección restaurada y selección coherente |
| Negocio | Editar, guardar y recargar | Identidad en encabezado, vista del viajero e itinerario |
| Viajero | Abrir, recorrer paradas, descargar itinerario y volver a 3D | Portada, lista de lugares, inclusiones y precio |
| Adaptación | 1440×1000, 390×844 y ventana nativa | Sin recortes o desbordamiento; controles alcanzables |
| Accesibilidad y resiliencia | Teclado, Escape, foco modal; ruta de una parada; datos corruptos; WebGL deshabilitado | Fallback utilizable, estados vacíos y mensajes claros |

Exploración adicional: cambios rápidos entre filtros/cámara y creación con las seis paradas, además de una ruta de una sola parada. La exploración manual será de al menos 30 segundos con entradas reales.

Evidencia: capturas optimizadas y reporte de resultados se conservarán en `docs/`. Sin datos personales ni copias de almacenamiento reales.

## Resultado final

**Aprobado el 26 de octubre de 2026.** `npm run build` pasó con TypeScript estricto y Vite. Se comprobó además la compilación servida por Vite Preview en `http://127.0.0.1:5173/`, no solamente el servidor de desarrollo.

### Funcionalidad

- Creación con tres lugares, orden cambiado mediante botones, precio y capacidad personalizados, inclusiones, guardado y recuperación tras recargar.
- Edición del nombre, retirada de una parada y cambio de borrador a publicado. El paquete recién guardado permanece visible.
- Eliminación con cancelación y confirmación. Selección del mapa y paquete de respaldo coherentes.
- En móvil: creación y persistencia de una ruta con los seis destinos, previsualización de las seis paradas y eliminación posterior de los datos de prueba.
- Validación sin destinos; campos numéricos con restricciones nativas. Al simular cuota de almacenamiento agotada, el formulario mostró un error y conservó sus datos. JSON corrupto recuperó los tres ejemplos con aviso.
- Identidad del negocio: cambios sin guardar descartados al navegar; guardado y recuperación correctos; nombre inicial restaurado después del ensayo.
- Filtros de destinos: agua devuelve tres, cultura uno. Búsqueda por municipio y estado sin coincidencias. Seis destinos disponibles y creación desde una ficha con su parada preseleccionada.
- Filtros y búsqueda de paquetes. Vista del viajero, inclusiones y descarga real de `.txt` con saltos de línea, nombre, precio, duración y orden verificados.
- Cámara orbital comprobada con arrastre real y cambio de proyección de los pines; zoom, centrado, capas, 2D/3D y ciclo completo de pantalla completa.
- Recorrido: punto y cámara se desplazan; en ocho segundos la selección pasó de Puente de Dios a Tamul; pausa y regreso a 3D desde el viajero comprobados.
- Fallback: navegador lanzado con `--disable-webgl`; selección de Xilitla y Puente de Dios mediante clics normales, sin forzar eventos ni modificar estado interno.
- Ayuda con cuatro pasos, créditos con fuentes, cierre con Escape y foco contenido dentro del diálogo.

### Revisión visual

Se inspeccionaron por separado el inicio, 3D, 2D con curvas de nivel, reproducción en tránsito, editor, catálogo, negocio, diálogos de destino, ayuda/créditos, viajero y editor móvil denso con seis paradas.

- Escritorio: 1440 × 1000; ventana nativa: 1444 × 884, DPR 1.25.
- Móvil: 390 × 844; mínimo comprobado: 360 × 780.
- Sin desbordamiento horizontal en esos tamaños, ni recortes del encuadre inicial del terreno después de los ajustes. Los seis pines quedan dentro del mapa al centrar, tanto 2D como 3D.
- Puente de Dios y Tamasopo conservan anclajes geográficos y tienen indicadores separados mediante líneas de guía. En móvil, los nombres persistentes se reservan a la ruta y al lugar seleccionado.
- Fotografías cargadas y sin imágenes rotas. No se observaron errores JavaScript. Sólo se solicitaron recursos del origen local durante la ejecución.
- Exploración adicional de 38 segundos: cambios entre categorías y municipio, transiciones 2D/3D, reproducción/pausa, cambio de paquete, fichas de destinos y regreso al mapa desde el viajero móvil.

No se observaron superposiciones que impidan usar controles, texto cortado en diálogos ni fallos de recuperación en los flujos probados. No se afirma una auditoría WCAG completa ni pruebas en todos los navegadores.

### Evidencia optimizada

Todas las capturas son WebP. El conjunto ocupa aproximadamente 405 KB; no se conservan capturas PNG duplicadas.

- [Estudio en escritorio](screenshots/plataforma-desktop.webp)
- [Relieve cenital](screenshots/relieve-2d.webp)
- [Editor de paquetes](screenshots/creador-paquetes.webp)
- [Recorrido en tránsito](screenshots/recorrido-en-marcha.webp)
- [Inicio móvil](screenshots/plataforma-movil.webp)
- [Vista del viajero móvil](screenshots/viajero-movil.webp)

Los paquetes creados durante QA se eliminaron y se restauró la identidad de demostración. Las sesiones de prueba se cierran al entregar; el servidor local de la compilación se deja activo para revisar el avance.

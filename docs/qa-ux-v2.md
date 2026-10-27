# UX inmersiva — verificación

Inventario previo a pruebas, 26 de octubre de 2026.

| Experiencia | Función y cambio de estado | Revisión visual |
| --- | --- | --- |
| Áreas del territorio | Tarjeta, etiqueta y polígono seleccionan área; cámara se acerca, destinos y CTA conservan contexto | Región completa y cada área activa; guía de límites editoriales |
| Lugar en foco | Marcador y lista acercan la cámara; ventana abre el destino correcto | Pin, foto y título coincidentes; retorno a región |
| Recorrido por capítulos | Reproducción, pausa, siguiente/anterior, capítulo directo y slider sincronizan destino, punto y cámara | Tránsito real, pausa en etapa intermedia y llegada al final |
| Ritmo y perspectiva | Velocidad 0.5/1/2, seguir cámara, vista cenital, satélite/curvas, luz de día/atardecer, zoom, reinicio, fullscreen | Transiciones legibles y retorno correcto |
| Ventana al destino | Zoom, arrastre, puntos anclados, lectura de hotspot, puntos visibles/ocultos, reset y fotos anterior/siguiente | Foto sin recorte; annotations siguen imagen; escritorio/móvil |
| Editor conectado | Área crea borrador con sus destinos; foto crea borrador con ese destino; diseño de ruta conserva paquete | Formulario correcto y cambios persistidos |
| Continuidad | Cerrar foto conserva capítulo; cambiar de ruta reinicia progreso; ruta de una parada y orden editado | Estado coherente sin paneles obsoletos |
| Accesibilidad y adaptación | Focus modal, Escape, teclado, movimiento reducido, WebGL no disponible, anchos 360/390/1440 | Sin texto o controles recortados; alternativa utilizable |

Escenarios de exploración adicionales: seleccionar destino ajeno a ruta durante el recorrido, cambiar áreas rápidamente, avanzar fotos mientras está pausado, terminar/repetir recorrido y abrir editor desde foto dentro de fullscreen.

## Resultado de la ampliación

La compilación TypeScript/Vite pasó. QA con Playwright y entrada real en escritorio 1440×1050, móvil 390×844 y mínimo 360×780, sin errores JavaScript ni desbordamiento horizontal en los estados comprobados.

- Selección de polígonos por raycasting dentro de su superficie, hover visible y arrastre sin selección accidental. Cámara real por área o destino; retorno a región y tres etiquetas legibles. LOD contextual conserva seis marcadores accesibles.
- Capítulos alineados a la curva con `i/(N−1)`, avance manual mediante teclado y slider, pausa estable, ritmo 2×, llegada automática y repetición desde cero. Ruta de una parada válida. Editar orden dentro del mismo paquete reinicia progreso y sincroniza el nuevo primer capítulo.
- Avanzar fotografías y cerrar vuelve al capítulo correcto. Elegir un destino ajeno al paquete regresa a exploración con ámbito de fotos correcto. El contexto de un área se conserva al elegir sus miembros.
- Crear desde área preselecciona sus lugares; crear desde fotografía preselecciona ese destino. Flujo pantalla completa → fotografía → editor verificado con foco dentro del editor. Paquetes temporales eliminados después de QA.
- Ventana fotográfica: hotspots anclados a la imagen, ocultar/mostrar, zoom 100–180 %, reset, arrastre con mouse y táctil, siguiente/anterior, navegación envolvente y teclado. Escape restaura foco al control de origen.
- Luz de día/atardecer, perspectiva cenital/orbital, capas, zoom, seguimiento de cámara, pantalla completa y guía comprobados. El capítulo activo se desplaza horizontalmente dentro de su tira sin desplazar la página.
- Alternativa sin WebGL: áreas y destinos SVG utilizables, contexto del área y ventanas fotográficas funcionan. Movimiento reducido revisado.

## Verificación para Pages

Build con `VITE_BASE_PATH=/huasteca-inmersiva/` aprobado. La compilación se sirvió localmente en ese mismo subdirectorio y se comprobó canvas WebGL, imágenes, fuentes, fotografía y reproducción. Cero respuestas HTTP 4xx/5xx y cero errores JavaScript. Se normalizan también las rutas de portadas recuperadas de almacenamiento previo.

El conjunto de recursos públicos conserva 1,620,391 bytes; no se añadieron fotografías, modelos, videos ni dependencias. Los módulos de exploración y visor se cargan por separado. Las capturas de evidencia se guardan comprimidas en WebP, sin duplicados PNG.

Evidencia:

- [Atlas inmersivo](screenshots-v2/atlas-inmersivo.webp)
- [Ventana de Tamul y punto informativo](screenshots-v2/ventana-tamul.webp)
- [Recorrido por capítulos](screenshots-v2/recorrido-capitulos.webp)

## Publicación verificada

GitHub Actions completó **build** y **deploy** con éxito para el commit de aplicación `026bf35d9784efa8896482838a1ef0f62c56d6a2`.

- [Sitio público](https://impalagrim21.github.io/huasteca-inmersiva/)
- [Ejecución de publicación](https://github.com/ImpalaGrim21/huasteca-inmersiva/actions/runs/40449593946)
- GitHub Pages configurado con fuente `workflow` y HTTPS habilitado.
- Verificación remota mediante navegador sin inicio de sesión: HTTP 200, canvas Three.js activo, fotografías cargadas, área con tres destinos, fotografía de Puente de Dios, capítulo Tamul con avance 500/1000 y reproducción/pausa con progreso real. Cero errores JavaScript y cero respuestas 4xx/5xx.
- Sitio abierto y conservado como entrega en el navegador de la aplicación.
- [Captura del sitio público](screenshots-v2/github-pages-publicado.webp).

La compilación local se dejó nuevamente con base `/` para preservar el acceso de desarrollo; GitHub Actions utiliza la base del proyecto público. No se publican memoria local, dependencias, credenciales ni archivos de trabajo internos.

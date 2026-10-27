# Huasteca inmersiva

Avance funcional de un estudio para negocios turísticos de la Huasteca Potosina. El storyboard de dirección visual se traduce en cuatro flujos implementados: explorar lugares, construir un paquete, recorrerlo en 3D y previsualizar la experiencia del viajero.

## GitHub Pages

Dirección del avance: **https://impalagrim21.github.io/huasteca-inmersiva/**.

El workflow `.github/workflows/deploy-pages.yml` compila y despliega automáticamente los cambios de `main`. Usa Node.js 22, `npm ci`, TypeScript y Vite; sólo publica `dist/`. La base pública es `/huasteca-inmersiva/`, con imágenes, mapas y fuentes resueltos para ese subdirectorio. El desarrollo local conserva la base `/`.

Para comprobar localmente la misma compilación que publica Pages:

```powershell
$env:VITE_BASE_PATH = '/huasteca-inmersiva/'
npm run build
npm run preview
```

Al regresar al desarrollo en la raíz, retirar la variable de esa terminal con `Remove-Item Env:VITE_BASE_PATH` y volver a compilar.

## Ejecutar

Requiere Node.js 22.12 o superior compatible con Vite.

```powershell
npm install
npm run dev
```

Abrir **http://127.0.0.1:5173/**. El servidor se limita al equipo local.

```powershell
npm run build
npm run preview
```

`build` comprueba TypeScript y produce `dist/`. `preview` sirve esa compilación en el puerto que indica la consola. La aplicación es estática y no necesita variables de entorno, claves API ni servicios de pago.

## Lo que funciona

- **Atlas Vivo:** tres áreas seleccionables sobre el relieve y mediante tarjetas. La cámara se acerca al área o al destino, los marcadores ajustan su detalle al contexto y los lugares mantienen su relación con el territorio.
- **Recorrido por capítulos:** reproducción y pausa, salto directo entre paradas, avance manual, ritmos 0.5×/1×/2×, seguimiento de cámara, llegada al final y repetición. El tiempo del reproductor corresponde a la presentación visual, no a los traslados.
- **Ventanas al destino:** fotografías reales a pantalla completa con 18 puntos informativos, acercamiento, arrastre, navegación por teclado y retorno al mismo capítulo. Son imágenes interactivas, no panoramas 360 ni videos de un recorrido real.
- **Diseño desde el paisaje:** crear un paquete con los lugares de un área o con el destino abierto en su fotografía; editar la ruta que se está recorriendo.
- **Perspectivas del paisaje:** vista orbital/cenital, satélite/curvas de nivel, luz de día/atardecer, zoom y pantalla completa.
- Explorador Three.js/WebGL con relieve geográfico real (INEGI/Mapzen), imagen satelital histórica (NASA/Landsat), cámara orbital, zoom, centrado, capas hipsométricas, vista cenital, pantalla completa y recorrido animado. Si WebGL no está disponible, se ofrece una vista SVG utilizable.
- Seis atractivos reales con fotografías y fuentes: Tamul, Puente de Dios, Micos, Tamasopo, Las Pozas de Edward James y el Sótano de las Golondrinas.
- Catálogo con búsqueda, categorías y selección de rutas.
- Creación, edición y eliminación de paquetes: lugares, orden de visitas, descripción, duración, precio, capacidad, servicios y estado local.
- Persistencia de paquetes e identidad del negocio en `localStorage`, con validación de datos y gestión de errores de almacenamiento.
- Vista del viajero con fotos, itinerario, servicios, precio y descarga de un archivo de texto.
- Interfaz adaptable a escritorio y móvil, diálogos nativos con foco, navegación por teclado y respeto al movimiento reducido.

## Probar la experiencia inmersiva

1. En **Vista general**, elige «Agua que conecta» en el terreno o en su tarjeta. La cámara entra al área y aparecen sus lugares.
2. Elige Tamul y abre **Entrar al lugar**. Toca los puntos de interés; acerca y arrastra la fotografía. Regresa con Escape o **Volver al territorio**.
3. Abre **Vivir una ruta**. Elige un capítulo, arrastra el avance, cambia el ritmo o activa **Seguir cámara**. La foto y el capítulo permanecen sincronizados.
4. Usa **Crear ruta en esta área**, **Crear paquete con este lugar** o **Diseñar esta ruta** para continuar en el editor con las paradas correctas.

Las áreas son agrupaciones editoriales para explorar experiencias. Sus polígonos no son límites administrativos, zonas de acceso habilitado ni rutas autorizadas.

## Alcance de esta entrega

Es un prototipo local funcional. «Publicado» es un estado de demostración dentro del navegador. Los precios, permanencias, capacidad y servicios de los ejemplos son editables; no son tarifas comerciales verificadas. Las líneas del mapa muestran el orden de visita y no calculan carreteras ni tiempos de traslado.

El relieve usa alturas medidas y un mosaico satelital histórico de 2000. La elevación se exagera visualmente 4× para comunicar la forma de la sierra. Los marcadores son orientativos. El mapa no pretende representar el estado actual de los caminos o accesos.

Los datos locales pertenecen al navegador y al origen usados. No se sincronizan entre usuarios o dispositivos. Esta etapa todavía no incluye autenticación, aislamiento de cuentas de negocios, base de datos remota, reservas, cobros ni publicación pública. Esos elementos requieren una etapa de backend e integración.

## Dirección visual y archivos

- `src/App.tsx`: flujo del operador, editor y vista del viajero.
- `src/components/TerrainMap.tsx`: render y cámara 3D.
- `src/components/ImmersiveExplorer.tsx`: áreas, recorrido por capítulos, control de progreso y navegación contextual.
- `src/components/PhotoExperience.tsx`: visor fotográfico interactivo accesible.
- `src/experience-data.ts`: tres áreas, seis relatos y puntos de interés sobre fotografías verificadas.
- `src/data.ts`: datos iniciales y validación de paquetes persistidos.
- `public/images/`: fotografías WebP optimizadas; no se conservan originales duplicados.
- `public/maps/`: satélite WebP, heightmap PNG y metadatos del recorte geográfico, aproximadamente 500 KB en conjunto.
- `public/fonts/`: fuentes variables WOFF2 autoalojadas, 62 KB, con licencias OFL.
- `docs/concepto-storyboard.webp`: referencia generada de dirección de producto, 308 KB; no sustituye la aplicación.
- `docs/image-credits.md`: autores, licencias y fuentes de fotografías.
- `docs/destinations-research.md`: investigación y límites de información turística.
- `docs/map-sources.md`: fuentes geográficas, atribución, proyección, escala y peticiones reproducibles.
- `docs/qa.md`: cobertura y evidencia de pruebas.
- `docs/qa-ux-v2.md`: cobertura y evidencia de la ampliación inmersiva.

Three.js se carga como módulo separado cuando se abre el explorador. El paisaje se renderiza en el navegador y no descarga archivos de modelos 3D. Las fotografías del catálogo suman aproximadamente 1.05 MB. La app no hace llamadas a NASA, AWS o Google Fonts durante el uso; los recursos se sirven localmente. El renderer dibuja bajo demanda en reposo y se suspende con la pestaña oculta. Se reutilizan las dependencias del entorno para optimizar medios sin instalar herramientas adicionales.

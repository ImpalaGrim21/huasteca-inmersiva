# Huasteca inmersiva

Guía espacial de la Huasteca Potosina y estudio para crear experiencias turísticas. Permite descubrir pueblos, plazas, alojamientos, cultura, comida, servicios y naturaleza, y entender su entorno antes de guardar un lugar o consultar a su responsable.

La entrada principal es una guía del centro de Xilitla. El catálogo regional contiene **19 fichas**; **siete** también pertenecen al directorio local y **seis** se representan como pines interactivos. La ficha del pueblo de Xilitla funciona como ancla del centro y no añade un séptimo pin.

El estudio de paquetes mantiene el atlas, los recorridos por capítulos y el editor de los seis atractivos iniciales. La guía personal de lugares y los paquetes del operador son flujos distintos de esta entrega.

## Ver el proyecto

[**Abrir Huasteca inmersiva en GitHub Pages**](https://impalagrim21.github.io/huasteca-inmersiva/).

El workflow de [GitHub Pages](.github/workflows/deploy-pages.yml) compila los cambios de `main` con Node.js 22, `npm ci`, TypeScript y Vite; publica únicamente `dist/`. La base de producción es `/huasteca-inmersiva/` y la de desarrollo local es `/`.

## Ejecutar en local

Requiere Node.js 22.12 o superior compatible con Vite.

```powershell
npm ci
npm run dev
```

Abrir [http://127.0.0.1:5173/](http://127.0.0.1:5173/). El servidor se limita al equipo local.

Para compilar y revisar la versión de producción:

```powershell
npm run build
npm run preview
```

`build` comprueba TypeScript y genera `dist/`. `preview` muestra su dirección en la consola. La aplicación es estática; imágenes, fuentes, geometría urbana y mapas se sirven desde sus propios archivos.

Para probar específicamente la base de GitHub Pages, usar la misma variable al compilar y al iniciar el preview:

```powershell
$env:VITE_BASE_PATH = '/huasteca-inmersiva/'
npm run build
npm run preview
```

Abrir la ruta `/huasteca-inmersiva/` del puerto indicado. Para regresar al desarrollo en la raíz, detener el servidor, ejecutar `Remove-Item Env:VITE_BASE_PATH` y volver a compilar o iniciar desarrollo. Esta variable sólo configura la ruta pública; no es una credencial.

## Guía espacial entregada

- **Lugares con identidad:** directorio, búsqueda y filtros por pueblo, plaza, hospedaje, cultura, comida, servicios y naturaleza. Cada ficha enlaza evidencia oficial, documental o cartográfica y aclara los límites de su ubicación.
- **Dos escalas:** guía urbana de Xilitla y atlas regional de los 19 lugares. Los sitios de otros municipios conservan su contexto geográfico.
- **Selección y perspectiva:** elegir uno de los seis pines o su ficha lleva la cámara a la maqueta. Se puede alternar entre los puntos de observación «Llegada», «Entorno» y «Calle», y volver a la vista general.
- **Exploración a altura humana:** arrastrar para mirar, caminar con WASD/flechas o controles táctiles y cambiar el campo de visión con la rueda. La caminata respeta los límites de la escena y los volúmenes representados.
- **Previsualización coherente:** la miniatura se genera con la cámara de la propia maqueta. La interfaz la distingue de las fotografías reales.
- **Orientación:** plano urbano con calles, huellas, lugar seleccionado, posición de cámara y dirección de mirada; luz de día/atardecer, zoom, nombres, resaltado de trazas y pantalla completa.
- **Mi guía:** guardar y retirar lugares, recuperar la selección en este navegador, descargarla como texto y compartirla mediante un enlace que incluye sus IDs. Al abrir ese enlace se carga la lista compartida.
- **Escritorio y móvil:** ficha expandible, directorio, controles táctiles, diálogos y navegación por teclado. Las transiciones respetan la preferencia de movimiento reducido. Sin WebGL se dispone de planos SVG para consultar la geometría y seleccionar lugares.

Los seis pines locales corresponden a Jardín Hidalgo, templo/exconvento de San Agustín, Museo Leonora Carrington, Posada El Castillo, Hotel Hostal Del Café y Expendio de Café. Son referencias documentadas; la guía no acredita por sí sola que un negocio esté atendiendo hoy.

## Probar el flujo principal

1. Al abrir, reconoce el centro de Xilitla en vista general. Elige un lugar en el directorio o sobre la escena.
2. Una vez en perspectiva humana, arrastra para mirar y usa WASD/flechas o los botones táctiles para caminar. Usa **Despejar vista** para ampliar el entorno y **Ver ficha** para recuperar la información o cambiar entre **Llegada**, **Entorno** y **Calle**.
3. Usa el plano urbano para orientarte. **Volver a Xilitla** o Escape recuperan la vista general.
4. Guarda dos lugares con el marcador de la ficha. Abre **Mi guía**, descarga la selección y copia su enlace; ábrelo para recuperar esa lista.
5. Pulsa **Huasteca Potosina** en la navegación superior para explorar los lugares regionales y sus categorías. Las fichas de otros municipios no simulan una cámara dentro de Xilitla.
6. Entra a **Estudio** para explorar el atlas de experiencias, crear un paquete o editar sus paradas. **Guía inmersiva** en el menú del estudio regresa a la guía de lugares.

## Estudio de experiencias conservado

El atlas mantiene tres áreas editoriales, selección de destinos, vista cenital, capas, iluminación y recorridos por capítulos con pausa, avance manual, velocidad y seguimiento de cámara. Sus polígonos organizan la exploración; no son límites administrativos ni accesos autorizados.

Las seis fotografías reales de Tamul, Puente de Dios, Micos, Tamasopo, Las Pozas y el Sótano de las Golondrinas se exploran con acercamiento, arrastre y 18 anotaciones verificadas. Son fotografías interactivas; no capturas 360 ni recorridos grabados.

El editor permite crear, editar y eliminar paquetes con descripción, lugares, orden, duración, precio, capacidad, servicios y estado local. La vista del viajero presenta el itinerario y permite descargarlo. La identidad del negocio se guarda al confirmar el formulario.

## Geografía y alcance

La escena urbana deriva de OpenStreetMap: **35 huellas de edificios, 98 trazas, una plaza y un patio interior**, en un JSON de aproximadamente 22 KB. La selección de origen abarca 400 m alrededor de Jardín Hidalgo y las geometrías se recortan a ±450 m. La cobertura de edificios es parcial. Las alturas, fachadas y mobiliario son interpretativos; los puntos de observación pertenecen a esta representación. No se reproducen interiores ni vistas comprobadas desde habitaciones concretas.

El relieve regional usa elevaciones INEGI/Mapzen y un mosaico histórico NASA/Landsat de 2000, con altura visual exagerada 4×. Los marcadores son orientativos. La animación y las líneas de los paquetes no calculan carreteras, accesibilidad, trayectos habilitados ni tiempos de traslado.

La guía y las fuentes no constituyen inventario comercial. Las habitaciones, servicios y condiciones actuales se consultan con sus responsables. Los precios, capacidades y permanencias del estudio son datos de demostración editables; «Publicado» es un estado local de un paquete. Esta versión no tiene cuentas de negocios, sincronización remota, reservas ni cobros.

Guías, paquetes e identidad se guardan en `localStorage`, por navegador y origen. El enlace compartido transporta una selección de lugares; no sincroniza cambios posteriores entre personas ni confirma una contratación. La aplicación pública y un servidor local tienen almacenes distintos.

## Arquitectura, fuentes y evidencia

| Archivo o documento | Contenido |
| --- | --- |
| [SpatialGuide](src/components/SpatialGuide.tsx) | Guía, directorio, selección, ficha y lista personal. |
| [CityScene](src/components/CityScene.tsx) / [GuideMiniMap](src/components/GuideMiniMap.tsx) | Maqueta urbana, cámara, perspectivas y orientación. |
| [guide-data](src/guide-data.ts) / [geometría urbana](public/guide/xilitla-center.json) | Identidades, categorías, fuentes y geometría OSM del piloto. |
| [App](src/App.tsx) | Entrada a la guía y flujos del estudio, editor e identidad. |
| [ImmersiveExplorer](src/components/ImmersiveExplorer.tsx), [TerrainMap](src/components/TerrainMap.tsx), [PhotoExperience](src/components/PhotoExperience.tsx) | Atlas regional, recorridos y ventanas fotográficas. |
| [Fuentes urbanas](docs/guide-map-sources.md) / [investigación regional](docs/huasteca-guide-research.md) | Procedencia, coordenadas, consultas, verificación y datos desconocidos. |
| [Referente y adaptación](docs/referente-maestro-football-stadium.md) | Análisis de selección espacial, perspectiva y acción aplicado de forma original a turismo. |
| [Fuentes del relieve](docs/map-sources.md) | Elevación, satélite, proyección, escala y peticiones reproducibles. |
| [Créditos de imágenes](docs/image-credits.md) / [tipografías](docs/font-credits.md) | Autores, licencias y archivos locales. |
| [QA de guía v3](docs/qa-guide-v3.md), [QA inmersiva v2](docs/qa-ux-v2.md), [QA inicial](docs/qa.md) | Alcance y evidencia de las verificaciones de cada entrega. |

La geometría derivada de OSM se distribuye bajo [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) con atribución [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Las fotografías y fuentes conservan sus propias licencias. El aprendizaje del referente se documenta sin incorporar su código ni sus assets al producto.

Three.js y las escenas se cargan por módulos. La maqueta se genera a partir del JSON urbano; los recursos no requieren consultas a Overpass, NASA, AWS ni Google Fonts durante la exploración. Las fotos suman aproximadamente 1.05 MB, los mapas unos 500 KB y las dos fuentes variables unos 62 KB. Los originales de investigación en `.work/` quedan fuera de Git y del despliegue.

# Fuentes del primer prototipo de guía urbana

Fecha de preparación: 26 de octubre de 2026, hora de México. Este documento describe los datos de `src/guide-data.ts` y `public/guide/xilitla-center.json`. La investigación de producto y el catálogo ampliado están en [huasteca-guide-research.md](huasteca-guide-research.md).

## Qué contiene la guía

El catálogo inicial tiene 19 fichas: tres poblaciones/centros, una plaza, dos lugares culturales, cuatro alojamientos, dos referencias de comida, un canal institucional y los seis atractivos de la versión previa. «Naturaleza» conserva el grupo inicial; Las Pozas se describe expresamente como jardín escultórico, sin convertirlo en un espacio exclusivamente natural.

Las fichas usan `verification` para indicar el tipo de evidencia de identidad: `Oficial`, `Documental` u `OSM`. No certifica funcionamiento actual, calidad, disponibilidad, asociación comercial ni acceso físico. La procedencia de las coordenadas se aclara en `locationNote` y en este documento.

### Siete fichas locales y seis pines interactivos

Únicamente las siete fichas siguientes llevan `sceneId: 'xilitla-centro'`. Sus referencias geográficas están dentro de los 400 m seleccionados alrededor de la plaza. La ficha de Xilitla es un ancla de población; `SpatialGuide` la excluye de `localPlaces` por su categoría `Pueblos`. Por ello `CityScene` y el plano urbano reciben **seis pines interactivos**, mientras el directorio local conserva siete fichas. El catálogo regional incluye las 19 fichas totales, no 19 adicionales a las locales.

| ID | Identidad y fuente | Referencia espacial OSM |
| --- | --- | --- |
| `xilitla-centro` | [SECTUR: Xilitla](https://www.gob.mx/sectur/articulos/xilitla-san-luis-potosi). La plaza se usa como ancla editorial de la población, no como deslinde urbano ni pin independiente. | Ancla del way 405514351. |
| `jardin-hidalgo` | [Plaza Principal, Gobierno SLP](https://slp.gob.mx/lugares/plaza-principal-de-xilitla/). «Jardín Hidalgo» y «Plaza Principal» son nombres conservados en fuentes cartográficas/institucionales. | Way 405514351, `leisure=park`. |
| `convento-san-agustin` | [Xilitla, Gobierno SLP](https://slp.gob.mx/lugares/xilitla/), que identifica el Convento de San Agustín. | Relation 12111700, outer 641575505 e inner 890084670. OSM usa el nombre parroquial «Parroquia Inmaculado Corazón de María»; se conserva sin sobrescribirlo en la geometría. El punto de ficha es una referencia del volumen, no una entrada. |
| `museo-leonora` | [SIC, Secretaría de Cultura](https://sic.cultura.gob.mx/ficha.php?table=museo&table_id=2004), dirección Corregidora 103. | Node 6773103641. Es un punto; no se atribuye al museo una huella de edificio no identificada. |
| `posada-el-castillo` | [Sitio del establecimiento](https://www.elcastilloxilitla.com/) y [directorio turístico estatal de Xilitla](https://turismoslp.com.mx/Principal/Descargas/PM/Directorio-prestadores-Xilitla.pdf). | Node 2529359209, Melchor Ocampo 105. Sin huella individual confirmada en el extracto. |
| `hostal-del-cafe` | [Sitio del Hotel Hostal Del Café](https://www.hotelhostaldelcafe.com.mx/) y el mismo directorio estatal. El nombre no acredita dormitorios compartidos. | Way 1214869353, `building=yes`, `tourism=hotel`. |
| `expendio-cafe` | [Fuente cartográfica directa](https://www.openstreetmap.org/way/1214869337); identidad comercial y operación actual sin confirmar. | Way 1214869337, `amenity=cafe`, nombre OSM «Expendió de Café». |

Las otras fichas se mantienen en la guía regional. No reciben `sceneId` por compartir municipio ni se trasladan artificialmente al modelo del centro. El canal de información de Xilitla tampoco recibe `sceneId`: su coordenada es una referencia institucional del centro y no prueba la existencia de una oficina presencial en ese punto.

La Plaza Principal de Aquismón aparece en la investigación como lugar documentado, pero se dejó fuera de los datos de ejecución hasta verificar un punto preciso. No se reutilizó la etiqueta de población como si fuera la plaza.

## Geometría del centro

Origen WGS84 `[lat, lon]`: **[21.3852933, -98.9900642]**. Es el centro devuelto por Overpass para Jardín Hidalgo. El JSON guarda:

| Contenido | Resultado |
| --- | ---: |
| Edificios | 35 |
| Patios interiores conservados | 1 |
| Trazas | 98 |
| Trazas de calle | 62 |
| Trazas de escalones | 24 |
| Trazas peatonales/senderos | 12 |
| Polígonos de plaza | 1 |
| Árboles individuales importados | 0 |
| Vértices, incluidos cierres | 830 |
| Tamaño del JSON minificado | 22,278 bytes |

El archivo es una derivación de una respuesta original de **111,598 bytes** y 184 elementos de `https://overpass-api.de/api/interpreter`. La base OSM declara `2026-10-27T04:34:35Z`. El radio de selección fue de 400 m; se recortaron las geometrías completas devueltas a una caja de **−450 a +450 m** en ambos ejes para evitar segmentos lejanos.

La consulta reproducible está en [el informe de investigación](huasteca-guide-research.md#geometría-osm-piloto-real-del-centro-de-xilitla). Los originales de trabajo y estadísticas se conservan en `.work/ref/`, carpeta excluida de Git y del despliegue. El archivo público no duplica la respuesta original ni sus etiquetas, teléfonos o direcciones completas: conserva la geometría y los campos necesarios para representarla.

### Proyección y tratamiento

```text
x = (lon − lon_origen) × 111320 × cos(lat_origen)
z = −(lat − lat_origen) × 111320
```

`x` crece hacia el este y `z` hacia el sur. Es la misma proyección local de `guidePosition`. Las coordenadas se redondean a dos decimales de metro para compactar el archivo; esto no implica precisión topográfica de centímetros.

- Los caminos se recortaron por segmentos, conservando piezas separadas sin unir extremos artificialmente.
- Las huellas y la plaza se recortaron como polígonos. El patio del templo se conserva mediante `holes`, un campo opcional de `GuideGeometry`.
- Las etiquetas originales y los identificadores están disponibles en el extracto de trabajo; cada forma pública conserva un ID OSM trazable.
- No se añadió `levels`: **ninguno** de los 35 edificios tiene altura ni niveles documentados en el extracto. La escena debe mostrar las elevaciones de los edificios como esquemáticas, no medidas.
- La cobertura de edificios es parcial y se concentra al suroeste del centro; no es un modelo exhaustivo de la población. No se rellenaron huecos con casas inventadas.
- No se añadieron árboles decorativos como datos reales. Una consulta suplementaria de árboles individuales no obtuvo respuesta dentro del plazo en dos proveedores públicos. `trees: []` expresa que no se importaron posiciones, no ausencia física de árboles.

Los escalones de OSM no permiten prometer por sí solos una ruta accesible. La geometría tampoco demuestra pendientes de cada tramo, accesos habilitados, fachadas, puertas, interiores ni vistas desde una ventana.

## Datos regionales y estados desconocidos

Los puntos de Aquismón (node 4080629097), Ciudad Valles (node 292474264), Hotel Valles (way 504419640) y Hostal Casa Huasteca (node 6773119714) se comprobaron en una segunda consulta pequeña. Su respuesta original se conserva en `.work/ref/huasteca-entity-points-osm-2026-10-26.json`.

Hotel Valles tiene [fuente directa de dirección](https://hotelvalles.mx/contacto/) y [restaurantes](https://hotelvalles.mx/restaurantes/); su way OSM incluye `barrier=wall`, por lo que el punto se usa como referencia de propiedad, no como huella de recepción o comedor. Hostal Casa Huasteca está documentado en el [directorio turístico estatal](https://turismoslp.com.mx/Principal/Noticias/hoteles2020.pdf); sus dominios históricos no quedaron confirmados como canales activos, y no se añadió `websiteUrl`.

Las seis fotografías de los atractivos previos conservan los archivos locales y sus URLs resueltas por Vite. No se usaron esas fotografías como si mostraran hoteles o plazas. No se incorporaron nuevas imágenes de proveedores sin derechos de publicación documentados.

## Licencia

La geometría y los puntos derivados de OSM se distribuyen como datos bajo [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), con atribución **© OpenStreetMap contributors** y enlace a [copyright de OSM](https://www.openstreetmap.org/copyright). La escena conserva `attribution`, `source` y `heightNotice` para mostrar su procedencia y sus límites.

La licencia de esta base cartográfica es independiente de las fotografías, del código y de las capturas futuras de interiores. Los datos derivados y una visualización tienen tratamientos diferentes; se enlaza la [guía oficial de obras producidas](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline) en el informe de investigación.

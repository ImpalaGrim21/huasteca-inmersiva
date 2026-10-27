# Cartografía real del prototipo

## Textura satelital

`public/maps/huasteca-satellite.webp` contiene un recorte geográfico real de la Huasteca Potosina, obtenido de NASA GIBS. No es una imagen generada ni una fotografía de cascada aplicada al relieve. El satélite muestra sierras, valles, ríos y áreas pobladas de la región.

- Fuente: NASA Global Imagery Browse Services (GIBS), capa `Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual`.
- Dataset: NASA Global Web-Enabled Landsat Data Annual Global 30 m V031 (GWELDYR, versión 3.1).
- Tiempo solicitado al servicio: `2000-12-01`. **Es un mosaico histórico de la época 2000, no una vista actual ni un servicio en tiempo real.** La fecha del servicio identifica un producto compuesto; no equivale a la fecha de adquisición de todos sus píxeles.
- Autoría del dataset: Roy, David y Zhang, Hankui (2019), NASA Land Processes Distributed Active Archive Center. [DOI y ficha oficial](https://doi.org/10.5067/MEaSUREs/GWELD/GWELDYR.031).
- Resolución nominal del dataset original: 30 m. La textura de visualización se sirve y remuestrea a una resolución menor; no debe presentarse como detalle de 30 m en pantalla.
- Salida: WebP, calidad 80, 1224 × 1600 px, 447,614 bytes. Sólo se conserva el resultado final; la imagen de respuesta se procesó en memoria sin guardar teselas ni originales duplicados.
- Procesado: recorte WMS en Web Mercator y compresión WebP, sin alteración generativa del paisaje.
- Fecha de consulta y descarga: 26 de octubre de 2026.

### Coordenadas y alineación

El bbox exacto en WGS84 es oeste `-99.5`, sur `21.35`, este `-98.8`, norte `22.2`.

La textura está proyectada en **EPSG:3857**. Bbox en metros:

```text
west  = -11076289.333930722
south =   2433661.6158086867
east  = -10998365.690375429
north =   2535554.6198507366
```

La primera fila corresponde al norte y la primera columna al oeste. Para alinear DEM, pines y textura:

```text
merc(lat) = 6378137 × asinh(tan(lat × π / 180))
u = (lon - west) / (east - west)
v = (merc(north) - merc(lat)) / (merc(north) - merc(south))
```

Aquí `v = 0` corresponde a la fila superior de la imagen. Three.js puede requerir la inversión de `v` al construir sus UV, según el ajuste `flipY` de la textura. Los parámetros y la petición reproducible están guardados en `public/maps/huasteca-satellite.json`.

### Uso, atribución y fuentes

NASA publica el dataset abierto sin restricciones conforme a EOSDIS Data Use and Citation Guidance. Mantener la atribución y no insinuar respaldo de NASA al producto. El mapa es una visualización turística orientativa, no un cálculo vial ni cartografía para navegación.

Atribución breve recomendada para la interfaz: **«NASA GIBS · USGS/Landsat · WELD · mosaico histórico 2000»**.

Fuentes oficiales:

- [Ficha de NASA Earthdata y cita del dataset](https://doi.org/10.5067/MEaSUREs/GWELD/GWELDYR.031).
- [NASA Open Data Portal: dataset y licencia de obra gubernamental](https://data.nasa.gov/dataset/nasa-global-web-enabled-landsat-data-annual-global-30-m-v031-37b9c).
- [NASA Earthdata: política de datos y citas](https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy).
- [NASA GIBS: acceso por servicios estándar](https://nasa-gibs.github.io/gibs-api-docs/access-basics/).
- [Capacidades WMTS de GIBS](https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml).

Se evaluó ArcGIS World Imagery. Su capa estándar no está destinada a exportación offline y la capa de exportación tiene requisitos de cuenta y uso ArcGIS; por ello no se almacenó contenido de Esri en este prototipo. [Documentación oficial de World Imagery for Export](https://www.arcgis.com/home/item.html?id=226d23f076da478bba4589e7eae95952).

## Elevación

`public/maps/huasteca-heightmap.png` contiene alturas medidas del mismo recorte, descargadas del archivo público **Mapzen Terrain Tiles en AWS**, formato Terrarium, zoom 10. No se utiliza ruido procedural, una montaña generada ni un río dibujado para sustituir el territorio.

- Atribución regional requerida por el proveedor: **Source: INEGI, Continental relief, 2016**. El mosaico global puede combinar también SRTM/GMTED2010, cortesía de USGS. Distribución: Mapzen/Tilezen, AWS Open Data.
- Fuente y política: [Registry of Open Data on AWS](https://registry.opendata.aws/terrain-tiles/) y [atribuciones oficiales Tilezen/joerd](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).
- [Formato Terrarium documentado por Mapzen](https://www.mapzen.com/blog/terrain-tile-service/): `elevation_m = red × 256 + green + blue / 256 − 32768`.
- Descarga: nueve teselas originales de zoom 10, columnas 228–230 y filas 447–449. La lista reproducible está en `public/maps/huasteca-dem.json`.
- Procesado: decodificación a metros antes del remuestreo, mosaico en memoria, recorte exacto en EPSG:3857, reducción bilineal a 320 × 418 y cuantización lineal gris de 8 bits. El PNG final pesa 47,301 bytes. No se conservan las teselas originales duplicadas.
- El recorte remuestreado tiene rango codificado `−79` a `2895` m. El renderer limita muestras negativas a cero; las pequeñas anomalías del DEM no se presentan como altitud exacta de un lugar. La cuantización tiene un paso aproximado de 11.7 m.
- Malla: 184 × 240 segmentos, alturas muestreadas bilinealmente. Tamaño de la maqueta proporcional al recorte Mercator, con **exageración vertical visual 4×**, expresamente distinta de una escala vertical métrica. Las curvas hipsométricas se calculan sobre ese DEM en intervalos de 500 m.
- Las seis posiciones de interés son coordenadas aproximadas WGS84. Puente de Dios y Tamasopo están próximos de forma real; sus etiquetas se desplazan en pantalla para leerlas, manteniendo el anclaje de sus pines.
- La ruta luminosa conecta puntos de visita en su orden; **no representa una carretera, una trayectoria navegable ni tiempos de traslado**. La cámara y el punto animado recorren esa línea ilustrativa.
- Todos los activos se sirven localmente. La aplicación no consulta NASA, AWS ni servicios de cartografía durante su uso.

La capa predeterminada muestra el mosaico Landsat histórico sobre el DEM. El control de capas permite pasar a una lectura hipsométrica con curvas de elevación. Esta representación sirve para explorar y comunicar una experiencia turística; no reemplaza cartografía profesional ni una validación de accesos.

# Datos del prototipo L1 Universitaria · Ciudad Valles

Consulta pública: **28 de octubre de 2026**. Archivo de producto: [line-reference.json](../../src/mobility/data/line-reference.json).

El conjunto contiene **27 puntos cartográficos de paradas**, agrupables en 14 nombres, y **cuatro referentes de destino**. No contiene vehículos, ETA, horario, trazo ni orden de viaje inventados. No constituye un padrón completo ni una validación de operación vigente de SCT.

## Qué podemos afirmar

La [publicación del Gobierno de SLP](https://slp.gob.mx/noticias/2026/3/11/redmetro-de-valles-supera-12-millones-de-viajes-y-m%C3%A1s-apoyo-a-las-familias-ricardo-gallardo/) identifica la **Línea 1 Universitaria** y su conexión con el Tecnológico de Ciudad Valles, IMSS, Centro y UASLP Campus Huasteca. El cuerpo está fechado **14-02-2026**, aunque la URL diga marzo. Esa publicación confirma destinos, no las coordenadas de ascenso, sentidos ni una secuencia de paradas.

El [anuncio de febrero de 2025](https://slp.gob.mx/noticias/2025/2/7/ricardo-gallardo-define-las-nuevas-rutas-de-metrored-en-valles-y-rioverde/) enumera paradores previstos antes de la apertura. Otro [comunicado de agosto de 2025](https://slp.gob.mx/noticias/2025/8/18/ciudad-valles-vivir%C3%A1-una-nueva-era-de-movilidad-con-la-red-metro-ricardo-gallardo/) proyectaba 32 estaciones y accesibilidad. Ninguno permite certificar hoy el inventario completo o las condiciones físicas de cada parada.

Por ello el producto debe identificar las paradas incluidas como **“cartografía comunitaria; operación y sentido por confirmar”**. La fecha de consulta del catálogo no debe convertirse en una etiqueta de revisión operativa de campo.

## Paradas OSM: fuente libre y extracción

Se encontró en la API primaria de OpenStreetMap el [nodo Hospital General IMSS](https://www.openstreetmap.org/node/13135322255), con:

- `amenity=bus_station`, `public_transport=station` y `network=Red Metro Linea 1`.
- Fecha de levantamiento declarada por el colaborador: `survey:date=2025-09-10`.
- Una posición propia del parador, distinta del centro del hospital.

Su [historial público](https://api.openstreetmap.org/api/0.6/node/13135322255/history.json) llevó al [changeset 171760284](https://www.openstreetmap.org/changeset/171760284). Se leyó su [exportación de cambios](https://api.openstreetmap.org/api/0.6/changeset/171760284/download), de aproximadamente 20 KB, para descubrir IDs de puntos etiquetados explícitamente como L1. Después se volvieron a consultar **todos los IDs únicos en su versión actual**, mediante la API `nodes.json`, y se conservaron únicamente los que todavía tenían nombre y esa etiqueta de red.

Este procedimiento recuperó 27 puntos. No fue una extracción exhaustiva de todas las paradas de Valles: **que un nodo no esté incluido no significa que su parada no exista**. Las consultas Overpass probadas no devolvieron una extracción utilizable por fallos de acceso/tiempo; no forman parte del runtime ni de la prueba de cobertura. Se comprobó la ausencia de relaciones asociadas al nodo del IMSS consultado; eso tampoco demuestra que no haya otras relaciones de ruta en OSM.

Los nombres encontrados son Avenida México, CBTis, El Consuelo, Hospital General IMSS, La Estrella, Lienzo Charro, Morelos, Mujeres en Solidaridad, Plaza Nobel, Reforma, Rotarios, Tauro, Tecnológico y Zona Centro. Hay varios pares de puntos con el mismo nombre. **No se asignó cada lado a un sentido por proximidad, orientación de calle o posición en el listado.** Cada ID es independiente, y `directionId` y `sequence` permanecen `null`.

Se conserva el nombre OSM “Plaza Nobel”; “Plaza Punto Novel” se añade como alias de búsqueda por su denominación publicada y cercanía cartográfica. La aliasación no valida el nombre oficial del parador ni sustituye la revisión física. El listado está ordenado alfabéticamente para consulta, no como secuencia de recorrido.

Cada punto conserva `sourceUrl`, `osmUpdatedAt`, `osmVersion` y `surveyDate`. `verification: "community-mapped"` describe su procedencia y no debe presentarse como autorización o revisión de SCT. La precisión efectiva del levantamiento no se publicó; no asignamos una precisión métrica arbitraria. Tampoco se dispone de verificación por parador de rampas, cruces, sombra, iluminación o accesibilidad.

## Referentes separados de las paradas

| Referente | Fuente OSM primaria | Método del punto | Limitación |
| --- | --- | --- | --- |
| UASLP Campus Huasteca | [way 300701643](https://www.openstreetmap.org/way/300701643) | Centro de la caja envolvente del área | No identifica entrada ni paradero. |
| Hospital IMSS Zona 6 | [way 305081744](https://www.openstreetmap.org/way/305081744) | Centro de la caja envolvente del área | No confundir con el parador homónimo. |
| Zona Centro | [node 8112808286](https://www.openstreetmap.org/node/8112808286) | Etiqueta cartográfica de barrio | “Centro” es una zona; este punto no es una terminal. |
| Tecnológico de Ciudad Valles | [way 300145888](https://www.openstreetmap.org/way/300145888) | Centro de la caja envolvente del área | No identifica acceso peatonal seguro o accesible. |

Los cuatro objetos se consultaron directamente en la API de OSM. Las áreas se leyeron con `/full.json`, sin guardar polígonos completos, para calcular un punto de orientación. Mapcarta se usó únicamente para descubrir IDs; el dato incorporado procede de OSM y conserva esa atribución.

La lista `references` está separada de `stops`, lleva `isStop: false` y no se debe incorporar a la búsqueda de “parada más cercana” como si fueran puntos de ascenso. La distancia calculada entre puntos es geodésica; no representa una ruta peatonal, tiempo de caminata o accesibilidad.

## Mapa comunitario externo encontrado

[Mi RedMetro – Ciudad Valles – Riviera Huasteca](https://www.google.com/maps/d/viewer?mid=1YwkNdZRe3yNWuj9GI4SlCybkmUQDs4Q) contiene capas de L1, L2, L3 y Riviera Huasteca. Su metadata pública muestra como creador visible a **Joel Centeno**. La [página huastecapotosina.org](https://huastecapotosina.org/red-metro) lo atribuye a SCT, pero en esta investigación no se encontró un enlace gubernamental al mismo mapa ni una licencia de reutilización.

El KML público se inspeccionó en memoria para identificar su alcance; no se copiaron coordenadas, líneas, iconos ni geometría a los archivos del producto. Su descripción está vacía. El prototipo puede ofrecer un enlace externo rotulado **“Mapa comunitario externo; vigencia y autoría institucional pendientes de confirmar”**. Que Google permita abrir o exportar el KML no demuestra que SCT lo publique ni que se autorice reutilizar sus datos en otro mapa.

Tampoco se adoptaron los horarios y frecuencias de esa página turística: son distintos de otros anuncios y no quedaron validados para L1 actual.

## Qué sí funciona sin un feed SCT

- Explorar y buscar los puntos cartográficos disponibles, con su fuente y fecha.
- Guardar una parada identificada por ID y abrir su ubicación.
- Ver la propia ubicación del pasajero si concede permiso; ordenar por distancia geodésica sin anunciar un tiempo de caminata.
- Consultar los cuatro destinos documentados y distinguirlos del punto de ascenso.
- Acceder al [registro QR oficial](https://redmetrovalles.sctslp.com/), cuya portada indica ese mecanismo de acceso. Se leyó únicamente la información pública; no se consultó el padrón.
- Mostrar ausencia de conexión al seguimiento, sin buses en movimiento, conteos ficticios ni cuenta regresiva de llegada.

No se puede afirmar que el servicio esté abierto/cerrado ahora, cuál es su última salida, qué sentido debe abordar el usuario, si un punto sigue atendido, cuánto tardará el autobús o si un acceso cumple condiciones de movilidad reducida. Esos datos permanecen vacíos.

## Sustitución por datos SCT

Para habilitar una guía operativa deben recibirse catálogo vigente de paradas/IDs, sentidos, viajes y calendario, trazo operativo con variantes, fechas de vigencia y condiciones de reutilización. Los IDs de OSM son IDs locales del prototipo; no se deben adivinar equivalencias con IDs de SCT. La correspondencia debe registrarse explícitamente al integrar el feed.

Para seguimiento se requiere una fuente autorizada con hora real de captura y asignación a línea/sentido/viaje; para ETA, predicciones recibidas y validadas o un modelo contrastado con llegadas observadas. En la referencia inicial `geometry`, horario, frecuencias y salidas son `null`, y las listas de vehículos y llegadas están vacías.

## Licencia, coordenadas y tamaño

Los puntos derivados de OSM se distribuyen con atribución **© Colaboradores de OpenStreetMap** y [ODbL 1.0](https://www.openstreetmap.org/copyright). El archivo JSON conserva la atribución, enlace y procedencia de cada objeto; deben mantenerse en la interfaz y en cualquier redistribución de estos datos. Es una base derivada cartográfica, separada de la licencia de la app, de las noticias citadas y del mapa base OpenFreeMap.

Coordenadas WGS84 en orden **`[longitud, latitud]`**, compatible con GeoJSON/MapLibre. No se descargaron imágenes, mapas raster, modelos, extractos nacionales ni repositorios. El conjunto inicial JSON ocupa alrededor de 21 KB y permite servir las consultas de orientación sin llamadas a OSM o Overpass por cada pasajero.

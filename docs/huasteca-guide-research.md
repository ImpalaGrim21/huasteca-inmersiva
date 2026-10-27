# Huasteca: guía de lugares, estancias y vida local

Investigación documental del 26 de octubre de 2026, hora de México. Alcance: Xilitla, Aquismón y Ciudad Valles, conservando los seis atractivos iniciales. Los datos del primer prototipo y sus límites se describen en [guide-map-sources.md](guide-map-sources.md); este informe no afirma disponibilidad ni operación actual de los lugares.

La oportunidad es construir una guía del territorio en la que una cascada, un pueblo, una plaza y un alojamiento tengan espacio propio. El paquete turístico puede conectar esos lugares, pero no debe ser el único objeto que permita descubrirlos.

El prototipo derivado presenta 19 fichas regionales. Siete también aparecen en el directorio local de Xilitla; seis se dibujan como pines, porque la ficha del pueblo es un ancla y no un lugar puntual adicional. La implementación y sus flujos actuales se describen en el [README](../README.md); las propuestas de interiores y habitaciones de este informe conservan su carácter de investigación.

## Qué significa cada estado de información

- **verified:** el dato concreto aparece en una fuente identificada. Se debe guardar si la comprobación es documental oficial, una declaración del establecimiento o una geometría comunitaria. No significa inspección física ni disponibilidad actual.
- **editorial:** selección de lugares, títulos de zonas, relatos, recomendaciones de orden y propuestas de interfaz creadas para la plataforma. No implican afiliación comercial ni límites administrativos.
- **unknown:** no hay evidencia suficiente. Se conserva `null`, se omite de la ficha o se invita a consultarlo al responsable. No se completa con una estimación presentada como real.

Las coordenadas siguientes son referencias orientativas en formato **[latitud, longitud]**, no accesos verificados. Un punto OSM de población no equivale al centro de su plaza, y una geometría de propiedad no demuestra dónde está la recepción.

## Primer catálogo con fuentes

### Tres centros urbanos

| ID propuesto | Lugar y municipio | Hecho documental que puede mostrarse | Ancla orientativa / alcance | Fuente oficial |
| --- | --- | --- | --- | --- |
| `xilitla-centro` | Xilitla, cabecera de Xilitla | Pueblo y centro urbano con plaza, patrimonio, espacios culturales y actividad cafetalera. | `[21.38529, -98.99006]`, centro de la geometría OSM de Jardín Hidalgo, usado como ancla editorial del centro. | [SECTUR: Xilitla](https://www.gob.mx/sectur/articulos/xilitla-san-luis-potosi), [Ayuntamiento: ubicación](https://2024-2027.xilitla-slp.gob.mx/index.php/xilitla). |
| `aquismon-centro` | Aquismón, cabecera de Aquismón | Pueblo con plaza, templo, actividades culturales y relación con los atractivos de su municipio. | `[21.62430, -99.01982]`, etiqueta OSM `place=town`, nodo 4080629097. **No usar como coordenada de la plaza.** | [SECTUR: Aquismón](https://www.gob.mx/sectur/articulos/aquismon-san-luis-potosi), [Turismo SLP: Aquismón](https://turismo.slp.gob.mx/lugares/aquismon/). |
| `valles-centro` | Ciudad Valles, municipio de Ciudad Valles | Centro de servicios y punto de partida regional. | `[21.99166, -99.01030]`, etiqueta OSM de ciudad, nodo 292474264. No es un deslinde del centro ni un punto de reunión confirmado. | [Turismo SLP: Ciudad Valles](https://turismo.slp.gob.mx/lugares/ciudad-valles/). |

La zona editorial «Xilitla centro» puede comenzar alrededor de la plaza con una selección de 400 m. Las otras zonas requieren definir y verificar sus límites de exploración; no deben reutilizarse polígonos arbitrarios como si fueran barrios oficiales.

### Dos plazas

| ID propuesto | Lugar | Municipio | verified | unknown |
| --- | --- | --- | --- | --- |
| `plaza-xilitla` | Plaza Principal de Xilitla / Jardín Hidalgo | Xilitla | La ficha estatal identifica la plaza y dirección Jardín Hidalgo 103. México es Cultura describe un espacio plurifuncional con kiosco. OSM conserva el polígono como `Jardín Hidalgo`, `loc_name=Plaza Principal`, way 405514351, alrededor de `[21.38529, -98.99006]`. | Estado físico actual del kiosco, restricciones de acceso del día, agenda futura y accesibilidad efectiva. |
| `plaza-aquismon` | Plaza Principal de Aquismón | Aquismón | Gobierno estatal documenta su uso cultural en septiembre de 2026; otra publicación estatal identifica el kiosco de la plaza. | Coordenada precisa de la plaza, perímetro, accesos, rampas y condiciones actuales. Mantener geometría `null` hasta comprobarla. |

Fuentes: [Plaza de Xilitla, Gobierno SLP](https://slp.gob.mx/lugares/plaza-principal-de-xilitla/), [Plaza de Xilitla, México es Cultura](https://mexicoescultura.com/recinto/67057/plaza-principal-de-xilitla.html), [actividad cultural en la plaza de Aquismón, Gobierno SLP](https://imes.slp.gob.mx/noticias/2026/9/19/semujeres-visibiliza-derechos-y-participaci%C3%B3n-de-mujeres-ind%C3%ADgenas-y-con-discapacidad/), [referencia al kiosco de Aquismón](https://slp.gob.mx/noticias/2025/7/11/todo-listo-para-la-tercera-fecha-del-serial-trail-m%C3%A1gico/).

### Dos hoteles y un hostal reales

| ID propuesto | Nombre comercial / municipio | verified y web | Coordenada orientativa | Acción inicial adecuada |
| --- | --- | --- | --- | --- |
| `posada-el-castillo` | Posada El Castillo / Xilitla | Su [sitio propio](https://www.elcastilloxilitla.com/) presenta alojamiento, habitaciones, desayunador y contacto. El directorio turístico estatal registra la dirección Melchor Ocampo 105 y el mismo dominio. | `[21.38610, -98.99014]`, punto OSM 2529359209. El punto no define habitación ni acceso. | «Conocer la estancia» y «Consultar con el alojamiento». Es candidato útil para el piloto del centro porque está dentro del extracto OSM de 400 m. |
| `hotel-valles` | Hotel Valles / Ciudad Valles | [Web propia](https://hotelvalles.mx/), [contacto y dirección](https://hotelvalles.mx/contacto/): Boulevard México-Laredo 36 Norte, zona centro. El sitio presenta habitaciones y restaurantes. | `[21.99153, -99.01067]`, centro del way OSM 504419640. Sus etiquetas incluyen `barrier=wall`; no asumir que sea la huella de un edificio. | «Explorar espacios» y «Consultar esta categoría de habitación». |
| `hostal-casa-huasteca` | Hostal Casa Huasteca / Ciudad Valles | El [directorio turístico estatal de hospedaje](https://turismoslp.com.mx/Principal/Noticias/hoteles2020.pdf) registra nombre y dirección General Blas Escontría 610. [Visita Ciudad Valles](https://visitaciudadvalles.com/hospedaje) también presenta la propiedad como hostal. | `[21.98716, -99.01341]`, nodo OSM 6773119714, `tourism=hostel`. | «Conocer el hostal» con evidencia documental. Antes de habilitar contacto comercial, verificar el canal actual del establecimiento. |

**Límites de la verificación:** la existencia documental y las páginas propias de los hoteles están comprobadas. No se comprobó inventario, operación del día, propiedad de cada habitación ni condiciones de contratación actuales. Los dominios históricos de Casa Huasteca (`hostalhuasteca.com` y `hostalcasahuasteca.com`) no pudieron abrirse en esta revisión; no deben presentarse como canales activos confirmados. La identidad institucional del portal Visita Ciudad Valles no se tomó como sustituto del directorio estatal.

El Hotel Valles publica la categoría [Primera Clase](https://hotelvalles.mx/accommodation/primera-clase/) y describe vista a jardines. Esto es una **declaración verificada del proveedor**, no una comprobación visual desde una habitación concreta ni disponibilidad para fechas elegidas. Los conteos de cuartos de OSM y del sitio del hotel difieren: no usarlos como inventario.

**Candidato regional adicional:** [Hotel Tapasoli](https://tapasoli.com.mx/) está en Apetzco, municipio de Xilitla; su [página de habitaciones](https://tapasoli.com.mx/habitaciones/) distingue secciones de «Madriguera» y muestra «Nido» como próximo. Sirve como caso de diseño: una foto o un tipo anunciado no acredita que una unidad esté disponible. No se incorporan tarifas, tiempos de llegada ni un marcador de acceso sin validación adicional.

**Candidato adicional dentro del piloto urbano:** [Hotel Hostal Del Café](https://www.hotelhostaldelcafe.com.mx/) coincide en nombre y teléfono con el [directorio estatal de Xilitla](https://turismoslp.com.mx/Principal/Descargas/PM/Directorio-prestadores-Xilitla.pdf). El way OSM 1214869353 aporta una huella. El sitio y OSM lo presentan como hotel: que la marca contenga «Hostal» no demuestra dormitorios compartidos. No reutilizar sus fotografías sin una licencia o autorización adecuada.

### Dos servicios culturales y de restauración

| ID propuesto | Lugar y servicio | Municipio | verified | unknown / CTA |
| --- | --- | --- | --- | --- |
| `museo-leonora-xilitla` | Museo Leonora Carrington Xilitla: experiencia cultural y exposición | Xilitla | La [Secretaría de Cultura, SIC](https://sic.cultura.gob.mx/ficha.php?table=museo&table_id=2004) y [Cultura SLP](https://cultura.slp.gob.mx/lugares/museo-leonora-carrington-xilitla/) confirman el museo en Corregidora 103. OSM 6773103641: `[21.38544, -98.99076]`. | Exhibición y servicios operativos del día, permisos para capturar interiores, acceso vigente y programación. CTA «Explorar su historia» / «Consultar visita». |
| `la-palapa-valles` | Restaurante La Palapa, espacio de restauración vinculado a Hotel Valles | Ciudad Valles | El [sitio directo de restaurantes del hotel](https://hotelvalles.mx/restaurantes/) y su [contacto](https://hotelvalles.mx/contacto/) identifican el restaurante. Su ubicación hereda la propiedad del hotel, no un asiento o acceso del comedor. | Menú, mesas, horarios, apertura a personas no hospedadas y disponibilidad actuales. CTA «Conocer el entorno» / «Consultar al restaurante». |

Los mercados, cafés, talleres y comercios deben ser tipos de lugar disponibles desde el modelo. No se asigna en este informe un mercado específico de Xilitla a partir de una mención genérica a «mercados»; faltan nombre, ubicación e identidad de sus responsables.

### Conservar los seis atractivos iniciales

El catálogo inicial contiene **seis atractivos**, no seis sitios exclusivamente naturales: Las Pozas es un jardín escultórico y paisaje cultural.

| ID existente | Nombre / municipio | Coordenada orientativa | Fuente oficial o directa |
| --- | --- | --- | --- |
| `tamul` | Cascada de Tamul / Aquismón | `[21.801, -99.180]` | [Turismo municipal de Aquismón](https://2024-2027.aquismon-slp.gob.mx/index.php/cascada-de-tamul). |
| `puente` | Puente de Dios / Tamasopo | `[21.932, -99.416]` | [Portal turístico de SLP](https://experiencias.visitasanluispotosi.com/directory/puente-de-dios-en-tamasopo/); describe una oferta histórica de operador, no disponibilidad actual. |
| `tamasopo` | Cascadas de Tamasopo / Tamasopo | `[21.939, -99.397]` | [Sitio del parque](https://cascadasdetamasopo.com.mx/). |
| `xilitla` | Jardín Escultórico Edward James, Las Pozas / Xilitla | `[21.397, -98.997]` | [Sitio del Jardín](https://laspozasxilitla.org.mx/). |
| `golondrinas` | Sótano de las Golondrinas / Aquismón | `[21.600, -99.099]` | [SEGAM](https://segam.slp.gob.mx/areas-naturales-protegidas/sotano-de-las-golondrinas/). |
| `micos` | Cascadas de Micos / Ciudad Valles | `[22.103, -99.155]` | [Portal turístico de SLP](https://experiencias.visitasanluispotosi.com/directory/salto-de-cascadas-en-micos-y-nacimiento-de-tanchipa/); misma limitación de oferta histórica. |

Las referencias geográficas de esta tabla se documentan en `docs/destinations-research.md`; no representan embarcaderos, taquillas ni lugares de reunión. No se trasladan precios, horarios ni servicios de las fuentes a una oferta comercial.

## Modelo de información propuesto

La jerarquía de navegación puede ser **Territorio → Zona → Lugar → Espacios y puntos → Servicios → CTA**. Las relaciones del dominio deben permitir que un lugar tenga varios servicios y que una experiencia editorial conecte varios lugares sin duplicarlos.

| Entidad | Campos y relación necesarios | Ejemplo |
| --- | --- | --- |
| `Territory` | `id`, `name`, descripción editorial, alcance geográfico con procedencia. | Huasteca Potosina. |
| `Zone` | `territoryId`, nombre, `kind: urban_center / exploration_area`, geometría y estado de verificación. | Xilitla centro; área editorial del agua. Una no sustituye a la otra. |
| `Place` | `zoneIds`, `kind`, nombre público, municipio, posición, geometría, `providerId?`, fuentes por dato. | Plaza, hotel, hostal, museo, mercado, restaurante, paraje. |
| `Space` | `placeId`, `kind`, nombre, relación con piso/sector sólo si existe evidencia. | Jardín, terraza, sala, comedor, categoría de habitación o unidad identificada por el hotel. |
| `Viewpoint` | `spaceId?`, ubicación y orientación de captura, medios, fecha, procedencia, calidad geométrica. | Ventana de una habitación concreta; entrada a un museo; un punto en la plaza. |
| `Service` | `placeId`, `providerId`, tipo y descripción comprobada; vínculo opcional con un `Space`. | Hospedaje, restauración, visita cultural, guía acompañada, transporte. |
| `GuideExperience` | Relato editorial, capítulos, `placeIds`, `viewpointIds`, autor y versión. | Un paseo visual por el centro, separado de un servicio presencial contratado. |
| `CTA` | Tipo de acción, destino, responsable, evidencia del canal; integración opcional. | Explorar, guardar, añadir a un plan, consultar al proveedor. |

Cada campo factual debería acompañarse de `state: verified | editorial | unknown`, `evidenceIds`, fecha y `verificationMode: official_document | provider_claim | open_map | on_site`. Un único sello «verificado» en toda la ficha ocultaría que la dirección está comprobada pero la vista de una habitación aún no lo está.

Separar `RoomType` de `RoomUnit`: una categoría comercial puede agrupar muchas habitaciones con vistas distintas. `availability`, precios, horario, aforo, política y accesibilidad deben permanecer desconocidos hasta tener una fuente vigente o integración; no deducirlos de fotografías, del número de camas dibujadas ni de etiquetas OSM.

## Cómo ayudar a elegir antes de contratar

Estas propuestas son **editoriales**, no funcionalidades ya implementadas:

1. **Entender dónde se va a estar.** Acercarse desde la región al centro urbano, reconocer plaza, calles y escalones, ubicar el alojamiento y sus espacios públicos. Un modo plano debe acompañar al 3D.
2. **Ver el lugar desde una posición concreta.** Abrir una fotografía identificada, una panorámica real cuando exista o un recorrido capturado. Conservar el nombre del espacio y fecha de captura. Una imagen plana sigue llamándose fotografía, aunque permita explorar su encuadre.
3. **Comparar habitaciones por entorno.** En Hotel Valles, comenzar con «Primera Clase: vista a jardines descrita por el alojamiento». Para mostrar «esta es la vista desde tu ventana», hacen falta captura vinculada a una unidad o categoría, posición, orientación y confirmación del hotel; no basta una foto de sus jardines.
4. **Mantener la continuidad entre exterior e interior.** Un usuario puede pasar de la plaza de Xilitla al acceso de una estancia, su terraza y un punto de vista autorizado. La geometría urbana OSM sirve al exterior; los interiores necesitan captura o documentación propia.
5. **Elegir actividades con contexto.** Desde la plaza, abrir historia del museo, detalles visuales y servicios cercanos, guardarlos en un plan y después consultar al responsable. La duración de una animación no se usa como tiempo de traslado.
6. **Cerrar con una acción concreta y honesta.** «Consultar esta habitación», «Preguntar por la visita» o «Ir al sitio del establecimiento». «Reservar» sólo cuando exista un canal operativo externo claramente identificado o una integración real. No mostrar una compra confirmada usando inventario de demostración.

Las capturas de hoteles deben obtenerse del responsable con permiso para publicarlas y con identificación del espacio. El archivo de medios debe conservar autoría, licencia/autorización, fecha, posición/orientación y si representa una unidad concreta, una categoría o un área común.

## Geometría OSM: piloto real del centro de Xilitla

### Resultado obtenido

Se ejecutó una consulta pequeña al proveedor público `https://overpass-api.de/api/interpreter`, seleccionando elementos en torno al polígono de Jardín Hidalgo / Plaza Principal. No se descargaron mosaicos de mapas ni fotogrametría de terceros.

- Centro de selección: `[21.3852933, -98.9900642]`, obtenido del way OSM **405514351**.
- Radio: **400 m**. La consulta devuelve las geometrías completas de las vías seleccionadas; algunas pueden extenderse más allá del radio.
- Respuesta: **111,598 bytes**, 184 elementos: 49 nodos, 134 vías y una relación.
- **35** elementos con `building`; **cero** con `height` y **cero** con `building:levels`.
- **98** vías con `highway`, entre ellas 24 tramos de escalones, nueve senderos peatonales y una vía `pedestrian`.
- Polígono de plaza de cinco posiciones, incluido su cierre. También hay puntos de Posada El Castillo, Museo Leonora Carrington y una huella de Hotel Hostal del Café.
- Fecha base OSM del extracto: `2026-10-27T04:34:35Z` (noche del 26 de octubre en México).

Archivos de referencia locales, sin importación en la aplicación:

- `.work/ref/xilitla-centro-osm-400m-2026-10-26.json`: respuesta original.
- `.work/ref/xilitla-centro-osm-400m-2026-10-26.overpassql`: consulta reproducible.
- `.work/ref/xilitla-centro-osm-400m-2026-10-26.metadata.json`: resumen, fuente, fecha y atribución.
- `.work/ref/huasteca-entity-points-osm-2026-10-26.json`: puntos complementarios de Aquismón, Ciudad Valles, Hotel Valles y Hostal Casa Huasteca.

Consulta utilizada:

```overpassql
[out:json][timeout:25][maxsize:8388608];
(
  way(around:400,21.3852933,-98.9900642)["highway"];
  way(around:400,21.3852933,-98.9900642)["building"];
  relation(around:400,21.3852933,-98.9900642)["building"];
  nwr(around:400,21.3852933,-98.9900642)["place"="square"];
  nwr(around:400,21.3852933,-98.9900642)["leisure"="park"];
  nwr(around:400,21.3852933,-98.9900642)
    ["amenity"~"^(townhall|place_of_worship|marketplace|restaurant|cafe)$"];
  nwr(around:400,21.3852933,-98.9900642)
    ["tourism"~"^(museum|hotel|hostel|guest_house)$"];
);
out body geom;
```

### Qué se puede modelar a partir de estos datos

**verified como geometría comunitaria:** trazado de las calles seleccionadas, ubicaciones OSM, polígono de plaza y huellas existentes. La descarga conserva identificadores y etiquetas para rastrear cada forma. No equivale a un levantamiento topográfico ni a una comprobación física actual.

**editorial / esquemático:** materiales, vegetación ornamental, iluminación, simplificación de fachadas, anchos cuando falten y toda altura sin dato. Como ninguna huella del extracto trae altura ni niveles, no presentar extrusiones como mediciones reales. Se puede comenzar con huellas planas o volúmenes declarados esquemáticos y sustituirlos cuando haya mediciones.

**unknown:** interiores, habitaciones, vista desde cada ventana, puertas habilitadas, rampas, aforo, permisos de entrada y estado de negocios. Los nombres de POI de OSM son pistas de investigación, no altas comerciales verificadas. Por ejemplo, conservar y cotejar las etiquetas del templo con las fuentes patrimoniales antes de unificar nombres históricos y actuales.

Para generar una escena original: proyectar las coordenadas a metros locales, construir líneas/superficies con IDs OSM, conservar huecos y miembros de multipolígonos y unir el relieve con una fuente de elevación identificada. Exportar a GLB es una decisión posterior de formato; no convierte el modelo en una captura 3D ni justifica inventar detalles arquitectónicos. Los escalones requieren tratamiento visual propio y revisión antes de ofrecer navegación peatonal o accesible.

Fuentes técnicas primarias: [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API), [geometrías completas](https://dev.overpass-api.de/overpass-doc/en/full_data/osm_types.html). El proveedor público sirve para esta extracción puntual; el producto publicado debería servir una copia preparada o usar infraestructura adecuada, no depender de Overpass en cada visita. Véase [uso compartido del servicio](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html).

### Licencia y atribución

Los **datos** OSM se ofrecen bajo **ODbL 1.0**, distinta de la licencia del software Overpass. Mostrar una atribución visible «© OpenStreetMap contributors» enlazada a [copyright de OSM](https://www.openstreetmap.org/copyright) y señalar la licencia de los datos. Conservar fuente, consulta, fecha e identificadores del extracto y de sus derivados.

Una base derivada distribuida y una obra producida, como una visualización, tienen obligaciones diferentes. No asumir que el código de la aplicación o todo modelo artístico adopta automáticamente ODbL. Para distribuir geometría derivada, aplicar las condiciones de la base y revisar la [guía oficial sobre obras producidas](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline), la [licencia íntegra ODbL](https://opendatacommons.org/licenses/odbl/1-0/) y las [pautas de atribución](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines).

## Decisión sugerida para el siguiente avance

Probar primero **Xilitla centro**: plaza y traza OSM, ficha del museo, una estancia del centro y puntos visuales con procedencia. La guía regional mantiene Aquismón, Ciudad Valles y los atractivos iniciales, y permite alternar «Pueblos», «Dónde quedarse», «Cultura y vida local» y «Naturaleza». El catálogo, las estancias y los servicios deben poder explorarse sin crear un paquete.

Antes de convertir una estancia en una experiencia interior navegable, faltan medios autorizados y correspondencia entre espacios, capturas y tipos/unidades reales. La primera entrega puede mostrar el entorno real y una ficha documentada sin simular una reserva ni una vista desde una habitación todavía no capturada.

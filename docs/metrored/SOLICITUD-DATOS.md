# Borradores para SCTSLP: datos de MetroRed Huasteca

Preparados el 28-10-2026. **No enviados.** Ajustar nombre del solicitante, representación y alcance antes de usar. La primera vía busca documentos existentes; la segunda, colaboración operativa. Ninguna supone un permiso ya otorgado.

## A. Solicitud de información documental

**Destinatario:** Unidad de Transparencia de la Secretaría de Comunicaciones y Transportes del Gobierno del Estado de San Luis Potosí.

**Asunto:** Datos y documentación existentes de rutas y sistemas de información de RedMetro en Ciudad Valles y Riviera Huasteca.

Solicito acceso en formato electrónico a los siguientes documentos y conjuntos de datos existentes, correspondientes al servicio urbano de Ciudad Valles y al corredor regional Ciudad Valles–Tamazunchale, con corte a la fecha de respuesta:

1. Inventario vigente de líneas, sentidos, variantes y recorridos autorizados y operativos. Distinguir L1, L2, L3 urbana y Riviera Huasteca; incluir cambios provisionales por obras y sus fechas de vigencia.
2. Catálogo de paradas/paradores con identificador, nombre, coordenadas, orden por sentido, líneas que atienden cada parada y, cuando exista, información de accesibilidad. Entregar archivos GTFS, GeoJSON, KML, CSV, GIS o formatos originales disponibles.
3. Calendarios, días de servicio, horarios de primera y última salida, frecuencias, salidas por cabecera y tiempos programados por parada, si se dispone de ellos. Distinguir programación de datos observados.
4. Identificación del área responsable de operación, despacho, actualización de rutas y administración del sistema de monitoreo/localización de unidades. Aclarar si el monitoreo incorpora geolocalización exportable y en qué sistemas.
5. Documentación existente de API, feed GTFS/GTFS Realtime, servicios web o mecanismos de intercambio para posiciones, viajes, llegadas y alertas. Indicar URL pública, condiciones de acceso, cobertura, actualización, licencia y mecanismo de alta para terceros, cuando existan.
6. Identificación del proveedor y versión pública de contratos/anexos técnicos relacionados con localización y exportación de datos de la flota de Valles y Riviera Huasteca. Interesan específicamente disponibilidad de interfaces, titularidad y derechos de reutilización de datos operativos.
7. Documentos que establezcan la política de publicación de información al pasajero, aplicaciones o portales oficiales existentes y condiciones para reutilizar rutas, paradas y posiciones.

Se solicita distinguir información existente de proyectos anunciados y datos de Valles de los de la zona metropolitana de la capital. Si un archivo no existe, agradeceré que se precise qué área conserva la información equivalente y en qué formato. Esta solicitud no pide crear una API nueva ni proporcionar credenciales, padrón de beneficiarios, identidades de operadores, cámaras, botones de pánico o información de seguridad.

La finalidad es evaluar una herramienta pública de orientación y movilidad con información verificable. Se prefiere entrega electrónica en formatos originales reutilizables y documentación de las limitaciones conocidas.

## B. Propuesta de colaboración técnica

**Destinatario:** SCTSLP, área operativa RedMetro y responsable del monitoreo que la Secretaría designe.

**Asunto:** Evaluación de piloto de información al pasajero en MetroRed Ciudad Valles.

Estamos evaluando una aplicación pública que permita consultar rutas y paradas vigentes, ubicación observada de unidades y llegadas estimadas. Solicitamos una reunión técnica para determinar si es posible reutilizar la infraestructura existente mediante un acceso autorizado y limitado.

Proponemos comenzar con una línea urbana y una muestra de unidades, en cantidad y duración acordadas con ustedes. Antes de desarrollar la integración necesitamos confirmar:

- Titular de los datos, facultad de autorizar su publicación y proveedor técnico encargado.
- Paquete estático vigente y versión: líneas, sentidos, tramos provisionales, paradas, viajes, calendarios y frecuencias.
- Fuente de posiciones: API/GTFS-RT existente o exportación posible. Identificador estable de unidad, latitud/longitud, hora real de captura y asignación a línea/sentido/viaje; precisión y rumbo cuando estén disponibles.
- Si existen TripUpdates/llegadas, alertas y cancelaciones; cómo se vinculan con IDs de paradas y viajes.
- Entorno o muestra de prueba, autenticación, límites de consulta, intervalo de actualización, cobertura, responsable de incidencias y mecanismo de cambios.
- Condiciones de reutilización, atribución, caché, conservación, redistribución, costos si los hubiera y finalización del acceso. El canal público contendría sólo los datos operativos acordados.

Durante el piloto compararíamos la posición recibida y las llegadas previstas con observaciones de campo. La interfaz distinguiría “programado”, “estimado con datos recientes” y “sin actualización”, mostrando la hora de captura. No presentaría movimiento ficticio como seguimiento real.

No necesitamos acceso al padrón QR, INE, CURP, nombres de operadores, video ni funciones de control de seguridad. Si no existe una interfaz de localización aprovechable, proponemos evaluar con ustedes un piloto autorizado de captura; sus costos y responsabilidades se definirían por separado.

**Canales institucionales publicados para canalizar, pendientes de respuesta:** [SCT](https://sct.slp.gob.mx/), 444 812 0677, atencionciudadana.sctslp@gmail.com. El aviso de [RedMetro Valles](https://redmetrovalles.sctslp.com/) publica la Unidad de Transparencia, extensión 116 y sct.transparencia23@gmail.com. El portal SCT enlaza la Plataforma Nacional de Transparencia. No se efectuó contacto mediante ninguno de estos medios.

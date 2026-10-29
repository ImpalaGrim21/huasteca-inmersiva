# Creative Ideation aplicado al proyecto completo

**Mi RedMetro / Valles en ruta · 28 de octubre de 2026.** Aplicación de `creative-ideation` v2.1.0, [NousResearch/hermes-agent, commit fijado](https://github.com/NousResearch/hermes-agent/tree/83bde48a4d9760d84220a9b29094a1ad86410f6e/optional-skills/creative/creative-ideation). La evaluación de procedencia, lecturas, licencia y tamaños está en `.work/metrored-prototype/skills/creative-evaluation.md`.

**Dirección del proyecto:** ayudar a una persona a preparar y realizar su traslado en Valles, con la menor incertidumbre que permitan los datos disponibles. La apariencia de precisión no sustituye una parada verificada, un sentido o una llegada observada.

La aplicación profunda del skill se organiza en **ciclos separados**, cada uno con un método, una decisión y una comprobación. No consiste en ejecutar sus 22 métodos ni en añadir funciones por volumen. La solicitud actual prioriza servicio básico, utilidad y datos honestos; esa dirección prevalece sobre preferencias del skill por rareza, número de propuestas o estilo.

## Base real y límites de evidencia

El [estudio de necesidades](INVESTIGACION-USUARIOS.md) reúne 16 fuentes documentales. Hay señales locales de desinformación sobre costo/QR, presión de demanda, cambios de parada y problemas de acceso peatonal; también hay experiencias positivas sobre orientación humana y gratuidad. No son 16 entrevistas propias ni una encuesta representativa.

El prototipo trabaja con un catálogo parcial de **27 coordenadas comunitarias OSM**, no con un padrón operativo de SCT validado. A/B distingue puntos; no acredita sentidos. La integración de posiciones/llegadas está preparada, pero sin fuente autorizada conectada. Las coordenadas de referencia, el calendario, la operación actual, la accesibilidad y la telemetría tienen niveles de confirmación diferentes.

No se toman como actuales el cierre temporal de CBTIS de 2025, horarios de Año Nuevo de 2025/2026 o la pausa de L3 anterior a su inauguración de octubre. Tampoco se atribuyen a MetroRed Valles las denuncias de combis de La Lima ni el cierre de un grupo de seguimiento de la capital.

## Ciclo 1: inversión para proteger la decisión del pasajero

Método: **inversión, Charlie Munger vía Carl Jacobi**, según [la referencia del skill](https://github.com/NousResearch/hermes-agent/blob/83bde48a4d9760d84220a9b29094a1ad86410f6e/optional-skills/creative/creative-ideation/references/methods/premortem-and-inversion.md). Se usa como comprobación de una propuesta cercana a implementación, sin fingir un premortem grupal.

La pregunta de diseño es concreta: ¿qué haría que alguien frente al IMSS o camino al Tecnológico se equivocara de punto, de sentido o de expectativa por confiar en nuestra pantalla?

| Fallo que debemos evitar | Decisión en el proyecto | Cómo comprobarlo |
| --- | --- | --- |
| Confundir punto comunitario con parada actual de L1 | Mostrar origen cartográfico y operación/sentido sin confirmar; conservar identidad y fuente de cada punto. | La tarjeta no contiene “parada oficial” ni trazo/secuencia inventados. |
| Tratar A/B como ida/vuelta | Etiquetas neutrales y confirmación con operador; no elegir un sentido por la posición relativa. | Cambiar A/B sólo cambia el punto; no calcula viaje ni destino de autobús. |
| Interpretar el punto azul del pasajero como una unidad | Diferenciar ubicación propia, hora de captura y precisión; ningún marcador de autobús si no llega un dato autorizado. | Con cero posiciones recibidas hay cero unidades dibujadas, incluso después de recarga o reconexión. |
| Confiar en la ubicación propia después de caminar varias calles | Mostrar antigüedad y ofrecer actualización deliberada, sin historial continuo. | La hora proviene de la observación del navegador; no se rejuvenece al renderizar. |
| Entender una fecha reciente como inspección de campo | Separar levantamiento, edición cartográfica, consulta documental y validación operativa. | Una edición de OSM de hoy no convierte un punto en operativo ni accesible. |
| Reenviar una ficha y perder su advertencia | Compartir nombre, fuente, fecha y límites junto con el enlace. | El texto copiado conserva esas condiciones fuera de la app. |
| Publicar una nota privada al compartir | Almacenar y exportar información personal por rutas de datos separadas. | Una nota distintiva, posición GPS y texto de reporte no aparecen en tarjeta pública ni URL. |
| Encontrar una interfaz bonita que no se puede leer o tocar | Tipografía legible, contraste y controles cómodos; alternativa de lista y navegación sin canvas. | Probar móvil, zoom, teclado, foco y error de carga del mapa con tareas reales. |

**Resultado del ciclo:** la honestidad del dato se convierte en comportamiento comprobable. Las advertencias dejan de ser un pie de página que el pasajero debe interpretar solo.

## Ciclo 2: SCAMPER para ampliar el viaje cotidiano

Método: **SCAMPER, Bob Eberle, a partir de Alex Osborn**, [referencia fijada](https://github.com/NousResearch/hermes-agent/blob/83bde48a4d9760d84220a9b29094a1ad86410f6e/optional-skills/creative/creative-ideation/references/methods/scamper.md). Base precisa: una guía móvil que busca y guarda referencias de L1, muestra su ubicación comunitaria y prepara la recepción de datos de SCT.

Se cubrieron las siete transformaciones del método —sustituir, combinar, adaptar, modificar, dar otro uso, eliminar y reorganizar— para ampliar una base existente. Se seleccionan **tres resultados**, en vez de entregar siete variantes sin desarrollo. Son propuestas concretas para esta implementación; su rendimiento con pasajeros aún debe medirse.

### 1. El punto se convierte en una pregunta que se puede mostrar

Una persona selecciona una referencia como “Hospital General IMSS” y necesita decidir si la unidad le sirve. La guía no conoce el sentido ni el punto operativo actual. La transformación combina la referencia con una tarjeta de comunicación y amplía su texto, en lugar de inventar una instrucción de viaje.

**Mecanismo:** acción “Mostrar al operador”. Una tarjeta nativa de letra grande presenta una pregunta sobre el destino o el punto seleccionado. Si la intención se puede confundir entre origen y destino, se elige expresamente “Quiero llegar aquí” o “Busco dónde abordar”. Ejemplo de consulta: “Quiero ir a Hospital IMSS. ¿Esta unidad me lleva? ¿Dónde debo bajar?”. Un rótulo explica que se pide confirmación. Volver conserva punto y contexto.

**Relación con las fuentes:** S4 valora la información humana del operador; S6/S7 muestran que el acceso importa; S15, de capital, sólo refuerza una hipótesis adicional sobre claridad. No se atribuye a la entrevista una validación de esta tarjeta.

**Para quién y límite:** facilita mostrar una pregunta en una calle ruidosa o cuando cuesta navegar instrucciones pequeñas. No es una respuesta de SCT, traducción certificada, garantía de atención ni confirmación de ruta. No necesita micrófono, voz generada, cuenta o modelo de IA.

**Primer paso y costo:** HTML/CSS y estado local, sin nuevo servicio. Probar intención, volver, foco y lectura móvil. El éxito se comprueba con personas que puedan explicar la pregunta y reconocer que la ruta sigue sin validar.

### 2. La referencia viaja con su contexto; la nota personal se queda

Compartir sólo un enlace supone que el destinatario tiene red, abre la app y comprende A/B. La transformación reduce la guía a una ficha portátil, combinando el dato geográfico con su procedencia. Paralelamente elimina la necesidad de una cuenta para guardar un recordatorio propio.

**Mecanismo público:** copiar nombre, Punto A/B si procede, referencia cartográfica, fuente OSM, fecha de levantamiento, operación/sentido pendientes y enlace estable. Una descarga de texto pequeña puede añadirse por acción explícita; no implica descargar el mapa. La ficha no lleva ubicación del pasajero ni una nota privada.

**Mecanismo privado:** un favorito admite una nota breve del usuario, por ejemplo “Preguntar por acceso con rampa”. Se etiqueta “Sólo en este navegador”, con edición y borrado. La nota se separa del catálogo y del serializador público. Es un recordatorio personal, no una inspección ni un aviso comunitario. Si el almacenamiento falla, se informa el alcance de sesión.

**Para quién y límite:** útil para un familiar que comparte una referencia o una persona que repite un traslado. Esa preferencia es una hipótesis de diseño, no una demanda cuantificada. La ficha puede quedar antigua; por eso conserva fecha y límites. “Local” no significa cifrado o secreto frente a otras personas que usen el mismo navegador. No sugerir guardar documentos o datos sensibles.

**Primer paso y costo:** ampliar el formato copiado y el guardado local existentes; sin backend. Probar un texto privado reconocible y verificar que no sale por enlace, clipboard público o descarga. La generación del archivo, si se implementa, sólo ocurre al pedirlo.

### 3. La ausencia de un dato produce el siguiente paso útil

La transformación reorganiza la secuencia: antes de exigir al pasajero explorar funciones, la guía responde qué puede saber ahora y qué debe confirmar. La incertidumbre no termina en un panel vacío.

**Mecanismo:** si no hay ETA, permanece la referencia, sus límites y una consulta contextual a SCT u operador. Si la ubicación propia envejece, aparece su antigüedad y “Actualizar mi ubicación”; la acción no activa seguimiento permanente. Si el mapa falla, lista y fichas siguen disponibles. Si no está confirmado el último servicio, la guía formula qué preguntar y evita publicar una hora inventada.

**Relación con las fuentes:** S1/S2 sustentan acceso y claridad; S5/S8/S9 muestran vigencia; S10/S11 obligan a distinguir cobertura. S14 aporta una hipótesis de valor de seguimiento desde capital, sin convertirla en GPS de Valles.

**Fallo y tradeoff:** depender de una llamada no garantiza respuesta ni resuelve capacidad. La guía puede verse menos “en vivo”, pero reduce promesas falsas. La refrescabilidad no garantiza mayor precisión: siempre se muestra la precisión del dato obtenido.

**Primer paso y costo:** estados de interfaz y lectura de fecha de captura existente. No requiere cuentas, infraestructura ni descargas nuevas. Probar permisos negados, captura antigua, fuera de zona y reconexión.

## El viaje completo y sus condiciones de servicio

| Momento | Qué necesita resolver la persona | Qué se construye o prepara ahora | Qué necesita otra fase |
| --- | --- | --- | --- |
| **Preparación** | Costo, registro, referencia habitual y regreso posible | Gratuidad con fuente, QR oficial externo, búsqueda manual, favorito y nota local, datos faltantes visibles. | Calendario vigente confirmado y primer/último servicio por cabecera. |
| **Camino al punto** | Reconocer ubicación sin confundir cercanía con accesibilidad | Mapa/lista, ubicación propia opcional refrescable, distancia recta etiquetada, fuente y fecha. | Accesos peatonales inspeccionados, cruces y rutas de caminata verificadas. |
| **Abordaje** | Confirmar línea, destino, sentido y acceso | Pregunta grande al operador y ficha de referencia; A/B no significa dirección. | Catálogo SCT por sentido, destino de unidad y reglas de abordaje vigentes. |
| **Durante el viaje** | Recordar la referencia de destino sin falsa navegación | Mantener la referencia elegida y permitir mostrar/copiar la pregunta. No decir “faltan dos paradas”. | Orden de paradas, asignación a viaje y fuente fresca para avance; aviso de descenso probado en el dispositivo. |
| **Regreso** | Ubicar retorno y evitar quedarse sin servicio | Consultar y preparar la pregunta de regreso; no invertir A/B automáticamente ni inferir última salida. | Sentidos, horarios especiales y última salida confirmados por fecha. |
| **Incidencia** | Describir lugar, momento y unidad a un canal responsable | Borrador manual con contexto y contacto institucional; diferenciar copiar de enviar. | Sistema real de recepción, seguimiento, responsables y plazos si se acuerda con SCT. |
| **Consulta sin red** | Conservar lo que ya puede leer y reconocer límites | Página abierta, favoritos locales y texto portátil si se ofrece; aclarar que recarga y mapa offline no están garantizados. | Caché/PWA con prueba de recarga, versión, renovación y licencias de recursos; no precargar tiles por reflejo. |

No se anuncia como implementado en esta entrega un navegador de transporte completo. Algunas necesidades sólo se cubren con una pregunta útil o con una limitación visible hasta contar con el dato correcto.

## Ciclo 3: Pattern Languages para sostener la experiencia

Método: **Pattern Languages, Christopher Alexander y colaboradores**, [referencia fijada](https://github.com/NousResearch/hermes-agent/blob/83bde48a4d9760d84220a9b29094a1ad86410f6e/optional-skills/creative/creative-ideation/references/methods/pattern-languages.md). Se adapta su forma contexto–problema–solución a este proyecto. Los siguientes son patrones de trabajo propuestos, no reglas universales validadas con miles de casos.

### Contexto operativo separado de referencia cartográfica

**Contexto:** llegan datos OSM y documentación parcial antes de un catálogo SCT. **Problema:** una interfaz puede mezclar coordenada, línea, sentido, acceso y horario como si tuvieran la misma certeza. **Solución:** cada capacidad conserva su fuente y estado; el dato comunitario no obtiene autorización por estar dentro de la pantalla L1. Por tanto, el catálogo cartográfico y la futura relación con paradas/viajes SCT se validan por separado. Completa los patrones de identidad y relojes.

### Identidad del punto conservada al cambiar de vista

**Contexto:** la misma referencia se busca, guarda, comparte y selecciona en el mapa. **Problema:** letras A/B o posición en una lista pueden cambiar y romper la interpretación. **Solución:** usar ID estable, no índice o nombre, para selección y guardado; mantener las letras de pares consistentes en la versión del catálogo. Una futura equivalencia OSM↔SCT es una tabla revisada, no una coincidencia automática de nombres. Por tanto, cambiar orden visual no cambia la identidad. Sostiene ficha portátil y favoritos.

### Información pública y recordatorio privado por caminos distintos

**Contexto:** una tarjeta útil tiene datos del punto; el usuario agrega una nota y puede otorgar ubicación. **Problema:** serializar todo el estado para compartir filtra información personal. **Solución:** el formato público selecciona campos permitidos del catálogo; las notas viven en un almacenamiento local separado y se renderizan como texto. Por tanto, compartir no equivale a exportar el estado de sesión. Completa identidad y formulario de reporte.

### Cada reloj indica qué observó

**Contexto:** hay fechas OSM, consulta documental, ubicación del pasajero y futuras capturas de unidades. **Problema:** “actualizado” puede rejuvenecer un dato antiguo. **Solución:** separar levantamiento, edición, recepción y observación; la frescura se calcula sobre captura, nunca sobre rerender o descarga. Por tanto, un ping de conexión no convierte una posición vieja en reciente. Vincula cartografía, ubicación propia y cliente SCT.

### La lista permite completar la tarea cuando falla el mapa

**Contexto:** teléfonos modestos, WebGL ausente o proveedor de tiles no disponible. **Problema:** un canvas único puede dejar sin acceso a búsqueda, guardados, ayuda y datos. **Solución:** estas acciones pertenecen al HTML, con estado común al mapa, y mantienen foco/contexto tras entrar y volver de una ficha. Por tanto, el mapa amplía orientación sin ser el único control. Completa tarjeta de consulta y fuentes.

### Una observación autorizada habilita sólo lo que demuestra

**Contexto:** puede llegar una API de posiciones sin secuencia de paradas ni predicciones. **Problema:** tratar “feed disponible” como permiso para todo el sistema genera ETA o sentidos ficticios. **Solución:** habilitar por capacidad y calidad: posiciones recientes; después asociación a línea/viaje; luego catálogo; después predicciones verificadas. Por tanto, un contrato de integración preparado no significa SCT conectado. Vincula relojes y contexto operativo.

En conjunto, estos patrones conectan catálogo, preferencias, selección, mapa y cliente SCT. No requieren añadir otra biblioteca de estado o duplicar backend por defecto.

## Decisiones de alcance de esta entrega

| Mejora elegida | Mecanismo verificable | Datos y costo adicional | Evidencia necesaria para darla por entregada |
| --- | --- | --- | --- |
| **Pregunta al operador** | Vista nativa grande desde referencia, con intención clara y retorno al punto | Datos existentes; sin API | Lectura móvil, foco, volver, sin respuesta de ruta inventada. |
| **Ficha portátil** | Texto con referencia, procedencia, fecha, límites y enlace | Pocos KB generados a petición; sin mapa descargado | Copia/fallback; texto correcto fuera de la app; no nota ni GPS personal. |
| **Nota privada en favorito** | Texto acotado ligado al ID local, edición y borrado | Local al navegador, sin sincronización | Persistencia según disponibilidad y exclusión de exportación pública. |
| **Ubicación refrescable con edad** | Captura y precisión visibles; actualizar por acción | Geolocation con permiso; sin historial | Permiso negado, dato antiguo, actualización, error y salida de zona. |
| **Fechas/fuentes claras** | Levantamiento y estado operativo separados | Metadatos existentes | Ausencias y fechas distintas no generan “validado hoy”. |

La selección no es una medición de impacto. Son cambios de bajo costo y utilidad plausible que se pueden comprobar ahora. La ejecución y resultados de las pruebas se registran en la entrega del agente principal; este documento no declara PASS de funciones que aún se estén construyendo.

## Fases dependientes de SCT y operación

**Datos estáticos confiables:** obtener paquete vigente, derechos de reutilización, inventario por sentido, variantes provisionales, calendario y responsables de actualización. Contrastar al menos una línea en campo. Pasar de referencia comunitaria a parada operativa es un cambio de evidencia, no un cambio de color.

**Piloto de posiciones:** fuente aprobada con identidad de agencia y permiso, credenciales en backend cuando sean necesarias, IDs y hora de captura. El cliente público consume un formato acotado; no guarda un secreto en `VITE_*`. Hoy se prepara contrato y cliente; la recepción/adaptación del sistema real depende del proveedor y acceso acordados.

**Llegadas y acompañamiento:** asociar unidades a viaje y sentido, paradas al catálogo verificado y predicciones a observaciones recientes. Comparar llegadas previstas con registradas, reportar error y cobertura. Sin ese resultado no mostrar precisión, “faltan N paradas” o aviso de descenso como servicio fiable.

**Avisos e incidencias:** nombrar responsable, vigencia, fuente, retiro de avisos caducados y mecanismo de corrección. Un reporte enviado por un pasajero no cambia automáticamente el estado público. Si no hay equipo que atienda una bandeja, no publicar una bandeja simulada.

**Continuidad:** medir usuarios, flota, solicitudes, mensajes y egreso antes de comprometer un plan gratuito permanente. Software libre y mapas gratuitos no eliminan costos de SIM, validación, mantenimiento y disponibilidad. Conservar archivos finales pequeños, reutilizar fuentes/iconos y evitar modelos 3D o medios pesados que no ayuden a localizar y decidir.

Se leyó también *Leverage Points* de Donella Meadows. No se aplica como receta al sprint pequeño. Su borde institucional sí recuerda que el mayor salto futuro depende del flujo de información y de quién puede mantenerlo: publicar una API sin responsable de cambios no garantiza información útil. Las reglas y acuerdos corresponden a SCT/operador; el prototipo no los crea ni los supone.

## Comprobación de la dirección completa

La evidencia de éxito debe seguir tareas: localizar una referencia, reconocer qué sigue sin confirmar, preparar una pregunta, compartir sin filtrar notas, actualizar ubicación y preparar el regreso. En campo, una persona debe poder explicar por qué A/B no es un sentido y por qué una posición vieja no significa “ya viene”.

Para expandir, hace falta observar viajes con personas de distintos perfiles y horarios, además de validar datos con operación. No inventar porcentajes de satisfacción ni ahorro de minutos a partir de esta investigación documental. El objetivo es mejorar decisiones reales; cada ampliación se evalúa contra ese objetivo antes de añadir otra función.
# Resultado del primer ciclo de implementación

Las decisiones de este documento se llevaron al prototipo: preguntas al operador con intención explícita (subir/llegar/regresar), ficha TXT copiable/descargable, nota privada excluida del formato público, fecha/renovación/caducidad de ubicación, aliases del IMSS 6, referentes separados de paraderos y paquete offline atómico. La [verificación](VERIFICACION.md) conserva las pruebas y límites; no se declaran implementadas las fases futuras dependientes de SCT. El [prototipo](PROTOTIPO.md) contiene cómo abrirlo y dónde continuar.

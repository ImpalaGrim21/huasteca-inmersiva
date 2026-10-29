# MiRedMetro Valles: una experiencia que resuelve el viaje

Especificación de producto e investigación competitiva, **28 de octubre de 2026**. Documento de diseño: lo propuesto aquí no se declara implementado, conectado a SCT ni probado con pasajeros. Complementa la [investigación local](INVESTIGACION-USUARIOS.md), la [ideación aplicada](IDEACION-APLICADA.md) y el [contrato SCT](INTEGRACION-SCT.md).

## Decisión de producto

La primera pantalla debe contestar para qué sirve la app y qué hacer primero: **«Planea tu traslado en MetroRed por Ciudad Valles. ¿A dónde vas?»**. El resultado debe acompañar una intención concreta —por ejemplo, llegar al IMSS 6— hasta preparar el regreso. Un catálogo de puntos en un mapa exige que el pasajero ya sepa resolver el viaje; no basta para ese propósito.

El comentario actual del propietario del proyecto sobre no comprender la utilidad y la navegación es evidencia directa de un problema con la experiencia presentada. No equivale a una encuesta de pasajeros, pero sí obliga a cambiar la organización del producto. Un build y pruebas automáticas aprobados no demuestran comprensión.

**Promesa de trabajo:** ayudar a elegir cómo acercarse al destino, reconocer dónde abordar y bajar, conservar el viaje y preparar el regreso con la información realmente disponible. La excelencia se evaluará en esas tareas. Todavía no hay pruebas para anunciar que el producto supera a Maps, Moovit, Transit o Citymapper.

## Lo que los referentes ya resuelven

Revisión de documentación primaria pública. Se verificaron funciones documentadas, no cada combinación de versión, sistema operativo, suscripción y ciudad. No se realizó una comparación de viajes reales en Valles dentro de las cuatro apps.

| Producto | Funciones documentadas relevantes | Consecuencia para MiRedMetro |
| --- | --- | --- |
| **Google Maps** | Origen/destino, alternativas de transporte público y selección de salida/llegada. Los operadores deben aportar información y el transporte público no está disponible en todas las ciudades. Las salidas diferencian información real de horarios. [Rutas](https://support.google.com/maps/answer/144339?hl=en-ZA), [salidas](https://support.google.com/maps/answer/6142130?hl=en-GB). | Buscar destino, mostrar una línea y pintar un mapa son prestaciones básicas. Hay que comprobar cada viaje vallense antes de afirmar una carencia de cobertura. |
| **Moovit** | Su inicio de indicaciones parte del destino; compara duración, caminata y transbordos. Los pasos pueden incluir identificación/foto de parada. Live Directions acompaña la caminata, el trayecto y el descenso. [Planificar](https://support.moovitapp.com/hc/en-us/articles/212011605-Plan-a-Trip-Get-Directions), [acompañamiento](https://support.moovitapp.com/hc/en-us/articles/211392929-Live-Directions-Get-Off-Alerts). | El flujo completo y las fotos tampoco son una innovación exclusiva. El diferencial tendría que ser la precisión y mantenimiento de detalles locales útiles. |
| **Transit** | Plan A→B, salidas, favoritos y GO con instrucciones para salir, transbordar y bajar. Su planificador web separa lugares de paradas y recalcula al intercambiar origen/destino. [Funciones](https://help.transitapp.com/article/93-how-to-use-transit), [planificador](https://help.transitapp.com/article/534-trip-planner-for-desktop). | Un botón de regreso es necesario, pero no constituye una ventaja por sí mismo. Debe resolver el punto y servicio de vuelta, no invertir dos marcadores. |
| **Citymapper** | GO presenta la acción del momento y alertas para bajar. Dispone de opciones como trayectos simples, bus y accesibilidad, con diferencias por ciudad. [GO](https://content.citymapper.com/news/517/go-your-personal-trip-assistant), [opciones](https://www3.citymapper.com/news/2296/introducing-routing-powers). | La claridad del siguiente paso es una referencia de calidad. Copiar tarjetas o colores no reproduce la capacidad del servicio. |

Hay otros antecedentes que impiden presentar funciones comunes como diferenciadores:

- **Tiempo real y alertas:** Transit explica la distinción entre tiempos programados, ubicación actualizada y cancelaciones. Moovit muestra afectaciones por línea; Google contempla desvíos, paradas movidas y suspensión desde información del operador. La hora de lectura de una página no sustituye la hora de captura de un autobús. [Transit](https://help.transitapp.com/article/445-how-to-track-departures-on-your-transit-line), [Moovit](https://support.moovitapp.com/hc/en-us/articles/212012025-Check-a-Line-s-Service-Status), [Google Transit](https://support.google.com/transitpartners/answer/10104458?hl=en).
- **Sin conexión:** Transit documenta horarios, planificación y GO basados en información guardada; excluye actualizaciones en vivo y alertas actuales. Citymapper permite guardar viajes para consulta sin conexión. Maps indica que sus indicaciones de transporte público, a pie y bicicleta no están disponibles sin conexión en la modalidad descrita. Por tanto, nuestra ficha offline aporta utilidad, pero no es una novedad frente a todo el mercado. [Transit](https://help.transitapp.com/article/90-does-transit-work-offline), [Citymapper](https://citymapper.com/news/1282/offline-support), [Maps](https://support.google.com/maps/answer/6291838?hl=en).
- **Accesibilidad del recorrido:** Citymapper documenta en Singapur accesos con rampas/elevadores y puntos de subida/bajada sin escalones. Google ofrece preferencias de transporte accesible. Moovit advierte que un editor sólo debe marcar una parada como accesible cuando tenga certeza. Eso demanda información física, no un icono de silla de ruedas. [Citymapper](https://content.citymapper.com/news/2577/find-the-best-accessible-journey-with-step-free-routes), [Google](https://support.google.com/maps/answer/6396990?co=GENIE.Platform%3DAndroid&hl=en), [Moovit, actualización 20-05-2026](https://support.moovitapp.com/hc/en-us/articles/115003887249--Wheelchair-Accessibility).
- **Ubicación y participación:** Transit GO ya utiliza colaboración de pasajeros para posiciones y opiniones del viaje. Moovit documenta Safe Ride para compartir el recorrido con contactos dentro de Moovit+, con activación y cuenta. Una propuesta de GPS ciudadano o compartir un viaje necesita su propio modelo de consentimiento y calidad; no se puede vender como algo nunca hecho. [Transit](https://help.transitapp.com/article/91-what-is-go-crowdsourcing), [Moovit](https://support.moovitapp.com/hc/en-us/articles/10341420133650-Safe-Ride-Sharing-Live-Location-with-Contacts).
- **IA y 3D:** Google anunció Immersive Navigation el 12-03-2026 con un despliegue inicial y énfasis en conducción, y la expansión de Ask Maps a México el 06-08-2026. Este último anuncio incluye un widget de transporte con actualizaciones donde existen datos. No demuestra navegación MetroRed Valles, pero descarta «agregar IA» o «poner 3D» como argumento suficiente de diferenciación. [Marzo](https://blog.google/products-and-platforms/products/maps/ask-maps-immersive-navigation/), [agosto](https://blog.google/products-and-platforms/products/maps/order-food-in-ask-maps/).
- **Cuenta y pago:** Transit mantiene funciones básicas sin cuenta, y su nivel gratuito incluye GO; más resultados y otras ventajas dependen de Royale o patrocinio local. Moovit separa funciones de Moovit+. No afirmar que las alternativas exigen siempre registro o pago. [Transit Royale](https://help.transitapp.com/article/362-royale-faq), [patrocinio y cuenta](https://help.transitapp.com/article/430-sponsored-royale-faq), [Moovit+](https://support.moovitapp.com/hc/en-us/articles/10011559836818-Moovit-New-Pluses-for-a-First-Class-Ride).

**Cobertura pendiente de comprobar:** las búsquedas públicas de Moovit con «Ciudad Valles» también devuelven calles de la capital llamadas «San Luis Potosí–Ciudad Valles». Son lugares distintos. No se deduce cobertura vallense ni su ausencia a partir de esos resultados. Tampoco se toma una lista histórica de ciudades de Citymapper como prueba concluyente de su cobertura actual. La comparación correcta requiere probar los mismos orígenes, destinos, fechas y condiciones.

## Qué justifica una experiencia local

Estas señales provienen del corpus previo de 16 fuentes. Se conservan fecha, localidad y límites; no se inventaron entrevistas ni frecuencias de quejas.

| Evidencia de Valles | Decisión de experiencia | Qué todavía no sabemos |
| --- | --- | --- |
| SCT desmintió el rumor de cobro de 12 pesos el 07-07-2026; existe un portal de registro QR de Valles. [Noticia](https://www.emsavalles.com/NL278473/red-metro-en-valles-seguira-siendo-gratuita-sct-desmiente-cobro-de-12-pesos), [portal oficial](https://redmetrovalles.sctslp.com/). | Explicar costo documentado y llevar al registro oficial al preparar el primer viaje. No abrir un registro propio ni pedir documentos en nuestra guía. | No usar una nota de julio como garantía eterna de tarifa. Los requisitos vigentes se comprueban en la fuente institucional. |
| El 28-05-2026 se reportaron quejas de saturación de L1/L2 y respuesta SCT. [Emsavalles](https://emsavalles.com/nl275541/gobierno-acelera-riviera-huasteca-rumbo-al-mundial). | Una contingencia «No pude abordar» debe conservar el destino y facilitar una siguiente decisión o consulta. | No hay medición actual de capacidad, ocupación por unidad o espera. La app no puede prometer espacio ni aumentar la flota. |
| Un operador relató el 26-10-2025 que informa horarios/paradas en videos y recibe reconocimiento de usuarios. [Entrevista](https://emsavalles.com/NL260496/el-senor-de-los-tiktoks-operador-de-red-metro-se-gana-el-carino-de-los-vallenses). | Usar referencias reconocibles y vocabulario cotidiano: destino, letrero, punto para subir y punto para bajar. | Es testimonio del operador; no una observación representativa de pasajeros ni validación del recorrido actual. |
| Pacientes denunciaron obstáculos alrededor del parador IMSS el 21-08-2025. [Emsavalles](https://emsavalles.com/NL256217/comercio-permite-invasion-de-ambulantes-en-el-parador-de-la-red-metro-en-el-imss-de-ciudad-valles). | El viaje al hospital debe distinguir parada y entrada del recinto. Una ficha local útil incluye cruce/banqueta/acceso inspeccionados. | No hay inspección actual. No marcar el acceso como bloqueado para siempre ni como accesible sin evidencia. |
| Hubo suspensión temporal de un parador por incidentes en octubre de 2025. [El Universal, 29-10-2025](https://sanluis.eluniversal.com.mx/municipios/tras-vandalismo-y-agresiones-presuntamente-cometidos-por-escolares-suspenden-parador-de-la-metrored-de-ciudad-valles/). | Un aviso vigente debe aparecer en el viaje afectado y ofrecer una alternativa comprobada. | La nota antigua no es una alerta activa de hoy. |
| Se han publicado ajustes festivos y propuestas de ampliación por FENAHUAP. [Palestra, 30-12-2025](https://palestra.com.mx/2025/12/30/anuncian-horarios-especiales-de-metrored-urban-pass-y-cytibus-para-este-fin-de-ano/), [Emsavalles, 16-03-2026](https://emsavalles.com/NL269558/analizan-ampliar-horario-de-red-metro-durante-la-fenahuap-en-ciudad-valles). | Preparar el regreso debe comprobar día, calendario y última salida relevante. | Una propuesta no equivale a horario aprobado; cierre de servicio no equivale a último paso por cada parada. |
| Habitantes de La Lima reclamaron problemas de combis; SCT explicó límites para entrada de MetroRed por el camino. [Astrolabio, 19-10-2026](https://www.astrolabio.com.mx/habitantes-de-la-lima-exigen-base-de-transporte-y-denuncian-cobros-excesivos-en-valles/). | Mostrar una salida útil cuando un destino queda fuera de cobertura comprobada. | Las denuncias no son contra MetroRed. No prometer servicio urbano hasta cualquier comunidad. |

Las quejas de la capital, el grupo ciudadano de seguimiento de L3 y opiniones sobre otras redes siguen siendo antecedentes separados. No justifican afirmar que todos esos problemas se han observado en Valles.

## Aplicación de creative-ideation

Se leyeron `creative-ideation/SKILL.md`, `hermes-common/MIREDMETRO.md`, `references/anti-slop.md` y los métodos pertinentes. Procedencia: NousResearch/hermes-agent, commit `83bde48a4d9760d84220a9b29094a1ad86410f6e`, licencia MIT. La adaptación local y las instrucciones vigentes del usuario prevalecen. Se trabajó por ciclos separados; no se aplicaron los 22 métodos como ritual.

**Ciclo 1: primeros principios, tradición de Aristotle/protai archai.** Problema preciso: una persona que sabe adónde quiere llegar no identifica cómo convertir los puntos disponibles en un traslado ni qué hacer después. Se separaron restricciones de convenciones:

| Supuesto | Clasificación y decisión |
| --- | --- |
| La primera pantalla debe estar dominada por el mapa. | Convención de interfaz. Sustituir por destino e intención; el mapa aparece al ayudar a decidir un paso. |
| El usuario sabe qué parada y sentido necesita. | Información que no podemos presuponer. Pedir destino antes de enseñar el catálogo. |
| A/B permite reconocer ida y vuelta. | Inferencia sin respaldo operativo. Conservar esos sufijos sólo como identificadores cartográficos cuando hagan falta; no convertirlos en sentido. |
| Sin GPS de autobuses no puede haber un servicio útil. | Confusión de capacidades. Un catálogo operativo estático, vigente y por sentido permite preparar viajes; posiciones y ETA son capas adicionales. |
| Un mapa de coordenadas ya permite generar el itinerario. | Falso por falta de información: faltan secuencia, sentido y accesos. La UI no puede suplirlos. |
| Se necesita cuenta o permiso de ubicación para empezar. | Convención prescindible. Origen manual y continuidad local permiten iniciar sin ambos. |
| Cada dato incierto necesita una tarjeta de advertencia. | Convención que sobrecarga. Expresar el límite en el punto de decisión y agrupar la trazabilidad consultable. No ocultar una carencia que cambie dónde subir o bajar. |

Resultado: **un viaje persistente, una fase visible y una acción principal del momento**. El destino se conserva cuando falla el mapa, se niega GPS, se consulta ayuda o se prepara regreso. Se mantiene la lista accesible y el mapa como herramientas de orientación; no se elimina información necesaria por simplificar.

**Ciclo 2: lenguajes de patrones, Christopher Alexander y colaboradores.** Se aplican como relaciones contexto/problema/solución, no como verdades universales validadas:

- Al salir de casa o de una consulta, la persona necesita saber qué sigue: conservar destino y fase encima del contenido, con una acción principal explícita.
- Al distinguir dos puntos próximos, necesita reconocer el correcto: relacionar parada, sentido, letrero y referencia física verificados; el mapa ayuda a reconocerlos. La cercanía geométrica no decide el lado correcto.
- Al volver de una pantalla auxiliar, necesita retomar: ayuda, QR, fuentes y favoritos se abren conservando el viaje, con retorno explícito.
- Al terminar la ida, necesita volver: conservar el origen privado y resolver un nuevo recorrido de regreso con su fecha y sentido. No tratarlo como una inversión gráfica automática.

Se descartaron como respuesta principal: más tarjetas de límites, una pantalla hero con 3D, un chatbot genérico, puntos/recompensas, publicación automática de reportes y simulación de vehículos. Aumentan superficie o expectativas sin resolver el dato y la decisión del pasajero. No se usó Jobs-to-be-Done como si hubiéramos entrevistado clientes; las tareas propuestas son hipótesis fundamentadas en la evidencia documental.

## Estructura de navegación

Tres destinos permanentes bastan: **Viajar**, **Guardados** y **Ayuda**. Si hay viaje activo, una franja compacta «Tu viaje a IMSS 6 · Continuar» permite retomarlo desde los otros dos. La línea y su catálogo son contenido secundario dentro de Viajar; no se obliga al usuario a escoger entre «explorar», «referencia» o «nodo» antes de expresar su destino.

En móvil, cada fase tiene un encabezado comprensible, contenido de decisión, un mapa contextual cuando aporta algo y una acción principal visible. En escritorio, mapa y contenido pueden compartir pantalla con la misma jerarquía. La alternativa textual no depende del canvas, los iconos tienen etiqueta y el color no es el único indicador de estado.

El nombre de la tecnología, IDs OSM, contrato del adaptador y estados internos no forman parte de la navegación del pasajero. «Datos de este viaje» permite ver procedencia, fecha y qué está verificado cuando se necesita, sin convertir la portada en un panel técnico.

## Pantallas y acciones concretas

Los textos siguientes son especificación de interfaz, no horarios ni itinerarios operativos confirmados. Los ejemplos Centro/IMSS/Tec/UASLP nombran destinos reales; no atribuyen orden, sentido o paradero correcto sin datos.

| Pantalla/fase | Qué ve y puede decidir la persona | Acción principal | Continuidad y caso sin datos suficientes |
| --- | --- | --- | --- |
| **1. Destino** | «¿A dónde vas?»; búsqueda por nombre conocido; accesos a IMSS 6, Centro, Tecnológico y UASLP. Cada resultado identifica el lugar; las paradas se agrupan aparte. | Elegir un destino. | Una búsqueda sin resultado conserva el texto y permite elegir un punto o explorar la cobertura disponible. No declara «no hay servicio» sólo porque el catálogo sea parcial. |
| **2. Salida** | «¿Desde dónde sales?» con destino retenido; ubicación voluntaria, lugar guardado, búsqueda o punto manual. El permiso se solicita al tocar ubicación, no al abrir la app. | «Ver cómo llegar», si existe motor y datos de rutas; «Preparar orientación», mientras sólo exista catálogo documental. | Negar GPS no bloquea. Una muestra imprecisa/antigua no se fija silenciosamente como origen exacto. Se permite corregir el punto. |
| **3. Resumen del viaje** | Origen → destino; línea candidata documentada o itinerario verificado; pasos de caminar, subir, viajar, bajar y llegar que estén respaldados. Una sola explicación del nivel de servicio disponible. | «Preparar este viaje». | Sin secuencia/sentido verificados, mostrar una guía de orientación y sus puntos candidatos, no un falso itinerario optimizado ni una línea que une puntos en orden inventado. Si no existe vínculo documentado, ofrecer cobertura y consulta, sin recomendar L1 por defecto. |
| **4. Preparación** | Punto para abordar, sentido/letrero y referencia física cuando estén verificados; qué falta confirmar para este viaje; acceso QR contextual para quien lo necesite. | «Ver dónde abordar» cuando se conoce el punto; «Ver puntos de la zona» cuando sólo hay candidatos. | El QR abre el portal oficial y permite volver al mismo viaje. Si falta el lado o sentido, no elegirlos con A/B o por cercanía; la consulta al operador está aquí, con la pregunta ya compuesta. |
| **5. Abordaje** | «Vas hacia [destino]»; parada seleccionada, referencia de reconocimiento y qué letrero buscar. Foto real fechada sólo si existe. Se ve el siguiente paso sin volver a buscar el destino. | «Ya abordé». | Es confirmación del pasajero, no detección de GPS. «No encuentro el punto» conserva todo y abre ayuda localizada. Sin foto, usar el mapa real y descripción disponible, no una imagen generada que parezca documentación del sitio. |
| **6. En el viaje** | Destino fijo y siguiente acción. Con secuencia y posición válidas: próximos puntos y progreso sustentado. Sin ellas: referencia del destino y punto elegido, con acompañamiento manual. | «Ya bajé» en modo manual; con guía comprobada, la acción pertinente al descenso. | No mostrar «faltan 2 paradas», ETA o aviso automático de bajada sin sus datos. La ubicación del pasajero se identifica como tal y se puede refrescar; no representa al autobús. |
| **7. Bajar y llegar al lugar** | Parada de descenso y acceso final verificados, si existen. Hospital o campus y su entrada son entidades diferentes. | «Marcar llegada». | Una coordenada del centro de un predio no se presenta como puerta de consulta/urgencias ni como fin de una caminata accesible. Sin ese dato se muestra el lugar como referencia, sin flecha de entrada inventada. |
| **8. Viaje terminado** | «Viaje terminado · IMSS 6»; si fue manual, «Marcaste que llegaste». Origen retenido en privado. | «Preparar regreso a [origen]». | No hace falta volver a teclear. Puede corregir desde dónde vuelve o cerrar el viaje. No se notifica a otra persona automáticamente. |
| **9. Regreso** | Nuevo resumen desde el destino actual hacia el origen previo; día y servicio correspondiente; punto para subir de vuelta. | «Preparar regreso». | Recalcular contra datos operativos cuando existan. Intercambiar coordenadas no confirma que el otro punto del par sea la parada correcta. Última salida sólo con calendario/fuente válidos; si falta, ofrecer la consulta específica. |

Las fases no exigen nueve páginas, nueve URLs ni nueve pantallas de introducción. Varias pueden vivir en una misma vista de viaje cuyo contenido y acción cambian; la navegación permanece estable. Se permite corregir una fase o terminar antes, sin atribuir al teléfono movimientos que sólo confirmó la persona.

**Ejemplo de interacción inicial:** la persona toca «IMSS 6», elige «Centro» como salida y recibe una opción de orientación que relaciona esos destinos con la L1 documentada, sus referencias y los puntos comunitarios disponibles. Puede guardar esa intención, consultar el registro y reconocer/seleccionar un punto. Hasta verificar la operación por sentido no se le promete «sube en Centro A, baja en IMSS B». El mismo flujo debe admitir más adelante un itinerario operativo, sin obligar a aprender otra app.

**Microtexto para el siguiente paso:** preferir «Ver dónde subir», «Ya abordé», «Ver mi destino» y «Preparar regreso» a «Continuar», «Activar experiencia», «Navegar» o «Explorar» sin contexto. Si la función es manual, decirlo en su activación, no esconderlo después del botón.

## Ayuda durante el viaje y contingencias

El acceso «Necesito ayuda» abre decisiones breves relacionadas con la fase, sin abandonar el viaje ni mostrar una docena de avisos en la portada.

| Situación elegida | Respuesta útil | Límite obligatorio |
| --- | --- | --- |
| «No pasa el camión» | Mostrar salidas/posición con edad cuando existan; conservar punto y destino; facilitar consulta oficial o alternativa comprobada. | Sin feed no producir contador de espera, «servicio normal» ni una cancelación inferida. |
| «No pude abordar» | Mantener el viaje y preparar contexto de consulta: punto, línea, hora y unidad si la persona la conoce. | No publicar ocupación de toda la línea a partir de un reporte individual ni asegurar que el próximo vehículo tendrá lugar. |
| «No encuentro la parada» | Mapa del punto elegido, descripción/foto auténtica disponible y pregunta breve para confirmar el abordaje. | No confundir una referencia cercana con el acceso correcto. No dar una caminata recta a través de barreras. |
| «Me pasé / cambié de salida» | Retener destino; permitir indicar posición actual u otra salida y volver a preparar el viaje. | No ordenar «baja aquí» ni inventar un retorno seguro sin conocer la operación. |
| «Cambió la parada» | Aviso vigente localizado y alternativa validada, con fecha/fuente. Si es observación personal, preparar un borrador para consultar. | Un rumor, aviso vencido o nota histórica no cambia automáticamente la ruta pública. |
| «Necesito un acceso sin escalones» | Mostrar condiciones verificadas de banqueta, cruce, rampa, parada y entrada, o la pregunta concreta que falta resolver. | No usar ausencia de datos como «accesible», ni convertir un botón genérico en garantía física del recorrido. |
| «No tengo internet» | Conservar viaje, referencias y texto guardados; indicar qué contenido está disponible. El mapa puede tener cobertura parcial. | No prometer mapas completos, QR externo operativo, avisos actuales o sincronización en vivo. Al reconectar se actualizan fuentes sin perder el destino. |
| «No hay una opción cubierta» | Explicar que no existe una opción comprobada en nuestro catálogo y permitir consultar otro planificador o contacto. | No equiparar catálogo incompleto con inexistencia del transporte. No crear tarifas de taxi, conexiones ni transbordos. |

Se puede ofrecer «Consultar otra opción en Google Maps» como salida explícita, abriendo la ubicación elegida. Las Maps URLs permiten abrir búsqueda/indicaciones sin una clave de API; el resultado y su cobertura pertenecen al servicio externo. No se extraen sus rutas ni fotografías para mostrarlas sobre MapLibre. [Documentación primaria](https://developers.google.com/maps/documentation/urls/get-started).

**Pregunta contextual al operador:** debe ocupar una vista legible y conservar la intención. Ejemplos: «Voy al IMSS 6. ¿Este autobús me acerca y dónde debo bajar?» o «Quiero regresar hacia [origen]. ¿Dónde se aborda y hasta qué hora hay servicio hoy?». Es una ayuda al diálogo; no constituye un itinerario calculado ni debe ser la única respuesta de todo el producto.

Los reportes se preparan como borradores. No afirmar «SCT recibió tu reporte» sin una integración real que confirme recepción. No enviar nada en segundo plano ni abrir expedientes personales para consultar una línea.

## Los datos deciden qué puede prometer cada paso

La versión de partida dispone de puntos comunitarios OSM, referencias de lugares y documentos públicos de conexión de L1. Eso permite orientación. **No contiene por sí solo secuencia operativa, sentido, calendario actual ni entradas peatonales verificadas.** Para llevar a una persona al lado correcto hace falta mejorar el dato local, no sólo dibujar un flujo más elegante.

| Capacidad | Información mínima | Qué puede construirse sin GPS de unidades |
| --- | --- | --- |
| Orientar hacia un lugar | Identidad, alias, coordenada con su naturaleza, procedencia y fecha. | Destinos claros, mapa/lista, referencias, selección manual, viaje persistente y guía portable. |
| Recomendar un recorrido de una línea | Paradas operativas por sentido, secuencia, trazado, cabeceras/letreros, puntos de ascenso/descenso y vigencia. Fuente oficial o levantamiento independiente verificable, identificado como tal. | Itinerarios estáticos, reconocimiento del abordaje y descenso, retorno correctamente resuelto. No se requiere simular un GPS para esto. |
| Caminar hacia la parada/entrada | Red peatonal utilizable y acceso de destino; restricciones/cruces cuando importen. | Indicaciones a pie sustentadas. Una distancia geográfica se puede mostrar como tal, no como distancia ni tiempo de caminata. |
| Planificar por hora y regreso | Calendario, excepciones y horarios o frecuencia realmente publicados, con interpretación de cabecera/parada. | Opciones por fecha, horarios programados y último servicio documentado, diferenciados de ETA. |
| Avisar cambios de servicio | Línea/parada afectada, efecto, inicio/fin, fuente, publicación y revisión. | Avisos editoriales verificados; no requieren posiciones GPS. |
| Mostrar unidades/llegadas actuales | Fuente autorizada SCT u otra fuente aprobada, IDs conciliados, hora de captura y reglas de vencimiento. Para ETA: predicción ligada al viaje/parada, no sólo posición. | Esta capa queda preparada y desactivada sin datos adecuados. No renueva la captura al recibir el mismo dato viejo. |
| Prometer aviso de bajada | Secuencia/destino válidos, posicionamiento y comportamiento probado en los dispositivos y condiciones anunciados. | Puede comenzar como confirmación manual. Una web en segundo plano no hereda las garantías de una app nativa por imitar su botón. |

El levantamiento de una sola línea puede priorizar primero los viajes a IMSS 6, Centro, Tecnológico y UASLP en ambos sentidos. Para cada punto crítico: ubicación de abordaje, referencia del lado, letrero observado, secuencia, fecha, fuente y acceso pertinente. No hace falta descargar un país completo, clonar catálogos pesados o añadir modelos generativos. Las fotos deben ser propias/licenciadas, pequeñas y con procedencia; una imagen generada no valida una parada.

**Dos fechas distintas:** «Consultado» indica cuándo se leyó la fuente; «Verificado en operación» exige comprobación real. Cada instrucción puede enlazar sus datos en la vista de procedencia. El origen exacto, notas y ubicación del pasajero son privados; no se incorporan automáticamente a la ficha pública ni al enlace de un destino.

## Diferenciación que vale la pena comprobar

Las siguientes son oportunidades de ejecución local, no afirmaciones de exclusividad. El impacto/esfuerzo es una estimación cualitativa de diseño, no una medición de adopción.

| Propuesta concreta | Mecanismo y valor esperable | Confianza, esfuerzo y fallo principal |
| --- | --- | --- |
| **Llegar al acceso correcto del IMSS 6, no sólo al predio.** | Unir punto de descenso, lado, cruce y puerta real relevante con una descripción reconocible y fecha de inspección. Reduce decisiones inciertas en el tramo final. | Impacto potencial alto; confianza documental en la necesidad, baja en el estado físico actual. Esfuerzo medio de datos/campo. Fallo: acceso cambiado o inaccesibilidad no revisada. Priorizar verificación y responsable de mantenimiento. |
| **Reconocer el autobús y el punto local.** | Mostrar nombre usado en Valles, letrero real, referencia del lado y foto fechada al preparar el abordaje. | Impacto potencial alto; el concepto ya existe en competidores. Esfuerzo medio de catálogo; no afirmar una ventaja hasta comparar la cobertura real para esos puntos. Fallo: foto o letrero desactualizados. |
| **Regreso preparado para la consulta, clase o trámite.** | Retener salida y destino, resolver el abordaje de vuelta y calendario del día. Dar una respuesta concreta si no consta última salida. | Impacto potencial alto; estructura local implementable ahora, datos horarios pendientes. Fallo: vender intercambio de marcadores como retorno resuelto. |
| **Continuidad simple en un viaje local.** | Un solo viaje, una fase y siguiente acción; información y ayuda contextual; origen manual, texto guardable y retorno al mismo estado. | Confianza alta en factibilidad técnica; comprensión de pasajeros aún no medida. Esfuerzo bajo/medio sobre la SPA existente. Fallo: llamarlo navegación automática o llenar cada fase de opciones. |

La identidad visual puede apoyarse en destinos vallenses reconocibles, lenguaje local respetuoso, jerarquía fuerte de línea/destino y un recorrido visual claro. El mapa de MapLibre/OpenFreeMap sigue siendo parte del producto, pero la tecnología no se presenta como beneficio principal al pasajero. Una transición o perspectiva 3D debe mejorar reconocimiento; no aplazar la información necesaria ni aumentar descargas para adornar un traslado cotidiano.

## Orden de construcción y fronteras de entrega

1. **Ahora, con los datos existentes:** destino primero, origen manual/voluntario, resumen que distinga orientación de itinerario, viaje persistente, fase manual comprensible, ayuda contextual, continuidad del regreso y ficha portable con privacidad. Reutilizar mapa, búsqueda y almacenamiento presentes. No añadir cuentas, feed simulado ni paquetes pesados.
2. **Antes de ofrecer navegación operativa de la línea:** obtener y contrastar el catálogo por sentido, trazado y puntos reales de abordaje/descenso. Completar el caso IMSS/Centro/Tec/UASLP y comprobarlo con usuarios y observación. Este dato es una dependencia material para dar instrucciones correctas; no es un detalle cosmético para después.
3. **Con calendario y mantenimiento editorial:** horarios programados, último servicio y avisos vigentes. La arquitectura puede quedar lista antes; un horario vacío no es conexión real.
4. **Cuando haya fuente aprobada y validada:** posiciones/ETA SCT y funciones de seguimiento. Mantener la guía estática cuando no haya datos en vivo; retirar las promesas que dependan de ellos.

La app puede prestar orientación real y ayudar a preparar un viaje antes del punto 2. No debe presentarse ese alcance como equivalente a un planificador completo ni anunciar superioridad general por tener una nueva interfaz. La preparación SCT y la conexión efectiva son estados distintos.

## Criterios de comprensión y calidad

Son **criterios propuestos para validar**, no resultados ya obtenidos. Una persona sintética del skill adversarial ayuda a descubrir fricción, pero no sustituye pasajeros reales.

| Prueba | Evidencia de aceptación buscada |
| --- | --- |
| Primera visita, sin tutorial | La persona puede explicar para qué sirve y señalar cómo empezar tras una inspección breve. En una primera ronda exploratoria con 8 personas, objetivo de diseño: al menos 6 identifican el destino como primer paso en 10 segundos. Registrar conteos y dudas; no extrapolar porcentajes poblacionales. |
| «Quiero ir del Centro al IMSS 6» | Puede elegir destino y salida sin conocer previamente la lista de paraderos ni el significado de A/B. Ve un resultado coherente con la capacidad real del catálogo. Objetivo: hacerlo en tres decisiones significativas, sin contar caracteres tecleados. |
| Resumen y abordaje | Puede decir destino, punto elegido y siguiente acción. Si sólo hay orientación, lo distingue de una recomendación operativa. No se le induce a afirmar que A/B equivale a ida/vuelta. |
| GPS denegado, mapa no disponible | Puede continuar con origen manual y contenido textual. Ningún dato de ubicación se presenta como capturado cuando no lo fue. |
| «Ya abordé» y regreso | Comprende que marcó una fase manual. Al volver de QR/ayuda o recargar, retoma el viaje. El regreso conserva la intención y no inventa un sentido inverso. |
| Horarios, avisos y pérdida de conexión | Distingue horario programado, actualización real, dato guardado y falta de información. Una nota histórica no aparece como cambio de hoy. No hay cuenta regresiva sin fuente. |
| Entrada del hospital y accesibilidad | Puede distinguir referencia del predio, parada y acceso. Sólo recibe atributos de accesibilidad comprobados. Las condiciones sin verificar no se interpretan como garantía. |
| Compartir y guardar | Puede revisar qué información saldrá. La nota privada y ubicación precisa no se exportan por defecto; no se envía un reporte automáticamente. |
| Operación con teclado y móvil | Toda tarea principal tiene equivalente textual, foco visible y controles etiquetados. Probar contenido a tamaño de texto aumentado y pantalla pequeña; la acción principal no queda tapada por mapa, teclado o panel. |

Para contrastar con Maps/Moovit/Transit/Citymapper, usar las mismas tareas y condiciones, rotar el orden de productos y documentar cobertura, versión y datos disponibles. Medir: éxito sin ayuda, elección del lado correcto, decisiones erróneas, tiempo, consultas al evaluador y comprensión del siguiente paso. Separar errores de interfaz de ausencia de datos. Una ronda pequeña descubre problemas; no demuestra superioridad estadística.

**Condición decisiva de la próxima revisión:** quien abra MiRedMetro debe poder decir «aquí preparo cómo llegar a mi destino y continúo mi viaje», y hacerlo. Si sólo puede decir «aquí veo puntos», la transformación de experiencia sigue pendiente aunque el mapa se vea mejor.

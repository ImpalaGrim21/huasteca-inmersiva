# Prueba adversarial de UX · Línea 1 de Valles

Sesión realizada el **28-10-2026, 19:44–19:47, hora de Ciudad de México**. Persona **ficticia**: Rosa, 61 años, utiliza WhatsApp y acompaña a un familiar al IMSS. No es una entrevista, encuesta ni testimonio de una pasajera real.

Se aplicó el [skill adversarial-ux-test](https://github.com/NousResearch/hermes-agent/blob/83bde48a4d9760d84220a9b29094a1ad86410f6e/optional-skills/dogfood/adversarial-ux-test/SKILL.md): tarea auténtica, observación en navegador, reacción ficticia, filtro pragmático y tickets locales. El archivo instalado `.agents/skills/adversarial-ux-test/SKILL.md` se leyó completo antes de la sesión.

## Producto y condiciones comprobados

- Build de producción `dist`, servido mediante **Vite preview**, no servidor de desarrollo, en `http://127.0.0.1:4191/movilidad/`.
- Nombre de la app en este build: **Valles en ruta**. Esta prueba no acredita cambios posteriores de marca o funcionalidades de MiRedMetro.
- SHA-256 del HTML de entrada: **`09f6c6f1e47f5dd4ad12da6c1f0a455d607ac0a6cec316d6d03d30816253b765`**. Coincidió al principio y al final de las corridas; no se navegó sobre un nuevo build sin revisión.
- Chrome instalado, headless, Playwright existente, idioma es-MX y zona horaria America/Mexico_City; 390×844 y validación complementaria 844×390. Movimiento reducido activado.
- Perfil nuevo: sin favoritos ni cuenta de la guía. Datos del pasajero controlados mediante `context.setGeolocation`; no se sirvieron buses, GPS SCT o ETA simulados.
- OpenFreeMap real. Se comprobó también pérdida de conexión dentro de la sesión. La recarga offline y la actualización atómica de caché son pruebas técnicas separadas, no resultados de esta sesión.
- Los procesos propios de preview 4191 y Chrome se cerraron en `finally` después de cada corrida. No se llamaron teléfonos, enviaron borradores ni registraron datos personales en SCT.

## Tarea de Rosa y recorrido observado

**Tarea:** encontrar un punto cartográfico L1 de referencia para el IMSS, guardarlo para el regreso y entender qué debe confirmar antes de abordar.

La ficha de Rosa añade poca paciencia con números ambiguos, texto pequeño y pasos innecesarios. Su edad no se usa como prueba de incapacidad tecnológica. Su objetivo exige distinguir un punto del mapa de una parada operativamente verificada.

| Etapa | Resultado observado | Acciones de la corrida principal |
| --- | --- | --- |
| Buscar IMSS y abrir un punto | Dos resultados homónimos A/B; detalle abierto y foco móvil en el encabezado | Dos clics: activar búsqueda y seleccionar, más una entrada de texto |
| Guardar para regreso | Se guarda y aparece después en Guardados sin cuenta | Tercer clic para guardar; cuarto para cerrar detalle |
| Ordenar desde ubicación del pasajero | Cerca del IMSS: punto B a 10 m y A a 60 m, distancias en línea recta | Clic 5; permiso concedido por el contexto de QA |
| Volver a usar ubicación tras desplazamiento | Al mover el contexto al Tec y activar de nuevo, conserva IMSS a 10 m | Clics 6–7; defecto reproducido |
| Revisar guardado, sentido y consulta | Punto guardado recuperado; ayuda explica A/B; borrador mantiene el IMSS | Clics 8–13, una entrada de consulta ficticia |
| Recuperar búsqueda con nombres alternos | “IMSS 6” da cero; “Punto Novel” da dos; “UASLP” da cero | Clics 14–15 y tres entradas de texto |
| Perder internet | Conserva 27 puntos y ayuda; estado “Sin conexión”; sin unidades ficticias | Cambio controlado de red, sin nueva navegación |
| Girar teléfono a pantalla baja | La lista queda fuera del recorte del panel; desplazamiento global no la hace alcanzable | Validación complementaria con dos acciones de rueda |

La corrida principal contiene **15 clics y cinco entradas de texto**. Estos números incluyen exploración y recuperación, no significan que la tarea inicial requiera quince clics. El primer punto se abrió con dos clics y una búsqueda, y se guardó con el tercero.

El cronómetro automatizado registró 2.238 s para la corrida principal y 2.8 s para una comprobación complementaria; son tiempos de orquestación rápida, **no tiempos humanos de comprensión, rendimiento web, FPS o prueba de campo**. Las capturas y la lectura posterior aportan la evaluación visual. No se midió la interacción con un diálogo nativo de permisos: la concesión se preparó explícitamente en el contexto.

## Reacción en personaje — ejercicio ficticio

**¿La seguiría usando?** Tal vez, para ubicar y guardar puntos, con condiciones.

**Lo bueno:** “El IMSS sí lo encontré sin hacerme una cuenta. Lo guardé y ahí seguía. Y por lo menos no me prometiste un camión que no estás viendo.”

**Lo malo:** “Mi papel dice IMSS 6. Pongo eso y desaparecen los resultados. Si quito el seis, sí aparece. No debería tener que adivinar qué nombre acepta el buscador.”

**Lo que me haría dejarla:** “Te digo otra vez que uses mi ubicación y sigues diciendo diez metros del IMSS cuando ya estoy por el Tecnológico. Ese número ya no me sirve. Además giro el teléfono, bajo la pantalla y no alcanzo ningún resultado.”

**Duda concreta:** “Uno dice A y otro B. ¿Es ida y vuelta? Ya vi que en la ayuda dices que no, pero me lo pudiste explicar donde los estoy eligiendo.”

**Veredicto ficticio:** “La usaría para orientarme, pero corrige la ubicación y deja que llegue a la lista antes de que la considere confiable para mi viaje.”

Estas frases describen comportamientos observados a través de una persona de prueba. **No se atribuyen a usuarios reales de MetroRed.**

## Filtro pragmático obligatorio

| Queja | Clasificación | Hecho observado y decisión | Captura |
| --- | --- | --- | --- |
| La ubicación permanece vieja al solicitarla otra vez | **RED · defecto** | El contexto pasó del IMSS al Tec, aproximadamente 3.8 km; el resultado siguió siendo IMSS B a 10 m y ±20 m de precisión, sin advertir antigüedad. Lo sufriría también una persona competente con prisa. Corregir y repetir prueba. | [Posición inicial](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/04b-location-imss-readable.jpg), [después del movimiento](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/05b-location-stale-readable.jpg) |
| No se puede alcanzar la lista al girar a 844×390 | **RED · defecto de accesibilidad y flujo** | Panel con `overflow:hidden`: tras el máximo desplazamiento global, su borde inferior queda en y=376, la lista empieza en y=399.97 y el primer botón en y=432.92, con viewport de 390. Una segunda rueda no cambia el estado; no hay punto accesible por esa interacción. | [Pantalla baja](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/11-landscape-small-height.jpg), [después de desplazar](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/13-landscape-list-unreachable.jpg) |
| “IMSS 6” no encuentra el hospital | **RED · defecto de búsqueda** | Cero resultados frente a dos con “IMSS”. El referente incorporado ya identifica al Hospital General de Zona 6. Añadir aliases documentados para esos mismos puntos, sin inventar otro parador. | [Búsqueda IMSS 6](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/08-imss-6-empty.jpg) |
| A/B puede interpretarse como sentido | **GREEN · mejora de comprensión** | La ayuda aclara correctamente que no son ida/vuelta. Mostrar esa explicación cerca del selector evita buscarla. No inventar el sentido para eliminar la duda. | [Resultados A/B](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/02-imss-two-points.jpg), [ayuda existente](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/06-direction-explanation.jpg) |
| UASLP aparece en documentos L1 pero no en resultados | **YELLOW · límite de cobertura** | La extracción OSM es parcial y la app lo indica; no se probó ausencia de servicio. Dar contexto del destino documentado y solicitar datos SCT, sin fabricar una parada. No se transforma esta ausencia en una posición o recorrido. | [Búsqueda UASLP](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/09-uaslp-empty.jpg) |
| Falta saber cuándo llega el autobús | **YELLOW · dependencia externa declarada** | La app dice que no tiene estimación ni fuente conectada. El problema real de datos sigue pendiente, pero no es un error de JavaScript ni se arregla simulando una llegada. Mantener el estado claro y la vía de consulta. | [Detalle sin ETA](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/03-imss-detail.jpg) |

**WHITE:** no se fabricaron quejas para llenar esta categoría. Las limitaciones reales de información y accesibilidad no se descartan como “ruido de una persona mayor”.

Se crearon **cinco tickets locales**, tres RED, uno GREEN y un agregado YELLOW, en [tickets.md](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/tickets.md). No se abrieron issues ni mensajes externos. Estado inicial: reproducidos en este build y pendientes de revalidación tras cambios; una modificación de código posterior no los convierte automáticamente en resueltos.

## Recuperación, fuentes y consola

- El detalle móvil llevó el foco al `h2` del IMSS. “Punto A/B” no se presentó como sentido validado.
- “Punto Novel” encontró dos puntos mediante alias. No se trató como un descubrimiento nuevo: es una regresión ya corregida que permaneció operativa.
- El borrador mantuvo “Hospital General IMSS, Punto A”. CDP confirmó permiso `clipboard-write: denied`; apareció texto seleccionable de copia manual. **No se envió**. [Captura del fallback](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/07-report-fallback.jpg).
- Con red desconectada dentro de la sesión permanecieron 27 puntos, estado sin conexión y cero elementos de unidades recibidas. [Captura offline](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/10-offline-existing-session.jpg).
- Consola principal: **cero `pageerror`, cero errores de consola y cero solicitudes fallidas**; cuatro warnings de MapLibre: uno de encaje de bounds/padding y tres de filtros de escudos viales con valor nulo en el estilo. No se ocultaron como PASS sin incidencia. La validación complementaria registró dos de esos warnings de estilo, sin errores de página.
- Un primer intento del arnés asumió que `clearPermissions()` denegaría escritura al portapapeles; Chrome la permitió. El timeout de ese intento fue un **error de precondición de la prueba**, no un fallo del producto. Se corrigió mediante denegación CDP explícita y se repitió sobre el mismo build.

## Evidencia y límites

Registros ejecutables y resultados: [session.mjs](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/session.mjs), [session.json](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/session.json), [supplemental.mjs](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/supplemental.mjs) y [supplemental.json](C:/Users/pandi/Escritorio/Prototipo-Huasteca/.work/metrored-prototype/dogfood/supplemental.json).

Quince capturas JPEG suman **532,807 bytes**. Incluyen estados iniciales y complementarios legibles; no se generó vídeo ni traza pesada. Los scripts contienen únicamente automatización y coordenadas de prueba del pasajero, nunca credenciales ni posiciones reales de conductores.

La sesión no certifica accesibilidad completa, comportamiento de todos los dispositivos, precisión del GPS físico, operación actual de paraderos, llegada de unidades, integración SCT, entrevistas ni desempeño en campo. El build posterior que corrija estos puntos debe registrar su propia revalidación y evidencia; no hereda el resultado por cambiar textos o código.

## Revalidación posterior

Se implementaron las correcciones y se comprobaron en producción con el prefijo de Pages. [VERIFICACION.md](VERIFICACION.md) registra el build posterior, los 40 tests y los estados de UX-001 a UX-005. Las tres incidencias RED fueron reproducidas antes y verificadas tras corregirlas. La explicación A/B se añadió; UASLP ahora aparece como referente sin inventar una parada. Las dependencias SCT/ETA permanecen abiertas. Los scripts y registros posteriores están en `.work/metrored-prototype/dogfood/revalidation.json` y las suites de movilidad.

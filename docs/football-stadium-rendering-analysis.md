# StadiView: análisis del motor y transferencia a una guía 3D de la Huasteca

Fecha de consulta: 26 de octubre de 2026. Fase: análisis de fuentes; no se ha incorporado código, arte ni dependencias de la referencia al producto.

## Conclusión técnica

La aportación principal de StadiView es convertir una **unidad identificable del espacio en una experiencia desde esa unidad antes de decidir**. El asiento no termina en un marcador: tiene identidad, posición, orientación, información contextual, una cámara a altura de sus ojos, una vista previa y una acción posterior. Ese contrato puede trasladarse a un pueblo, una plaza, un hotel, una habitación o una cama de hostal. Requiere contenido y geometría verificables; ampliar el mapa de rutas o añadir más vuelos de cámara no produce por sí solo esa experiencia.

Hay una corrección importante para interpretar la referencia: **la selección densa no usa `Raycaster`; utiliza picking de colores en GPU con un render de un píxel**. La arquitectura está especializada en un estadio procedural repetitivo. No contiene una ciudad geográfica, inventario hotelero real, fotogrametría ni recorridos interiores documentados.

## Fuente y límites de esta revisión

- Repositorio: [thebuggeddev/football-stadium](https://github.com/thebuggeddev/football-stadium).
- Commit fijado: [`1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f`](https://github.com/thebuggeddev/football-stadium/commit/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f).
- Fuente principal: [`index.html` del commit](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html), líneas 1–4813. La copia de análisis está en `.work/references/football-stadium/index.html`.
- Comprobación de integridad: el blob remoto tiene 149,698 bytes; la copia local tiene 149,697. La comparación del texto remoto con el local es exacta al retirar únicamente el salto de línea final remoto. Las anclas de código coinciden. El `split` del remoto devuelve 4814 entradas por la última línea vacía; no son 4729 líneas.
- La referencia declara [PolyForm Noncommercial y una licencia comercial separada](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/README.md). Se estudian mecanismos y decisiones; la implementación propuesta es original.
- **Observado** significa visible directamente en esta fuente. **Derivado** es un cálculo a partir de sus constantes. **Inferencia** es una consecuencia probable que necesita medición o prueba. Este informe no atribuye FPS, memoria real ni comportamiento de un dispositivo a una ejecución que no haya medido.

Se examinó el skill local `reverse-engineer-anything`: excluye expresamente el análisis ordinario de repositorios con fuentes completas. Por ello se utilizaron lectura y búsqueda normales, sin herramientas binarias, instalación de la referencia ni extracción de arte.

## 1. Arquitectura de renderizado observada

### Una escena construida a partir de parámetros, no de modelos descargados

El HTML carga Three.js **r128** y GSAP **3.12.5** desde CDN. El propio bloque del motor declara la construcción procedural. El renderer usa antialiasing, preferencia de alto rendimiento, profundidad logarítmica, DPR limitado a 2, salida sRGB y ACES con exposición 1.12. La cámara es de perspectiva, con FOV inicial 50 y planos 0.3–1400. [Dependencias y renderer, L1782–1881](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L1782-L1881).

Las utilidades crean superficies entre anillos, fusionan cajas y generan texturas con Canvas 2D. Los materiales dominantes son Lambert y Phong. Tres definiciones de graderío contienen radios, altura, separación entre filas y número de secciones; esos parámetros producen el recinto y las localidades. [Utilidades, L1923–1974](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L1923-L1974), [materiales, L1977–2078](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L1977-L2078), [graderíos, L2640–2691](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L2640-L2691).

**Transferencia:** una escena legible puede construirse sin un archivo 3D pesado. En turismo, esa técnica debe apoyarse en huellas y dimensiones reales. No justifica generar un hotel inventado con una semilla y presentarlo como una reproducción del negocio.

### Instancing y separación entre forma visible y forma seleccionable

Cada asiento fusiona tres cajas —base, respaldo y soporte— en una geometría compartida. Un `InstancedMesh` contiene todas las transformaciones y colores visibles. Otro `InstancedMesh` utiliza cajas de selección algo mayores, una geometría más sencilla y un color identificador por instancia. Ambos reciben las mismas matrices. [Asiento y asignación, L3285–3341](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3285-L3341), [transformaciones, L3384–3445](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3384-L3445).

Las filas se distribuyen mediante una tabla de longitud de arco de la elipse y búsqueda binaria. Esto mantiene una separación espacial aproximadamente uniforme, en lugar de espaciar únicamente ángulos. [L3252–3283](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3252-L3283).

**Cálculo derivado:** reproduciendo únicamente la fórmula de conteo con sus constantes, aparecen 33,840 asientos: 10,272 inferiores, 9,264 de club y 14,304 superiores; 88 secciones en total. La geometría de tres cajas equivale a 36 triángulos por instancia, aproximadamente 1.22 millones de triángulos de asientos. Instancing reduce llamadas de dibujo y objetos JavaScript; no elimina el trabajo de vértices. No se ha medido el coste final en un teléfono.

La multitud añade otros dos grupos instanciados —torsos y cabezas— sobre los asientos ocupados. Su balanceo se aplica en el shader mediante uniformes, sin actualizar individualmente todas sus matrices cada frame. [L3449–3551](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3449-L3551).

**Transferencia:** camas iguales, árboles de una misma especie gráfica, luminarias, sillas o mobiliario repetido son candidatos a instancing. Edificios con huellas diferentes necesitan sus geometrías propias, agrupación por material/sector o lotes; convertir todo un pueblo en instancias de una caja perdería precisamente su identidad.

## 2. Identidad y metadatos: el componente más aprovechable

La tabla `meta` mantiene posición, giro, fila, número, sección, inicio y longitud de fila y disponibilidad en arrays tipados. `sections` conserva etiquetas y rangos de índices. La malla no es la base de datos: su índice permite reconstruir una ficha mediante `seatInfo`. [Estructuras, L3343–3354](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3343-L3354), [ficha, L3604–3623](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3604-L3623).

Como estimación de estructura, sólo esos arrays de metadatos ocupan 28 bytes por asiento, unos 0.95 MB para el conteo derivado. No es la memoria total: faltan geometrías, texturas, matrices de instancias, buffers GPU y multitud.

Precio y puntuación de vista son fórmulas a partir de distancia, posición y altura; disponibilidad utiliza aleatoriedad sembrada con una excepción para el asiento destacado. No son un sistema transaccional ni una medición de oclusión visual. [Disponibilidad, L3395–3427](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3395-L3427), [puntuación y precio, L3573–3592](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3573-L3592).

**Diseño original propuesto:** un registro de unidades con identidad estable: `townId → placeId → unitId → viewpointId`. La entidad seleccionada debe vincular geometría, medios, proveedor, fecha de verificación y acciones. Los índices GPU son temporales; una tabla los resuelve al ID estable del negocio o unidad. Cambiar de LOD, recargar un sector o ordenar resultados no debe cambiar la identidad comercial.

## 3. Picking: GPU de un píxel y sus límites

La escena de picking contiene únicamente la malla de cajas de selección. Cada instancia codifica `índice + 1` en RGB; el cero representa fondo. `pickAt` ajusta la cámara a un píxel con `setViewOffset`, renderiza a un `WebGLRenderTarget(1,1)`, lee cuatro bytes y recupera el índice. [Escena independiente, L3555–3557](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3555-L3557), [picking, L3641–3661](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3641-L3661).

El hover se limita a una lectura cada 60 ms, sólo en vista orbital y sin punteros arrastrando. Se conserva el último movimiento pendiente. [L4578–4596](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L4578-L4596).

Observaciones e inferencias que importan al trasladarlo:

- **Observado:** no se utiliza `Raycaster` en este HTML. Nuestra selección actual de pocas áreas mediante raycasting no necesita sustituirse sólo por imitar la referencia.
- **Inferencia de rendimiento:** la lectura de píxeles puede sincronizar CPU/GPU. Un destino de un píxel reduce el trabajo de fragmentos y transferencia, pero no convierte en gratuito transformar todas las instancias. Debe compararse con raycasting e índices espaciales sobre el conjunto real.
- **Observado:** las cajas de picking no incluyen techo ni muros como oclusores. **Riesgo por validar:** podrían seleccionarse unidades ocultas por una superficie sólida. En un hotel, la planta activa, las paredes y la visibilidad deben tener reglas explícitas.
- **Observado:** las coordenadas de `pickAt` parten del viewport completo. Para un canvas dentro de nuestra interfaz se debe descontar su rectángulo y convertir correctamente CSS px a píxeles del buffer.
- **Propuesta:** picking grueso de sector/pueblo, después picking fino de inmueble/unidad. Lista HTML sincronizada, foco visible y alternativa de selección accesible deben conservar la misma identidad.

## 4. Cámara: vista del objeto y vista desde el objeto

El motor separa `orbit`, `fly` y `seat`. La vista orbital se calcula con coordenadas esféricas; la vista desde un asiento almacena ojos, orientación base y desplazamientos de mirada. `eyeFor` toma la posición del asiento, la desplaza un poco hacia el campo y suma 1.18 unidades de altura. `lookFor` define el objetivo hacia el terreno de juego. [Estados y anclajes, L3776–3825](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3776-L3825).

El vuelo hacia la unidad sigue una curva Catmull–Rom con dos puntos elevados. GSAP anima un progreso; posición, objetivo y FOV cambian juntos, pero con ventanas de interpolación distintas. Dura 3.4 s normalmente y 0.7 s con movimiento reducido. Al llegar cambia el modo de interacción. La vuelta conserva la órbita anterior y utiliza otra curva. [Ida, L3991–4056](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3991-L4056), [POV y regreso, L4057–4134](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L4057-L4134).

**Lo que debe heredarse como patrón:** seleccionar una ventana, habitación, mirador o acceso cambia el punto de observación de forma semántica. Hacer zoom al tejado no equivale a estar dentro de una habitación. Un `Viewpoint` original necesita origen, orientación, FOV, medio asociado y una salida que restaure el contexto anterior.

**Lo que requiere otra solución:** los puntos altos de una curva no constituyen detección de colisiones. Un vuelo en una ciudad puede atravesar edificios. Además, Escape y el regreso se gestionan en modo `seat`, no como cancelación general de `fly`. Para turismo proponemos un controlador único de transición, cancelable y reemplazable por una nueva selección, con trayectorias comprobadas o un corte/fundido cuando no hay espacio navegable documentado.

GSAP es un mecanismo de interpolación en la referencia, no un requisito del producto. El motor propio puede conservar interpolación basada en tiempo y control de progreso; no se necesita instalar GSAP para conseguir la relación espacio → unidad → POV.

### La miniatura proviene de la propia escena

`captureView` guarda la cámara, la coloca en el punto de ojos, renderiza, reduce el canvas a 480×290, produce un JPEG y restaura posición, orientación y FOV. La tarjeta muestra una captura del modelo procedural. No es una fotografía de un estadio real. [L3891–3921](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3891-L3921).

Para alojamientos, la vista comercial debería proceder de un panorama capturado o de un modelo medido y validado por el operador. Una imagen de habitación convencional no permite inventar su reverso y presentarlo como recorrido 360. La previsualización del modelo puede existir con una etiqueta de representación, separada del medio real.

## 5. Inputs, minimapa y movimiento reducido

La interacción usa Pointer Events y captura del puntero. Distingue clic de arrastre con distancia acumulada menor de 7 px y duración menor de 520 ms; añade pinch, zoom con rueda y límites de yaw/pitch en POV. Hay teclado para órbita, Escape y confirmación. [L4136–4290](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L4136-L4290).

Si una localidad no está disponible, el código busca otra libre en su misma fila y lo comunica mediante un aviso. [L4202–4239](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L4202-L4239). En turismo no conviene trasladar automáticamente esa sustitución a habitaciones o camas: se deben ofrecer alternativas identificadas con su vista y condiciones, sin hacer pasar otra unidad por la elegida.

El minimapa utiliza Canvas 2D: una base de secciones se cachea y la selección se superpone. Otro mapa dibuja graderíos, asiento y posición de cámara. Su línea de cámara va hacia el centro del estadio; se calcula a partir de su posición, no representa necesariamente la dirección actual de la cabeza. [L4389–4576](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L4389-L4576).

**Transferencia propuesta:** mapa regional en la exploración general; plano del pueblo en calles; planta real del inmueble al entrar. Mostrar unidad y flecha de mirada calculada a partir de la orientación actual. La guía mantiene hitos visitados y un regreso inequívoco. La selección HTML y el mapa deben ofrecer las mismas opciones; los atajos no deben capturar flechas o Enter mientras se escribe en un formulario.

La preferencia de movimiento reducido se lee una vez. Desactiva órbita automática y balanceo de cabeza, acorta vuelos y prácticamente anula animaciones CSS. No detiene toda la simulación de partido, desplazamiento de LEDs, multitud o pulso de selección del loop. [CSS, L1290–1295](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L1290-L1295), [preferencia, L1793–1795](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L1793-L1795), [loop, L4745–4793](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L4745-L4793). Nuestro diseño debería ofrecer salto directo al POV, cambiar esa preferencia en vivo y separar el movimiento necesario del ambiente decorativo.

## 6. Rendimiento, iluminación y costes que no deben copiarse a ciegas

| Observación en la fuente | Consecuencia o decisión para el motor original |
|---|---|
| Sol con sombra PCF suave de 1024², cuatro focos y luces de relleno. [L1883–1921](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L1883-L1921) | Mantener un presupuesto de luces/sombras por escena. El detalle local puede necesitar otra sombra encuadrada al lugar, no aumentar todas las luces de la región. |
| Los haces llamados volumétricos son cilindros abiertos con textura, transparencia aditiva y niebla desactivada. [L3083–3127](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3083-L3127) | Es una aproximación gráfica eficiente, no dispersión volumétrica física. No inferir un motor atmosférico avanzado únicamente por su apariencia. |
| Asientos, proxies y multitud tienen `frustumCulled = false`. [L3321–3341](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3321-L3341), [L3487–3490](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L3487-L3490) | Un recinto cerrado tolera decisiones diferentes a una región. Para pueblos: sectores espaciales, límites de lote, LOD y descarga de interiores no activos. |
| Calidad adaptativa cada 2.5 s: baja DPR si FPS estimados <40, lo sube si >75; límites 0.75–2. [L4716–4740](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L4716-L4740) | Es adaptación de resolución, no LOD geométrico. Probar primero perfiles móvil/escritorio y costes de picking, texturas y sombreado por separado. |
| El loop siempre solicita otro frame y redibuja ambos mapas, simulación y escena. [L4742–4810](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L4742-L4810) | Conservar render bajo demanda, suspensión al ocultar y animar sólo lo solicitado en la plataforma turística. Una vista de habitación inmóvil no requiere una simulación deportiva continua. |
| `dt` se limita a 0.05; ese valor alimenta también el estimador de FPS. [L4725–4748](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/index.html#L4725-L4748) | Inferencia: en frames muy lentos, el tiempo limitado subestima el coste real. Medir rendimiento con tiempo de pared independiente y usar otra variable para limitar la simulación. |

La búsqueda completa del HTML no encontró `dispose`, `cancelAnimationFrame`, `visibilitychange` ni manejo de `webglcontextlost`. Es una aplicación de página completa, no un componente preparado para entrar y salir repetidamente dentro de un dashboard. La reconstrucción original necesita lifecycle explícito, liberación de recursos, fallback y recuperación. Esta ausencia en el HTML no demuestra nada sobre capas de infraestructura no examinadas.

## 7. Traducción concreta: espacio → unidad → POV → acción

Las siguientes son propuestas de producto y arquitectura, no funciones existentes en StadiView ni nuevas funciones implementadas en esta fase.

| Espacio real | Unidad seleccionable | Vista desde la unidad | Acción contextual propuesta |
|---|---|---|---|
| Pueblo y centro urbano | Plaza, acceso a un negocio, punto de información o parada de guía | Panorama tomado en ese punto o subescena local con origen/orientación verificados | Iniciar una guía corta, comparar lugares cercanos, incorporar una visita al plan |
| Hotel | Edificio → planta → habitación identificada o tipo de habitación expresamente indicado | Interior, balcón y vista exterior capturados; modelo medido sólo si existe documentación | Comparar vista/servicios y solicitar disponibilidad de la unidad correcta |
| Hostal | Planta → dormitorio → cama o tipo de cama identificable | Perspectiva y espacio del dormitorio, baño y áreas comunes documentados | Comparar privacidad, distribución y servicios; preguntar por esa opción |
| Plaza o conjunto cultural | Monumento, fachada, zona de estancia y hito de guía | Punto de observación geolocalizado con contenido accesible y contexto local | Escuchar/leer una explicación, continuar al siguiente hito o guardar el lugar |
| Negocio turístico | Recepción, punto de reunión, equipo o instalación | Evidencia visual del acceso y de lo que recibirá el viajero | Contactar, añadir servicio o crear un paquete con ese negocio |

Un POV necesita, como mínimo, identidad, referencia al lugar/unidad, posición local o coordenadas, altura de ojos, orientación, FOV, medio, autor/proveedor, fecha y tipo de evidencia. Un estado de inventario o precio debe tener fuente y vigencia propias; una fórmula visual no los sustituye.

## 8. Geografía y detalle: cómo evitar otro mapa de objetos genéricos

Proponemos conservar el atlas regional existente como primer nivel y abrir **subescenas locales en metros**, con origen cercano al pueblo o inmueble. La exageración vertical regional 4× sirve para lectura del relieve; no debe trasladarse a una plaza o habitación ni utilizarse para calcular altura de ojos.

Como fuente posible de exterior, OpenStreetMap describe edificios mediante huellas y contempla `building:levels`; su cobertura puede estar incompleta y los niveles no equivalen a un plano interior. Deben respetarse su atribución y condiciones de datos. [Huellas](https://wiki.openstreetmap.org/wiki/Key:building), [niveles](https://wiki.openstreetmap.org/wiki/Key:building:levels), [licencia y atribución](https://www.openstreetmap.org/copyright).

El proceso original propuesto sería: recorte local fechado → validación de huellas/multipolígonos → volúmenes con altura documentada o estimación marcada → asociación a lugares verificados → medios aportados por el negocio. Cuando falte una planta o altura, debe quedar como dato desconocido; una huella exterior no autoriza a inventar puertas, habitaciones, camas ni recorridos interiores.

### Separación de responsabilidades propuesta

- **Registro semántico:** lugar, unidad, POV, medios, proveedor y acciones; identidad independiente del render.
- **Escenas:** atlas regional, pueblo, exterior de inmueble y vista interior/360 cargados por demanda.
- **Selección:** registro de IDs, proxies y oclusores, con elección de CPU/GPU según medición.
- **Cámara:** estados regional/local/transición/POV, transición cancelable y restauración de contexto.
- **Guía:** capítulos e hitos ligados a unidades reales; mapa/plano indica posición y mirada.
- **UI:** inspector y controles HTML accesibles; el canvas ayuda a comprender y escoger.
- **Recursos:** caché limitada, presets de calidad, render en reposo, recuperación y limpieza.

No se propone portar el HTML monolítico ni sus controles globales. Estas responsabilidades pueden crecer sobre React y Three.js ya instalados, manteniendo nuestras reglas de memoria, selección, cámara y persistencia.

## 9. Evidencia necesaria para una primera implementación posterior

La prueba más útil sería una vertical pequeña y verificable: un centro urbano real con plaza y accesos, más un alojamiento colaborador con sus unidades y POVs autorizados. El viajero debe poder pasar de su ubicación en el pueblo a una unidad concreta, mirar desde ella, salir conservando el contexto y ejecutar una acción relacionada con esa misma unidad.

Criterios propuestos antes de ampliar el territorio:

1. La huella y el lugar coinciden con sus fuentes; se distingue geometría medida de aproximación.
2. Seleccionar una unidad cambia ficha y POV de esa misma identidad, incluso al cambiar LOD o planta.
3. La cámara no atraviesa superficies sólidas durante la transición documentada; Escape la cancela y devuelve el contexto.
4. El minimapa/plano muestra posición y orientación actuales.
5. Ratón, touch, teclado y lista accesible llegan a las mismas unidades; arrastrar no selecciona.
6. El contenido real conserva autoría y fecha; no se presentan capturas sintéticas como panoramas reales.
7. Se mide una carga representativa en móvil y escritorio: frames, draw calls, memoria GPU estimada, latencia de selección y reposo. No hay objetivo de FPS ya acreditado por este análisis.
8. No hay cobro ni reserva aparente sin integración real. Si la acción inicial es solicitar información o añadir al itinerario, se presenta con ese alcance.

## Cobertura y pendientes

Quedan cubiertos por inspección estática: construcción procedural, instancing, metadatos, picking GPU, cámara orbital/POV, vuelos GSAP, miniaturas, minimapas, iluminación, inputs, loop, adaptación de DPR y alcance real del movimiento reducido. Las cifras de asientos/triángulos son cálculos derivados de las constantes.

No se ha validado aquí la tasa de frames real, el picking detrás del techo, colisiones de cámara en runtime ni la disponibilidad de huellas/interiores de negocios concretos de la Huasteca. Esas comprobaciones pertenecen a la evidencia de ejecución y a la adquisición de contenido de una futura implementación original. En esta fase sólo se entrega análisis.

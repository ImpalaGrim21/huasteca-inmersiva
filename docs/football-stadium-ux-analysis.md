# StadiView: observación de la experiencia y aplicación a guías turísticas

Fecha de revisión: 26 de octubre de 2026, zona de Ciudad de México.

La idea útil de esta referencia es **elegir una entidad del espacio y observar desde su ubicación antes de decidir**. La cámara, la ficha y el indicador de posición describen el mismo asiento. Esa relación puede trasladarse a un pueblo, una plaza, un alojamiento o un servicio; no depende de crear un recorrido que se reproduzca automáticamente.

## Qué se ejecutó y qué no

El [demo público](https://football-stadium-ruddy.vercel.app/) devolvió **HTTP 402, «Deployment Paused»**. Se comprobó con el navegador y con la consulta web; la captura `00-public-deployment-paused.webp` conserva esa evidencia. Por tanto, los resultados interactivos siguientes **no describen un despliegue público funcionando**.

Para observar la referencia se ejecutó sin cambios la copia de `index.html` del [repositorio original](https://github.com/thebuggeddev/football-stadium), commit [`1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f`](https://github.com/thebuggeddev/football-stadium/tree/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f), servida por HTTP local. El archivo mide 149,697 bytes. Se reutilizaron los iconos de esa misma referencia y sus dependencias por CDN; no se instaló el repositorio ni se descargaron modelos o paquetes para este análisis.

Se usó el skill Playwright Interactive con Edge instalado, manteniendo sesiones persistentes: escritorio de 1440 × 900, emulación táctil de 390 × 844 y una sesión con `prefers-reduced-motion: reduce`. Las comprobaciones usaron clics, arrastre, rueda, teclado, toques y eventos táctiles del navegador. Las lecturas de estado ayudaron a comprobar los resultados; no se modificó la cámara ni la selección mediante JavaScript para simular acciones exitosas.

El [README](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/README.md) presenta el proyecto como una demostración con datos de venta simulados. La ejecución confirmó esa limitación: no se abrió un pago, no se compró ni reservó nada y no se envió contacto. Tampoco se siguieron los enlaces externos de apoyo económico.

## Flujo observado

| Momento | Acción ejecutada | Resultado visible o comprobado |
| --- | --- | --- |
| Entrada | Abrir la referencia local | Escena completa del estadio, ficha de partido, ficha de asiento sugerido, dos mapas pequeños y controles flotantes. El indicador de construcción anuncia 33,840 asientos; no se comprobó individualmente esa cantidad. |
| Apuntar | Mover el cursor sobre graderíos | Aparece información de sección, fila, asiento y disponibilidad. Una posición disponible mostró precio y puntuación de vista. |
| Elegir | Clic real en el graderío | Se seleccionó sección 202, fila 2, asiento 21. La ficha cambió inmediatamente y la cámara comenzó a trasladarse al asiento. |
| Llegar | Esperar el final del vuelo | Apareció una vista desde la grada a altura del espectador, el botón para volver y una miniatura de esa vista en la ficha. La etiqueta dejó de ser sugerencia y pasó a previsualización. |
| Mirar | Arrastrar sobre el espacio central | Cambió la orientación desde el mismo asiento: se observaron cambios de yaw y pitch, manteniendo la ubicación del observador. |
| Acercar | Rueda en el POV | El campo de visión cambió de 55° a 50.6°. No se desplazó al espectador a otro asiento. |
| Confirmar | Enter en el POV | La ficha mostró estado confirmado y el CTA cambió. Fue una confirmación de demostración, no una venta. |
| Continuar | Clic en el CTA ya confirmado | Un aviso indicó que el checkout no está conectado. No apareció formulario de cobro ni navegación de pago. |
| Volver | Escape; después, en otra prueba, el botón de retorno | La cámara regresó al encuadre anterior. La ficha conservó el asiento elegido; no se perdió toda la selección al abandonar el POV. |
| Orientar | Flecha derecha y tecla + | En modo general cambió el ángulo orbital y disminuyó el radio de cámara. |
| Cambiar vista | Botón 3D/2D | Pasó a un encuadre cenital. Sigue siendo una cámara en perspectiva, no una proyección ortográfica. El reset devolvió el encuadre general. |
| Usar mapas pequeños | Clic en el mapa de overview | No cambió la selección ni la cámara. Los mapas funcionan como indicadores de orientación; no se observó navegación por clic en ellos. |
| Guardar interés | Botón de favorito en la ficha, dos veces | Su aspecto cambió y volvió al estado inicial. No apareció una colección comparativa. |
| Revisar acciones superiores | Clic en Cart, Favorites y Search | No se abrió un panel ni cambió la vista. El carrito siguió indicando dos elementos, incluso después de confirmar otro asiento. |
| Revisar navegación | Enlace Experience | Sólo añadió `#` a la URL; la vista siguió en Stadium. No se observó una sección funcional nueva. |
| Probar VR | Botón correspondiente | Un aviso explicó que no está incluido en esta versión. No se abrió una experiencia WebXR. |
| Consultar ayuda | Botón de controles | Mostró instrucciones breves para girar, acercar y elegir. |
| Elegir otra opción | Regresar y seleccionar otro lugar | La ficha anterior fue reemplazada. No se observó comparación simultánea, historial de vistas ni cesta acumulativa de asientos. |
| Asiento ocupado | Clic en sección 104, fila 15, asiento 15, marcado no disponible | Un aviso informó del cambio y el sistema llevó al asiento 14 de la misma fila. Se verificó la nueva identidad en la ficha. |

La miniatura no es una fotografía externa del estadio. La función de la referencia captura su propia escena desde la posición del asiento y coloca el resultado en la ficha. La ejecución comprobó que la miniatura se completaba al llegar. Ese vínculo entre lo elegido y lo mostrado es más valioso que una tarjeta ilustrativa genérica.

El badge de 360° no demuestra una panorámica fotográfica ni libertad de giro completa. Durante la prueba el yaw llegó al límite de -1.5 radianes; la fuente establece límites simétricos de mirada. Lo comprobado fue una vista tridimensional con giro limitado desde el asiento.

## Cámara y orientación

El estadio permite reconocer tres estados distintos: vista general, transición y observación desde el asiento. La misma ficha acompaña esos estados, por lo que elegir una posición no abre otra página desligada del espacio. Al salir se recupera el contexto anterior; no se reinicia siempre desde una portada.

Los mapas pequeños muestran la posición seleccionada y un indicador de cámara. Esto ayuda a relacionar «dónde estoy» con «hacia dónde miro». No se debe convertir su presencia en una afirmación de navegación interactiva: el clic ejecutado no navegó.

La transición no siempre conserva una buena referencia visual. En una captura intermedia del vuelo hacia la sección 104, una pared exterior ocupa la derecha y queda mucho cielo en el centro. Es un traslado real de cámara, pero su trayectoria genérica puede perder temporalmente el lugar que interesa. Para una calle, entrada de hotel o mirador haría falta ajustar altura, dirección y obstáculos, o elegir un cambio de vista más corto.

El sonido se inicializa después de una interacción y tiene un control que cambia el estado de mute. Se verificó ese cambio y el estado del AudioContext; **no se realizó evaluación auditiva**. La fuente sintetiza ambiente de estadio. No sería evidencia sonora válida para representar una cascada o una calle de la Huasteca.

## Resultado móvil y movimiento reducido

En 390 × 844 desaparecen la navegación superior extensa, la ficha de partido y los mapas pequeños. La ficha de asiento ocupa la parte inferior. La escena permanece visible sobre ella y no hubo desbordamiento horizontal.

La primera captura mostraba la ficha desde y≈456 hasta y≈1074, fuera de los 844 px de pantalla. **Eso no significa que su CTA sea imposible de alcanzar**: `#rightcol` tiene scroll interno, aunque oculta su barra. Se comprobó con un arrastre táctil vertical que su `scrollTop` pasó de 0 a 179. Después se alcanzó Grab seat y se entró al POV desde el asiento sugerido.

Sí hay una dificultad de composición: el dock flotante se coloca sobre el contenido de la ficha y, ya en POV, la píldora de retorno cubre parte del CTA inferior. Las capturas 07 y 08 muestran ambos estados. La acción de retorno sigue siendo alcanzable, pero la jerarquía de acciones compite por el mismo borde inferior. No conviene trasladar ese apilamiento de paneles a una guía turística.

El arrastre táctil vertical/diagonal en la parte visible de la escena cambió la mirada en POV. El botón de retorno funcionó y conservó el asiento. Un intento previo de gesto horizontal produjo navegación hacia la entrada anterior del navegador en esta emulación de Edge; se repitió la prueba con gesto vertical y no ocurrió. Ese intento aislado no se presenta como defecto confirmado en Android o iOS físicos.

Con movimiento reducido, la cámara general dejó de orbitar automáticamente: las posiciones medidas antes y después de 550 ms fueron iguales. Sin embargo, los jugadores siguieron moviéndose y el cambio al asiento todavía recorrió una trayectoria. A los 140 ms seguía en estado de vuelo y terminó aproximadamente a los 789 ms en esta sesión. Es una reducción del tiempo, no eliminación del desplazamiento.

La lectura de fuente aclara los valores nominales: vuelo normal de 3.4 s y reducido de 0.7 s; retorno de 2.2 s y 0.6 s. Las animaciones CSS también se acortan. Estas cifras describen esa implementación; las pruebas no son un benchmark de rendimiento ni una validación en hardware móvil real.

## Qué trasladar a la Huasteca

La unidad principal debería ser un **lugar o servicio que se puede explorar**, con uno o más puntos de observación identificables. Una ruta sería una colección opcional de esos lugares, no el requisito para entrar a cada uno.

| Entidad turística | Qué se elige | Qué debe mostrar la experiencia | Acción concreta posterior |
| --- | --- | --- | --- |
| Pueblo | Plaza, calle, mercado, acceso o barrio | Contexto urbano real, orientación norte y puntos cercanos; entrada a un lugar sin perder el municipio de referencia | Guardar el lugar, abrir su información o incorporarlo al viaje |
| Hotel | Edificio, acceso, terraza o habitación documentada | Exterior reconocible y vista vinculada a la habitación o espacio elegido, con ubicación y fuente de sus medios | Comparar opciones del mismo hotel o consultar disponibilidad cuando exista integración real |
| Hostal | Dormitorio, habitación privada, cocina o espacio común | Distribución y espacios que afectan la decisión, distinguiendo zonas privadas de compartidas | Elegir modalidad y revisar condiciones aportadas por el negocio |
| Plaza | Acceso, zona de estancia o punto de observación | Relación con calles, recorridos peatonales y servicios próximos, sin convertir edificios vecinos en decorado intercambiable | Explorar servicios de alrededor o guardar un punto de encuentro |
| Restaurante o servicio | Entrada, mesa/terraza, módulo de atención o actividad | Lugar donde se presta el servicio, qué incluye y cómo se accede | Añadir al plan o iniciar la acción habilitada por el proveedor |
| Atractivo natural | Mirador, embarque, sendero o punto de llegada verificado | Vista y acceso correspondientes a ese punto; explicación de lo que se ve | Diseñar una experiencia o enlazarlo con otros lugares |

La información debería compartir una identidad estable entre escena, ficha y acción: nombre, tipo, municipio, coordenadas, punto de vista, medio autorizado, opciones y relación con otros lugares. Un hotel no es simplemente un pin al que se aplica la misma cascada de fondo; tampoco una habitación es equivalente a un asiento generado.

La geometría urbana puede servir para orientarse y ubicar edificios o accesos. Una vista real del interior exige medios del negocio o un levantamiento válido. Si sólo existe una foto plana, se presenta como fotografía; si existe una panorámica, se identifica como tal; si se crea una reconstrucción interpretativa, se distingue de una captura real. No corresponde prometer un 360° o una vista exacta de habitación sin esos datos.

Se puede conservar el principio de previsualizar antes de decidir y desarrollar una implementación original: elegir un lugar, acercarse a su entorno, entrar a un punto de observación, mirar, consultar información y volver al mismo contexto. El modo guiado puede proponer una secuencia, mientras la exploración libre permite saltar entre hoteles, plazas y servicios.

## Cambios necesarios al trasladar el concepto

1. **Ubicación y orientación siempre relacionadas.** El mapa pequeño debe mostrar calles y edificios reales cuando se dispone de ellos, el lugar seleccionado y la dirección de mirada. Una rosa de los vientos genérica no sustituye esa relación.
2. **Entradas coherentes.** La cámara se dirige a un acceso, una calle o un punto de observación; no al centro del volumen de un edificio atravesando paredes. Los puntos interiores necesitan su propia referencia espacial.
3. **Exploración sin ruta obligatoria.** Desde el pueblo se debe poder entrar a un hostal, volver a la plaza y abrir otro servicio sin crear ni reproducir un paquete turístico.
4. **Comparación que sí exista.** Si se ofrece comparar alojamientos o habitaciones, guardar opciones identificadas y mostrar atributos comparables. La referencia no aporta una comparación funcional que se pueda dar por resuelta.
5. **Alternativas explícitas.** No sustituir silenciosamente una habitación o servicio no disponible por otro. Mostrar la diferencia y dejar que el viajero lo elija. La reasignación automática de asiento no es adecuada para todos los servicios turísticos.
6. **Acciones verificables.** Favoritos, plan de viaje y disponibilidad deben producir estados reales y persistentes si se presentan como funciones. Evitar contadores decorativos como el carrito estático observado.
7. **Móvil con zonas claras.** Escena, ficha desplazable y acciones deben tener espacio propio. Una ficha breve puede expandirse, pero el retorno y el CTA no deben taparse entre sí. Los gestos de la escena necesitan convivir con el scroll del contenido.
8. **Acceso por teclado y lista.** Las flechas para mover cámara no permiten por sí solas escoger entre miles de objetos de canvas. Ofrecer un índice de lugares y servicios con botones accesibles y reflejar su selección en el mapa y en la escena.
9. **Movimiento reducido sin recorrido forzado.** Suprimir la órbita automática y permitir un cambio breve de vista que mantenga orientación. Acelerar el mismo vuelo largo puede seguir siendo incómodo.
10. **Carga por lugar.** Pedir el detalle o medio del lugar elegido cuando sea necesario y reutilizar miniaturas compactas. La referencia resuelve un único recinto procedural; no demuestra por sí sola escalabilidad a pueblos completos y múltiples interiores.

## Evidencias guardadas y alcance

Las capturas son material interno de estudio, guardado exclusivamente en `.work/references/football-stadium/`. No se incorporaron al producto ni a `public/`. Son diez WebP, **684,542 bytes en total**, con escritorio reducido a 1100–1280 px y móvil a 390 px de ancho. No se guardaron vídeos ni PNG de gran tamaño.

| Archivo | Estado documentado |
| --- | --- |
| `00-public-deployment-paused.webp` | Respuesta pública pausada |
| `01-desktop-overview.webp` | Escena general y distribución de controles |
| `02-camera-flight.webp` | Cámara durante el traslado, no POV ya asentado |
| `03-seat-pov.webp` | Punto de vista del asiento 202/2/21 |
| `04-confirmation-demo.webp` | Confirmación y aviso de checkout no conectado |
| `05-topdown-navigation.webp` | Encuadre cenital y conservación de ficha |
| `06-alternate-seat-pov.webp` | Punto de vista del asiento 104/15/14 |
| `07-mobile-overview.webp` | Ficha móvil inicial y dock superpuesto |
| `08-mobile-pov-obstruction.webp` | POV móvil, ficha desplazada y retorno sobre CTA |
| `09-reduced-motion-pov.webp` | Estado alcanzado con la preferencia de movimiento reducido |

No se registraron errores JavaScript de página en las sesiones de escritorio, móvil o movimiento reducido. Se cubrieron dos casos fuera del camino principal —asiento ocupado y repetición de confirmación— además de retorno por dos vías y selección de un segundo asiento. Quedan fuera del alcance las ventas, la disponibilidad real, dispositivos VR, pruebas con lectores de pantalla y rendimiento en teléfonos físicos.

El proyecto declara [PolyForm Noncommercial 1.0.0](https://github.com/thebuggeddev/football-stadium/blob/1e4387d2f919a1c2be3c0607d2e78e7fc5d90e7f/LICENSE.md) y condiciones separadas para uso comercial. Este trabajo estudia su funcionamiento y propone una implementación original; no incorpora su código, interfaz, geometría ni capturas en la plataforma turística.

Al terminar se cerraron todas las sesiones de navegador propias. El servidor temporal propio de 5197 se detuvo; el servidor de referencia 5176, administrado por la tarea principal, quedó intacto.

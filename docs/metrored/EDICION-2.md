# MiRedMetro · edición 2

28 de octubre de 2026. La navegación ahora comienza por el destino y conserva un traslado continuo: preparar → confirmar abordaje → viajar → bajar → tramo final → llegada → regreso. El descenso ya no declara que la persona llegó al lugar.

## Diseño y funciones aplicadas

Tres ilustraciones originales generadas para esta identidad, señalización propia y un sistema editorial de tinta, papel, lima y bermellón se aplican a portada, planificación, mapa, viaje activo, llegada, regreso, ayuda y red. Las ilustraciones son interpretativas; no son fotografías ni pruebas de puntos reales. Los cuatro archivos WebP finales suman 657,324 bytes; los originales no se publican. No se instalaron modelos ni un runtime de IA.

La búsqueda incluye un catálogo seleccionado de 209 destinos reales de OpenStreetMap, además de las referencias de L1. Los centros de áreas no se presentan como entradas. Los 27 puntos comunitarios siguen identificados por fuente; A/B distingue coordenadas, no sentido de servicio. Una secuencia nominal publicada en 2025 explica el corredor sin inventar geometría operativa.

El viaje guarda referencias por IDs, permite reanudación explícita, confirma antes de abordar y prepara el regreso con otra confirmación. Ubicación voluntaria y caducable, notas privadas, fichas, QR institucional, ayuda y borrador de consulta siguen disponibles. No se guarda historial GPS. La guía offline usa un paquete atómico inferior al presupuesto de 6 MB; el mapa base requiere internet.

## Verificación

`VITE_BASE_PATH=/huasteca-inmersiva/ npm run verify`: **80/80 pruebas, cero omitidas**, build estricto aprobado. Comprende 17 pruebas originales de contrato/herramientas, 23 del motor de viaje/cancelación, 10 de actualización offline, 6 de turismo, 12 de paraderos, 5 de herramientas y 7 del viaje completo.

La evaluación adversarial reprodujo y corrigió pérdida de scroll entre etapas, opciones indistinguibles, descenso confundido con llegada, hover oscilante, avisos ocultos y recuperación del mapa tapada por una tarjeta redundante. Las pruebas del nuevo flujo incluyen móvil, horizontal, regreso, permiso GPS denegado y recarga offline. La persona de evaluación es ficticia; no se presenta como pasajera entrevistada.

## Alcances reales

Es una aplicación independiente de orientación. Faltan el padrón operativo vigente por sentido, accesos comprobados, calendario y fuente autorizada SCT. No se muestran unidades, ETA, ocupación ni alertas simuladas. No se ha demostrado superioridad frente a Maps/Moovit ni certificación WCAG o rendimiento de campo.

La investigación competitiva y el contrato de experiencia están en [EXPERIENCIA-VIAJE.md](EXPERIENCIA-VIAJE.md). Las necesidades documentales locales están en [INVESTIGACION-USUARIOS.md](INVESTIGACION-USUARIOS.md). Los datos cartográficos conservan atribución y licencia ODbL dentro de sus archivos. La integración futura se detalla en [INTEGRACION-SCT.md](INTEGRACION-SCT.md).

La publicación de movilidad conserva la versión turística pública estable; excluye la autoría 3D local que estaba pausada.

# MiRedMetro Valles · prototipo funcional

Avance del 28-10-2026 para **L1 Universitaria de Ciudad Valles**, como guía independiente. Entrada: `/movilidad/`; bajo la base de Pages: `/huasteca-inmersiva/movilidad/`. El prototipo turístico conserva su entrada original.

## Qué puedes hacer

- Consultar MapLibre GL JS con cartografía OpenFreeMap y 27 puntos de paraderos representados en OSM, 14 nombres y cobertura parcial.
- Buscar nombres, aliases y destinos de referencia. “IMSS 6” encuentra los puntos del hospital. UASLP aparece como lugar documentado, separado de paraderos.
- Seleccionar puntos A/B, guardar favoritos, copiar un enlace y conservar una nota privada para reconocer una ubicación.
- Solicitar ubicación voluntariamente, ordenar por distancia geográfica y renovar la captura. La muestra caduca tras dos minutos; no se conserva historial ni se presenta como caminata calculada.
- Preparar una pregunta grande para mostrar al operador, eligiendo **subir**, **llegar** o **regresar**. No es una instrucción de viaje ni garantiza servicio.
- Copiar o descargar una ficha TXT de referencia con coordenadas cartográficas, fuente y límites. Excluye nota privada y ubicación del pasajero.
- Consultar gratuidad publicada, QR oficial, accesibilidad pendiente de verificar y teléfono institucional. Preparar un borrador contextual de consulta, sin enviarlo.
- Recargar la guía sin conexión después de completar la instalación de su paquete local. No se precargan tiles; sin internet el mapa base y los datos de unidades quedan indisponibles, mientras lista, guardados y herramientas siguen funcionando.

**No hay GPS SCT conectado, ETA, ocupación, avisos vigentes ni trazo/sentidos operativos validados.** Los puntos OSM tienen levantamientos declarados de septiembre de 2025; consultar su representación el 28-10-2026 no confirma que una unidad atienda hoy ese lugar. A/B no significa ida/vuelta.

## Abrir y verificar

Con Node y dependencias existentes:

```powershell
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173/movilidad/` si ese puerto está disponible. El almacenamiento offline se registra sólo en build de producción, no en Vite dev.

Para comprobar el mismo prefijo de Pages desde PowerShell:

```powershell
$env:VITE_BASE_PATH = '/huasteca-inmersiva/'
npm run verify
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4180 --strictPort
```

Abrir `http://127.0.0.1:4180/huasteca-inmersiva/movilidad/`. La variable pertenece a esa sesión. `npm run verify` usa Chrome/Chromium existente; admite `E2E_BROWSER_PATH` para indicar su ejecutable. No requiere descargar otro navegador en esta laptop.

## Dónde continúa el desarrollo

| Superficie | Archivo |
| --- | --- |
| Experiencia y estados | `src/mobility/MobilityApp.tsx` |
| Mapa y recuperación | `src/mobility/TransitMap.tsx` |
| Pregunta al operador / nota / ficha | `src/mobility/PointTools.tsx`, `travel-tools.ts` |
| Datos y procedencia | `src/mobility/data/line-reference.json` y [DATOS-L1](DATOS-L1.md) |
| Fuente autorizada e IDs validados | `src/mobility/integration-config.ts` |
| Contrato del canal público SCT | `src/mobility/integration/sct.ts` y [documentación](INTEGRACION-SCT.md) |
| Paquete offline atómico | `vite.config.ts`, `public/movilidad/sw.js`, `src/mobility/offline.ts` |
| Biblioteca creativa y QA | `.agents/skills/creative-ideation/`, `.agents/skills/adversarial-ux-test/` |

Primero obtener de SCT el catálogo operativo vigente, horarios, sentidos, titular/proveedor de datos y permiso de integración. Después conciliar IDs operativos con el catálogo usado por la app. No basta con añadir un URL o marcar una fuente como oficial. Los [borradores de solicitud](SOLICITUD-DATOS.md) siguen sin enviarse.

La guía puede expandirse por línea cuando existan datos verificables. La [ideación aplicada](IDEACION-APLICADA.md) cubre preparación, abordaje, viaje, regreso, incidencias y las dependencias futuras; no declara implementadas todas las fases de la red.

## Evidencia de esta entrega

[Investigación de pasajeros](INVESTIGACION-USUARIOS.md), [auditoría adversarial](ADVERSARIAL-UX.md) y [verificación del avance](VERIFICACION.md). La persona de QA es ficticia y permanece separada de las 16 fuentes documentales reales. No se hicieron entrevistas de campo ni se contactó a SCT.

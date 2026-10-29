# Conexión preparada para SCT: contrato y límites

Estado del prototipo, 28-10-2026: **no hay una fuente de posiciones autorizada conectada**. El módulo `src/mobility/integration/sct.ts` no contiene unidades de muestra, recorridos inventados, credenciales ni simulador. Los únicos datos ficticios están dentro de `tests/mobility-integration.test.mjs` y no se importan en la app.

## Activación deliberada, sin secretos en el navegador

La app consume una API pública de lectura ya normalizada por un backend futuro. Un adaptador del operador convertirá su API/GTFS-RT a este contrato; todavía no existe un adaptador probado contra SCT. Las credenciales del operador y las escrituras se mantendrán en ese backend, nunca en una variable `VITE_*`.

`VITE_SCT_FEED_URL`, si se usa, sólo representa la URL pública del backend. Se admiten HTTPS y HTTP en loopback local para desarrollo. El cliente rechaza usuario/contraseña, parámetros de consulta y fragmentos para evitar publicar tokens por error. Las solicitudes omiten cookies/credenciales, no siguen redirecciones y desactivan caché de posiciones.

Además de la URL, el despliegue debe fijar una fuente mediante `source: { id, label, approvalReference, confirmed: true }`, tras documentar el acceso y condiciones acordados. Esto es una declaración de configuración del propietario del despliegue, **no una certificación criptográfica ni un permiso emitido por el programa**. El JSON recibido no puede activar o autodeclarar una fuente oficial: su `agency` debe coincidir con la fuente fijada localmente. Sin fuente confirmada o sin URL, no se realizan solicitudes.

La implementación inicial pasa `source: undefined` y un catálogo de paradas verificadas vacío. No necesita abrir cuentas o pagar servicios para mostrar el estado desconectado y la guía disponible.

La configuración concreta se conserva en `src/mobility/integration-config.ts`: `approvedSctSource` y `verifiedSctStopIds`. El futuro backend normalizador debe conciliar los IDs operativos de SCT con los de la app; el catálogo inicial usa IDs OSM. No basta con declarar esos IDs como verificados: necesitan validación y correspondencia real con línea, parada, sentido y viaje. La variable `VITE_SCT_FEED_URL` contiene sólo una URL pública de lectura.

## Contrato normalizado, versión 1

No se incluye una respuesta ficticia con autobuses para evitar su incorporación accidental al runtime. Los campos admitidos son:

| Campo | Tipo y condición |
| --- | --- |
| `schemaVersion` | Exactamente `1`. Una versión distinta se rechaza. |
| `agency` | ID igual al configurado por el despliegue. |
| `lineId` | Exactamente la línea elegida; en este piloto, `valles-l1`. |
| `generatedAt` | Fecha ISO 8601 UTC, segundos y milisegundos opcionales de tres cifras, terminada en `Z`. |
| `vehiclePositions` | Array obligatorio, máximo 100 posiciones, identificador de unidad único. Puede estar vacío. |
| `vehiclePositions[].id` | ID público seudónimo estable; alfanumérico, punto, guion, dos puntos o guion bajo; máximo 64 caracteres. No nombre del conductor. |
| `vehiclePositions[].lineId` | Igual a la línea del piloto. |
| `vehiclePositions[].longitude/latitude` | Números finitos dentro del área delimitada de Valles. No cadenas. |
| `vehiclePositions[].observedAt` | Hora de la medición, no la hora de recepción ni de reconstrucción del feed. |
| `directionId` | Opcional, `0` o `1`; su significado debe enlazarse con los sentidos oficiales. |
| `tripId` | Opcional, identificador del viaje con el mismo límite de IDs. |
| `bearing` | Opcional, número desde 0 hasta menos de 360 grados. |
| `arrivals` | Opcional, máximo 500 predicciones; pares unidad/parada únicos. |
| `arrivals[].vehicleId/stopId/lineId` | IDs de unidad, parada y línea. |
| `arrivals[].estimatedArrivalAt` | Hora prevista UTC, posterior a la observación y dentro de las próximas seis horas. |
| `arrivals[].observedAt` | Hora de cálculo/observación de la predicción. |

Se rechazan claves ajenas al contrato, fechas inexistentes, tipos incorrectos, IDs duplicados y objetos con campos personales no previstos. Los límites no demuestran calidad de campo: el área municipal es sólo una barrera ante puntos obviamente ajenos, no una comprobación del recorrido autorizado. En esta versión el rectángulo amplio es oeste −99.11, sur 21.87, este −98.91, norte 22.12; deberá ajustarse al alcance acordado.

La respuesta debe tener estado HTTP satisfactorio y tipo de contenido JSON. La lectura se limita a **256 KiB**, incluidos cuerpos sin `Content-Length`; los cuerpos rechazados se cancelan. El límite de espera de la solicitud es diez segundos. Los errores públicos son códigos genéricos, sin cuerpo del servidor, URL con tokens ni trazas.

## Recencia y llegadas

El módulo retira de la salida activa posiciones y predicciones de más de **90 segundos**. Un encabezado reciente no rejuvenece una medición antigua. Rechaza fechas de captura o generación con más de 30 segundos de adelanto respecto al reloj local; ese margen tolera diferencias pequeñas, no confirma que el reloj del dispositivo sea correcto.

Las predicciones sólo salen si la parada existe en `verifiedStopIds`, hay una posición reciente de la unidad vinculada y la predicción sigue vigente. Mientras el catálogo verificado esté vacío, `arrivals` queda vacío aunque un servidor envíe tiempos. Este vínculo con posición es una política conservadora del piloto; GTFS-RT puede representar TripUpdates sin VehiclePositions, modalidad que requeriría una ampliación y validación específica.

Las [buenas prácticas de GTFS Realtime](https://gtfs.org/documentation/realtime/realtime-best-practices/) recomiendan refrescar al menos cada 30 segundos o cuando haya cambios más frecuentes, y que posiciones/TripUpdates no superen 90 segundos. El cliente preparado consulta por defecto cada 30 segundos; la frecuencia final debe acordarse con el proveedor y su cuota. No presupone que SCT ya cumple esos tiempos.

| Estado | Significado para la interfaz |
| --- | --- |
| `disconnected` | Falta URL/fuente confirmada, todavía no se ha iniciado o se detuvo el cliente. No significa que el servicio de autobuses esté suspendido. |
| `loading` | Primera solicitud o recuperación sin datos activos. |
| `available` | Hay posiciones recientes y válidas de la fuente fijada. No certifica toda la flota ni horario oficial. |
| `stale` | No hay posiciones recientes utilizables, incluido un feed vacío. Mostrar “sin ubicaciones recientes”; no inferir ausencia de autobuses. |
| `error` | Configuración, contrato o solicitud fallaron. Se retiran posiciones activas para no mostrar como vivo el último resultado. |

La UI debe mostrar procedencia, hora real de captura y cobertura. Los buses viejos no deben animarse ni extrapolarse como seguimiento. Un ETA es una predicción, nunca una hora garantizada.

## API del módulo

```ts
const client = createSctFeedClient({
  endpoint: import.meta.env.VITE_SCT_FEED_URL,
  lineId: 'valles-l1',
  source: undefined, // Hasta documentar y fijar una fuente real autorizada.
  verifiedStopIds: [], // Sólo IDs del catálogo operativo validado.
})

const unsubscribe = client.subscribe(setFeedState)
client.start() // No crea timers ni solicita datos mientras falte fuente/URL.

// Al desmontar o suspender la pantalla:
unsubscribe()
client.stop() // Cancela solicitud y temporizadores; descarta posición anterior.
```

La importación, creación del cliente, `getState()` y `subscribe()` no generan red. `refresh()` realiza una consulta sólo si la configuración está completa; las consultas simultáneas comparten una petición. `getState()` reevalúa la edad de los datos incluso sin nuevas solicitudes. `start()` inicia consulta, refresco y comprobación de caducidad; `stop()` cancela y evita que una respuesta tardía reactive datos. La UI debe suspender consultas cuando la pantalla esté oculta y reanudarlas al volver.

Los campos principales del estado son `status`, `reason`, `source`, `lineId`, `generatedAt`, `lastReceivedAt`, `vehiclePositions`, `arrivals`, `staleVehicleCount` y `hasVerifiedStops`. Los arrays activos quedan vacíos ante desconexión, error o caducidad. No se utiliza `localStorage` para telemetría o credenciales.

## Verificación incluida y pendiente

Pruebas: ausencia de tráfico sin aprobación, contrato/línea/agencia fijados, coordenadas y fechas inválidas, observaciones antiguas bajo encabezado reciente, mezcla de posiciones frescas/vencidas, ETA sin parada verificada, caducidad sin nuevas solicitudes, fallo tras éxito, cuerpo demasiado grande, protocolo/URL inseguro, consultas simultáneas y cancelación. Ejecución con Node 22 existente:

```powershell
node --experimental-strip-types --test tests/mobility-integration.test.mjs
```

Estas pruebas validan comportamiento del módulo con fixtures exclusivamente de test. **No verifican conexión a SCT, autorización, localización física, precisión de llegadas, seguridad del backend ni disponibilidad de producción.** Esas verificaciones requieren el convenio/fuente, catálogo operativo y piloto de campo.

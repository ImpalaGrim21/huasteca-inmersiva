# Punto de control · MiRedMetro Valles

28-10-2026. Entrada independiente `/movilidad/`. La investigación y el prototipo están implementados y verificados; las fases de datos operativos/seguimiento SCT siguen condicionadas a una fuente autorizada.

Consultar [guía del avance](../docs/metrored/PROTOTIPO.md), [verificación](../docs/metrored/VERIFICACION.md), [ideación aplicada](../docs/metrored/IDEACION-APLICADA.md) y [contrato SCT](../docs/metrored/INTEGRACION-SCT.md).

Fichas del chat: prototipo `671b486f-29ab-4354-bcb3-a53b3c129bcb`; investigación base completada `0624317e-0054-4fdf-bf24-b530883d3a70`. El trabajo de autoría turística pausado `e0da6227-34b4-4da1-8c71-751ae700510f` conserva su punto de control original; no se reanudó esa autoría con este prototipo.

Para reiniciar preview de producción en PowerShell:

```powershell
$env:VITE_BASE_PATH = '/huasteca-inmersiva/'
npm run build
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4180 --strictPort
```

URL local: `http://127.0.0.1:4180/huasteca-inmersiva/movilidad/`. Un servidor de preview no continúa tras apagar la laptop; archivos, commits y ficha de memoria sí quedan guardados.

Pendiente para otra fase: respuesta SCT, catálogos/horarios/sentidos verificados, conciliación de IDs, feed autorizado, prueba en campo y operación continua. No hay cuenta/backend nuevos, solicitudes enviadas ni despliegue público nuevo en esta entrega.

## Edición 2 · viaje completo y publicación

28-10-2026. Nueva portada por destino, arte original en todas las vistas, 209 destinos OSM, fases preparar/subir/viajar/bajar/tramo final/llegar y regreso. Reanudación explícita sin historial GPS y actualización offline segura. npm run verify: 80/80 aprobadas. Evidencia actual en .work/metrored-next/verify-final-2.log y docs/metrored/EDICION-2.md.

Publicación autorizada en https://impalagrim21.github.io/huasteca-inmersiva/movilidad/ . El progreso fuente se guarda en la rama codex/miredmetro-valles. La release conserva turismo público80cc9e0 y excluye autoría3D pausadaf0cc123; su SHA y estado quedan en .work/metrored-next/release-preflight.json y en la ficha de memoria del chat54e2b10f-4cbd-44ef-88a9-6bd8915b8997. No afirmar que está publicado hasta comprobar Actions y la URL.

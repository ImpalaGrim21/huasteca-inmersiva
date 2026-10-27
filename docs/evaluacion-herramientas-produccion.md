# img2threejs y ECC: decisión para Huasteca Inmersiva

Evaluación del 26 de octubre de 2026. **Sí pueden aportar al proceso, con funciones y límites distintos. No hay una medición en este proyecto que demuestre más productividad o calidad sólo por instalarlos.** Se inspeccionaron fuentes, generadores, contratos, instaladores, hooks, licencias y compatibilidad; no se instalaron ni ejecutaron estos repositorios.

| Repositorio | Aportación posible a producción | Aportación posible a calidad | Decisión para esta fase |
| --- | --- | --- | --- |
| [img2threejs](evaluacion-img2threejs.md) | Autoría de objetos 3D concretos mediante especificación y generación de TypeScript para Three.js; componentes reutilizables y repetición. | Referencias documentadas, inventario de rasgos, construcción por etapas y comparación de varias vistas. | Aprovechar el método y validar después un objeto acotado. La integración técnica queda sujeta a un piloto con evidencia real, presupuesto y comparación. |
| [ECC](evaluacion-ecc.md) | Convenciones de revisión y verificación que pueden hacer las entregas más repetibles. | Flujos E2E, QA visual, accesibilidad y revisión dirigida de cambios. | Adaptar una selección al stack y a PowerShell. Conservar las herramientas, permisos y memoria actuales; instalación integral sin justificación en esta fase. |

Three.js sigue siendo el motor visual de la plataforma. Estas herramientas actúan principalmente en autoría y desarrollo; no sustituyen las identidades de lugares, fuentes, geometría urbana, cámara, minimapa ni flujos de los negocios.

## Hallazgos decisivos

**img2threejs sí genera geometría, pero no incluye un modelo que reconstruya automáticamente un establecimiento fiel desde una foto.** El agente escribe y revisa la especificación; el generador emite una factory `THREE.Group`. Una fotografía no documenta el reverso, patios, habitaciones ni medidas. El pipeline público de entornos completos no quedó acreditado: el plugin environment es privado y edificios/habitaciones/ciudades aparecen también como trabajo futuro. La inspección se fijó a [954cd584](https://github.com/img2threejs/img2threejs/tree/954cd5845e90efd045694bab725d68a9863c20e0); el cambio posterior revisado sólo modifica patrocinio y un SVG.

Hay costes que el tamaño del código oculta: hasta cinco mapas 1024² por material y materiales físicos; cinco imágenes RGBA de ese tamaño suman unos 20 MiB de píxeles base antes de otros costes. Algunas rutas admiten cientos de miles de triángulos. Se requiere medir el resultado en nuestra cámara y luces, con colisiones, selección y liberación de texturas adaptadas. Los helpers de presentación de objetos no deben asumir el control de la guía urbana. El informe técnico enlaza cada mecanismo a la fuente.

**ECC aporta un catálogo de prácticas, con diferencias reales entre plataformas.** En el SHA [25278e7d](https://github.com/affaan-m/ECC/tree/25278e7d7b6cf6e6a4e7a6c8e10f14ff22f0eb5b), el manifiesto Codex sólo conecta SessionStart. Los hooks Claude de formato, typecheck y otras guardas no pasan automáticamente a Codex. Algunas herramientas dependen de Bash; la instalación gestionada puede agregar dependencias, MCP, configuración y hooks con efectos sobre archivos o procesos.

La lectura encontró documentación que exige filtro: conteos de skills desactualizados y una receta Vite que atribuye Rolldown por defecto a Vite 7 y propone opciones de otra versión. Tampoco conviene añadir otra continuidad por repositorio: la memoria de este trabajo exige una ficha explícita por chat. La muestra revisada no demuestra paridad completa Windows/Codex ni certifica el artefacto npm. Estos límites se documentan sin presentar reportes históricos ya cerrados como fallos actuales.

El código base declara Apache-2.0 en img2threejs y MIT en ECC. Los servicios Pro, plugins privados, fotos y modelos externos tienen condiciones y permisos separados. Las futuras incorporaciones de código o contenido deben conservar los avisos aplicables. No se incorporó código de estos repositorios a la plataforma.

## Aplicación práctica propuesta

1. **Disciplina visual y de entrega:** consolidar criterios observables por lugar/objeto y una batería breve de regresión para guía compartida, selección y perspectivas, persistencia, editor, navegación, teclado y fallback. Adaptar métodos ECC al proyecto y a sus herramientas existentes. Ya hay una base funcional y evidencia en [QA v3](qa-guide-v3.md); el incremento debe medirse, no duplicar verificaciones por rutina.
2. **Un piloto de contenido real:** elegir un kiosco o entrada documentados con 4–8 fotos autorizadas, dimensiones principales y orientación. Comparar nuestra autoría actual con el flujo img2threejs usando las mismas vistas, incluida cámara peatonal. Conservar OSM y medidas como autoridad espacial. El presupuesto inicial del objeto propone ≤15,000 triángulos, ≤12 draw calls adicionales, ≤6 materiales y ≤1 MiB comprimido incremental; son criterios propuestos, no resultados medidos.
3. **Medir antes de adoptar:** tiempo de autoría y corrección, defectos, claridad y reconocimiento visual, geometría, transferencia, frame time y recursos tras entradas/salidas. Registrar dispositivo y condiciones. Aprobar sólo si el resultado mejora una dimensión sin incumplir las otras.

El objetivo sigue siendo una guía reconocible de pueblos, plazas, alojamientos y servicios de la Huasteca. Para hoteles y hostales, la primera aportación razonable sería una entrada o fachada documentada vinculada a información real del establecimiento. Los interiores y vistas de habitaciones necesitan captura y validación propias.

## Documentos y avance funcional

- [Evaluación completa de img2threejs](evaluacion-img2threejs.md): arquitectura, salida real, calidad, runtime, disco, licencia, compatibilidad y piloto.
- [Evaluación completa de ECC](evaluacion-ecc.md): skills seleccionados, hooks, Codex/Windows, memoria, instalación, costes y discrepancias documentadas.
- [Referencia maestra del estadio y adaptación](referente-maestro-football-stadium.md): análisis y razonamiento ya aplicados en una implementación original.
- [Avance público](https://impalagrim21.github.io/huasteca-inmersiva/): guía espacial de Xilitla, 19 fichas regionales, seis pines locales, POV/caminata, minimapa y guía personal, además del estudio previo. La maqueta identifica alturas, fachadas y mobiliario interpretativos.

Las evaluaciones son inspecciones estáticas con fuentes primarias fijadas. El avance de la plataforma sí fue ejecutado y probado en navegador. No se realizaron generaciones ni benchmarks de los dos repositorios evaluados y no se afirman ahorros de tiempo, tokens o FPS.
## Adopción posterior autorizada

Tras esta evaluación, el usuario pidió instalar y aplicar las herramientas. img2threejs y los seis skills ECC están instalados con versiones fijadas; consultar [flujo reproducible](skills-workflow.md), [inventario ECC](skills-ecc-installed.md) y [QA de aplicación](qa-skills-pilot.md). La evaluación anterior describe lo inspeccionado antes de esa instalación; no convierte el piloto posterior en una medición de productividad comparada.

# Aplicación de skills Nous Research a MiRedMetro Valles

Autorizadas expresamente por el usuario el 28-10-2026. Instrucciones vigentes del usuario y del entorno prevalecen. Fuente fijada: NousResearch/hermes-agent, commit `83bde48a4d9760d84220a9b29094a1ad86410f6e`. MIT, con aviso conservado en LICENSE-NOUS.txt. Los dos SKILL.md y los 27 textos de referencia creativa se conservan íntegros; no se instala Hermes Agent, Python, modelos, herramientas, hooks o servicios.

## Creative ideation

Leer `../creative-ideation/SKILL.md`, anti-slop y el método elegido. Elegir por fase, dominio y problema; no aplicar todos los métodos como ceremonia. El pedido explícito de aprovecharla a escala de la plataforma permite ciclos separados de selección, expansión y arquitectura. Registrar método/autor, restricción, mecanismos concretos, ideas descartadas, riesgos reales, dependencia de datos y decisión construida o aplazada.

En esta app el valor es evitar decisiones equivocadas al viajar por Valles. No medir creatividad por número de pantallas, IA o efectos. No inventar testimonios, encuestas, recorridos, horas, ocupación o acuerdos SCT para satisfacer una idea. Las reglas estilísticas sobre sorpresa o listas no justifican eliminar funciones básicas ni imponer extrañeza en una herramienta de movilidad.

## Adversarial UX

Leer `../adversarial-ux-test/SKILL.md`. Una persona ficticia concreta por sesión, una tarea auténtica, conteo de pasos, captura por queja y revisión de consola. La persona y su monólogo se etiquetan como simulación de evaluación: nunca son opiniones recogidas de pasajeros. Tratar a las personas con respeto; la hostilidad es una técnica de presión, no una descripción de adultos mayores.

Aplicar sobre build de producción servido en preview/staging, no atribuir al método una prueba hecha sólo en Vite dev. Registrar URL/build, viewport, condiciones de red/ubicación, pasos y resultado observado. No sustituir una reproducción por lectura de código. Los incidentes de QA, incluidas coordenadas del pasajero emuladas, son fixtures de prueba fuera del runtime.

Aplicar el filtro obligatorio RED/YELLOW/WHITE/GREEN. Máximo diez tickets locales por sesión, con evidencia, diagnóstico objetivo, propuesta y verificación. No crear issues/comentarios externos, registrar cuentas, mandar reportes, llamar a SCT o instalar programas como efecto de una persona simulada. No fabricar quejas para completar categorías. Lo pendiente de convenio o inspección física sigue pendiente; no se arregla con un badge.

## Revisión y almacenamiento

La investigación real se conserva en docs/metrored/INVESTIGACION-USUARIOS.md. Las decisiones y la auditoría tienen documentos distintos. Los resultados de una persona sintética no se agregan al corpus de evidencia real. Capturas pequeñas JPEG/WebP; sólo evidencia útil, sin vídeos/trazas por defecto. Helpers/tests del proyecto existente, sin duplicar navegadores.

`npm run skills:doctor` valida versiones y hashes de ambas familias. `npm run verify` incluye la comprobación del proyecto y los flujos de movilidad. El pin y los hashes se actualizan únicamente después de revisar el cambio upstream. Los skills no pertenecen al runtime publicado.

# Flujo reproducible de skills y verificación

Los skills de autoría ayudan a desarrollar la plataforma; no forman parte de los archivos públicos de `dist/`. La configuración fija versiones y comprueba integridad, sin instalar un catálogo completo, dependencias adicionales ni modelos pesados.

- [tools/skills-lock.json](../tools/skills-lock.json) fija repositorios, commits, archivos, hashes y tamaños.
- [skills-doctor.mjs](../scripts/skills-doctor.mjs) verifica sin descargas.
- [install-skills.ps1](../scripts/install-skills.ps1) valida ECC y, sólo si falta, instala img2threejs con el instalador oficial fijado.
- [Inventario ECC](skills-ecc-installed.md) y [adaptación Huasteca](../.agents/skills/ecc-common/HUASTECA.md) documentan los seis skills y cómo aplicarlos.

## Uso local

Requiere Node compatible con el proyecto y, para instalar la herramienta de autoría, Git, PowerShell y el perfil estándar de Codex existente en el usuario. Se recomienda PowerShell 7 (`pwsh`), usado por el alias npm. No solicita elevación ni modifica la política de ejecución.

```powershell
npm run skills:doctor
npm run skills:install
npm run test:e2e
npm run verify
```

Los alias están declarados en el package.json del proyecto. `verify` encadena doctor del proyecto, build TypeScript/Vite y regresiones E2E. No es una medición de calidad visual, fidelidad espacial ni rendimiento de usuarios reales; esas comprobaciones conservan su evidencia propia.

También pueden ejecutarse directamente:

```powershell
node scripts/skills-doctor.mjs --json
pwsh -NoProfile -File scripts/install-skills.ps1
```

No hace falta instalar de nuevo cuando el doctor local pasa. El instalador toma esa salida como ruta rápida: no descarga, no crea copias y no escribe archivos en ese caso.

## CI y equipos sin herramientas de autoría

```powershell
node scripts/skills-doctor.mjs --project-only
npm run skills:doctor -- --project-only --json
pwsh -NoProfile -File scripts/install-skills.ps1 -ProjectOnly
```

`--project-only` devuelve `project-pass` cuando ECC es correcto y marca img2threejs como **skipped/OMITIDO**. No afirma haber validado ni instalado la herramienta global. CI debe usar esta variante; no necesita clonar img2threejs para compilar o probar Huasteca.

El modo completo devuelve `pass` únicamente cuando pasan proyecto y autoría. Un fallo devuelve código 1; una opción CLI desconocida, código 2. La salida JSON incluye conteos/tamaños compactos, estado del enlace y razones de fallo, sin listar transcripts ni credenciales. Un origin inesperado se muestra redactado.

## Qué se verifica

**ECC:** seis SKILL.md, notas de integración, licencia, avisos y procedencia: diez archivos. Se comprueban nombres/frontmatter, hashes, tamaños canónicos, enlaces locales y ausencia de archivos adicionales dentro de las carpetas `ecc-*`. Las referencias relacionadas remotas permanecen fijadas al SHA y consultivas; el doctor no navega para descargarlas ni verifica su disponibilidad online en cada ejecución.

Los archivos vienen incluidos en el repositorio. El instalador no descarga ECC ni repara silenciosamente archivos modificados. Si falla la integridad, revisar el diff y la procedencia antes de restaurar o actualizar el pin.

**img2threejs:** el enlace estándar de Codex debe resolver al checkout administrado del commit exacto, con origin oficial, árbol Git limpio y SKILL íntegro. El doctor mide archivos, incluidos `.git` y posibles cachés locales, sin seguir enlaces anidados. El escaneo de tamaño tiene un límite de 10.000 archivos y avisa si la medida es parcial.

Instalación actual:

- Codex: `%USERPROFILE%\.codex\skills\img2threejs`.
- Copia única: `%USERPROFILE%\.img2threejs\releases\954cd5845e90efd045694bab725d68a9863c20e0\img2threejs`.
- El doctor resuelve el usuario en ejecución; no fija el nombre de este ordenador. Esta integración sigue las rutas estándar del instalador oficial, no cambia `CODEX_HOME` ni configura otros hosts.
- ECC instalado ocupa 79.080 bytes en el árbol inicial. img2threejs se midió inicialmente en 7.677.009 bytes incluyendo Git; puede crecer por cachés de autoría. El tamaño observado se informa en cada ejecución y hay aviso sobre 16 MiB. No es el espacio físico asignado del volumen.

## Integridad entre Windows y Linux

El lock conserva hashes/tamaños observados y hashes/tamaños de texto canónico. Para comprobar los textos sólo normaliza **CRLF a LF**; cualquier otro cambio sigue produciendo un fallo. Esto permite clonar con autocrlf en Windows y verificar en Linux sin convertir los archivos del usuario.

El SKILL de img2threejs observado en Windows tiene SHA-256 `35d363c919bc25a90973dd633192fa9d7f5dc41db9d99031bf190043c9b7eac9`. Su texto LF coincide con el objeto Git del commit y tiene hash `d9fa095b398d806ec539022f601b77735446ede61ad7b07abe857e5cfb7e97a2`. Ambos se registran; el doctor indica el modo de comparación.

El **instalador ejecutable se verifica byte por byte**, sin normalización:

- [Fuente oficial fijada](https://raw.githubusercontent.com/img2threejs/img2threejs/954cd5845e90efd045694bab725d68a9863c20e0/bin/img2threejs.mjs).
- SHA-256: `725c796d457272c1610fd502a4523af89bb298a5380a604d36a7b7f6d747386f`.
- Tamaño: 11.765 bytes.
- Caché única: `.work/skill-adoption/img2threejs-installer.mjs`, fuera del repositorio desplegado.

## Instalación y fallback de Windows

Si falta el enlace y no hay rutas ocupadas o un checkout alterado, el script obtiene/verifica el binario anterior y ejecuta exactamente `install --host codex --ref 954cd5845e90efd045694bab725d68a9863c20e0`. El instalador oficial hace una descarga Git superficial del commit. No se usan npm global, `npx latest`, privilegios ni plugins adicionales.

Si el binario oficial falla **con EPERM al crear symlink en Windows**, el wrapper vuelve a comprobar el checkout y el destino. Sólo crea una junction si coinciden commit, origin, árbol limpio y SKILL, y el destino del enlace sigue vacío. La junction apunta a la misma copia administrada. No usa `-Force`, no borra una instalación ajena y no sustituye un directorio ocupado.

Un fallo de red, checksum, Git, otro error del instalador o un destino cambiado no activa ese fallback. Un binario en caché con hash incorrecto se rechaza sin sobrescribirlo. La comprobación final debe pasar para declarar éxito.

## Actualizar o resolver un fallo

El lock es una decisión revisada, no un actualizador automático. Para cambiar una versión hay que revisar el nuevo commit, licencia y diferencias; actualizar de forma explícita los archivos/procedencia y sus hashes. No usar `main`, tags móviles o `@latest` para eludir un fallo. Los tamaños y hashes previos deben conservarse como evidencia cuando expliquen una actualización.

Si el doctor marca una ruta ocupada/no administrada, no renombrarla ni eliminarla automáticamente: inspeccionarla dentro del alcance de la tarea. La política vigente del usuario decide los cambios, no un ejemplo upstream.

## Validación realizada

Se ejecutó el doctor real en modos completo y proyecto. El modo completo reconoció los seis skills ECC y la junction administrada de img2threejs; commit, origin, limpieza y SKILL pasaron. El instalador real tomó la ruta idempotente sin descargas; `-ProjectOnly` omitió autoría expresamente. Sintaxis Node y PowerShell comprobadas.

Cinco comprobaciones aisladas bajo `.work/`, eliminadas al terminar, demostraron: omisión explícita en CI; aceptación de un clon CRLF; rechazo de alteración de contenido; rechazo de una ruta que intenta salir del proyecto; y conservación de un directorio ajeno simulado. No se tocaron las instalaciones reales durante esas pruebas.

La rama de primera descarga/junction del wrapper no se volvió a ejecutar sobre la instalación real para evitar otra descarga y cambios innecesarios. Su código se revisó junto con el instalador oficial completo; la instalación existente y el episodio EPERM que originó la junction están documentados en la tarea principal. Estas comprobaciones no sustituyen las regresiones del producto.
# MiRedMetro: ideación y evaluación adversarial

Integración solicitada el 28-10-2026: `creative-ideation` 2.1.0 y `adversarial-ux-test` 1.0.0 de NousResearch/hermes-agent, commit `83bde48a4d9760d84220a9b29094a1ad86410f6e`. Se incluyen ambas instrucciones, la biblioteca de 27 referencias creativas y MIT; aproximadamente 149 KB contando adaptación local. Sin Hermes Agent, modelos, hooks o servicios. El bloqueo independiente está en [hermes-skills-lock.json](../tools/hermes-skills-lock.json).

Leer primero [adaptación MiRedMetro](../.agents/skills/hermes-common/MIREDMETRO.md). `npm run skills:doctor` comprueba la instalación y `npm run verify` la incluye en CI. No se necesita descargar de nuevo el repositorio: las instrucciones están versionadas dentro del proyecto.

La aplicación creativa se documenta en [IDEACION-APLICADA.md](metrored/IDEACION-APLICADA.md): selección con inversión, expansión con SCAMPER y arquitectura con patrones, en ciclos separados. La auditoría de una persona ficticia conserva pasos, capturas y filtro pragmático; no constituye investigación de pasajeros reales. Las evidencias de necesidades reales permanecen separadas en [INVESTIGACION-USUARIOS.md](metrored/INVESTIGACION-USUARIOS.md).

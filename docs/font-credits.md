# Tipografías autoalojadas

Verificación y descarga: 26 de octubre de 2026.

La interfaz conserva las familias DM Sans y Manrope. Ambas se sirven desde el propio proyecto como archivos WOFF2 variables, estilo normal, pesos 400 a 800 (incluye pesos intermedios 450, 550, 650 y 750). Se conserva el subconjunto Latin de Google Fonts, que cubre los caracteres españoles precompuestos: á, é, í, ó, ú, ü, ñ, Á, É, Í, Ó, Ú, Ü, Ñ, ¿ y ¡.

No se requiere una conexión con Google Fonts durante la ejecución. src/fonts.css declara font-display: swap y src/main.tsx lo importa antes del estilo global. Los archivos originales descargados se conservan sin modificar.

| Archivo | Familia / versión CDN | Tamaño | Licencia |
| --- | --- | ---: | --- |
| public/fonts/dm-sans-latin-variable.woff2 | DM Sans / v17 | 36,932 bytes | SIL OFL 1.1; texto íntegro en public/fonts/OFL-DM-Sans.txt |
| public/fonts/manrope-latin-variable.woff2 | Manrope / v20 | 24,836 bytes | SIL OFL 1.1; texto íntegro en public/fonts/OFL-Manrope.txt |

Total WOFF2: 61,768 bytes (60.3 KiB).

## Procedencia

- [CSS API oficial de Google Fonts](https://fonts.googleapis.com/css2?family=DM+Sans:wght@400..800&family=Manrope:wght@400..800&display=swap), consultada con un User-Agent moderno de Chrome. Se seleccionó únicamente el bloque marcado latin de cada familia.
- [DM Sans, archivo WOFF2 original](https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2).
- [Manrope, archivo WOFF2 original](https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSg.woff2).
- [Licencia y titulares de DM Sans en el repositorio oficial Google Fonts](https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt).
- [Licencia y titulares de Manrope en el repositorio oficial Google Fonts](https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt).
- [Página de DM Sans](https://fonts.google.com/specimen/DM+Sans).
- [Página de Manrope](https://fonts.google.com/specimen/Manrope).

Las licencias de las tipografías son independientes de la licencia del código del prototipo. Los avisos de copyright y el texto OFL completos se distribuyen junto a los archivos.

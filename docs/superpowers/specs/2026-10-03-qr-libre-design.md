# qr-libre — diseño

Fecha: 2026-10-03
Estado: aprobado en conversación, pendiente de revisión escrita

## Propósito

Generador de códigos QR **estáticos** como ejecutable portable para Windows. Nace para que una artista (carriecatt.carrd.co) tenga un QR que no caduque: los servicios gratuitos generan QR *dinámicos* que redirigen por su servidor y dejan de funcionar al acabar la prueba. Un QR estático codifica la URL directamente y no depende de nadie.

Se publica como proyecto de código abierto (MIT) en `github.com/starworn/qr-libre` para cualquiera que no quiera depender de servicios que cobran por un estándar abierto.

## Criterios de éxito

- Flujo completo sin conocimientos técnicos: descargar `.exe` desde Releases → doble clic → pegar URL → ajustar estética → exportar PNG/SVG.
- Todo PNG exportado con ajustes "en verde" se lee con un celular.
- Lo que se ve en la vista previa es exactamente lo que se exporta.

## Alcance

### Dentro

- **Contenido:** campo de URL/texto; nivel de corrección de errores L/M/Q/H (por defecto Q).
- **Forma:**
  - Redondeo de módulos 0–100 %. Solo se redondean las esquinas *exteriores* de cada grupo (una esquina se redondea si sus dos vecinos ortogonales en esa esquina están vacíos), de modo que módulos adyacentes se funden.
  - Redondeo independiente de los tres "ojos" (patrones de posición), 0–100 %.
- **Color:**
  - Módulos: sólido, degradado lineal de 2 colores (con ángulo) o radial de 2 colores.
  - Color opcional independiente para los ojos.
  - Fondo: color sólido o transparente.
  - Medidor de contraste visible.
- **Fondo:** margen (zona tranquila) 0–8 módulos, por defecto 4, aviso si < 2; redondeo de las esquinas del fondo.
- **Destino (selector con descripción):**
  - *Pantalla / redes (sRGB)* — por defecto.
  - *Impresión* — además escribe 300 DPI en el PNG, muestra tamaño físico (p. ej. "2048 px = 17.3 cm a 300 DPI") y avisa de colores muy saturados que pueden apagarse en papel.
- **Exportar:** tamaño 512 / 1024 / 2048 / 4096 px; **Guardar PNG** (principal) y **Guardar SVG** (secundario).
  - PNG: siempre con chunk `sRGB` (y `gAMA`/`cHRM` equivalentes para lectores que ignoren `sRGB`); `pHYs` a 300 DPI en modo impresión.
  - SVG: colores en sRGB (lo que define el estándar SVG); dimensiones físicas en modo impresión.
- **Verificación automática de lectura:** en cada cambio se rasteriza, se decodifica con `jsQR` y se compara con el texto. Estado bajo la vista previa: `✓ Se lee correctamente` / `⚠ No se pudo leer — reduce el redondeo o sube el contraste`. Con fondo transparente se verifica compuesto sobre blanco y se muestra la nota "pégalo sobre fondos claros".
- **Reglas de legibilidad:** avisan, no bloquean. Avisos: contraste bajo, módulos más claros que el fondo (QR invertido), margen < 2, fondo transparente. Exportar con estado `⚠` pide confirmación.
- Recordar los últimos ajustes entre sesiones (`localStorage`).
- Interfaz en español por defecto, conmutador a inglés.

### Fuera (deliberadamente)

- Logo central, patrones por bloque, plantillas, historial.
- Exportación CMYK real (requiere el perfil ICC específico de cada imprenta; uno genérico causa más problemas de los que resuelve — se explica en el README).
- Demo web hospedada.
- Firma de código del `.exe`.
- Soporte para Windows 7/8 o anteriores (Tauri/WebView2 exige Windows 10+).

## Arquitectura

Tauri 2 + Vite + TypeScript sin framework. Una sola ventana.

### Módulos del frontend (`src/`)

Cada uno con una responsabilidad y probable de forma aislada:

| Módulo | Entrada → salida |
|---|---|
| `encode.ts` | texto + nivel ECC → matriz booleana + posiciones de los ojos (usa `qrcode-generator`) |
| `render.ts` | matriz + `Style` → string SVG. **Única fuente de verdad**: vista previa, SVG y PNG salen de aquí |
| `raster.ts` | SVG + tamaño → PNG (canvas) y luego inyección de chunks `sRGB`/`gAMA`/`cHRM`/`pHYs` |
| `png-chunks.ts` | manipulación binaria de chunks PNG (insertar, CRC) |
| `verify.ts` | píxeles RGBA + texto esperado → `{ ok, decoded }` (usa `jsQR`; compone sobre blanco si hay transparencia) |
| `contrast.ts` | colores → ratio de contraste WCAG, detección de inversión, heurística de saturación para impresión |
| `settings.ts` | tipo `Style`, valores por defecto, persistencia en `localStorage` |
| `i18n.ts` | textos ES/EN |
| `ui.ts` / `main.ts` | construcción del DOM, enlace controles → estado → render → verificación |

### Rust (`src-tauri/`)

Mínimo: plugins oficiales `tauri-plugin-dialog` (diálogo Guardar como) y `tauri-plugin-fs` (escribir bytes). Sin comandos propios salvo que surja necesidad.

### Flujo de datos

```
controles → Style ─┐
texto ────────────→ encode → matriz → render → SVG ─→ vista previa
                                              ├→ raster → PNG ─→ verify → indicador
                                              └→ (al exportar) diálogo → fs.writeFile
```

La verificación usa un raster pequeño (p. ej. 512 px) con *debounce* para no frenar la interfaz; la exportación usa el tamaño elegido.

## Distribución

- **GitHub Actions:**
  - `ci.yml` — en cada push/PR: `npm ci`, typecheck, `vitest`.
  - `release.yml` — al crear tag `v*`: build en `windows-latest`, sube el `.exe` portable (binario de `target/release`, sin instalador) a un GitHub Release.
- **README (ES + EN):** qué es y por qué estático, descarga, aviso de SmartScreen con captura (*Más información → Ejecutar de todos modos*), requisitos (Windows 10/11), nota de color/impresión, cómo compilar.
- Licencia MIT. Repo: `starworn/qr-libre`. El push espera al script para cambiar de cuenta de GitHub (tarea aparte).

## Pruebas

1. **Unitarias (Vitest):** contraste, detección de inversión, heurística de saturación, chunks PNG (CRC correcto, orden de chunks, valor de DPI), lógica de esquinas exteriores del redondeo.
2. **Ida y vuelta automatizada:** matriz de configuraciones (redondeo 0/50/100, ojos redondeados, sólido/lineal/radial, color de ojos, fondo transparente, márgenes 0/2/4/8, ECC L/M/Q/H, URLs corta y larga) → `render` → rasterizar en Node (`@resvg/resvg-js`) → `jsQR` → mismo texto. Los resultados fijan los límites seguros de los controles con datos y no a ojo.
3. **Galería de exports (`npm run gallery`):** genera un conjunto variado de PNG/SVG a `gallery/` con un `index.html` de hoja de contactos (miniatura + config + resultado de verificación). Sirve para la **revisión visual manual** conjunta y para escanear con el celular.
4. **Prueba final manual:** ejecutar el `.exe` en Windows y escanear el QR de carriecatt.carrd.co con un celular.

## Riesgos

- **SmartScreen** asusta a usuarios no técnicos → README con captura y explicación clara.
- **Diferencias de rasterización** entre resvg (pruebas) y el canvas de WebView2 (app) → la verificación en la app usa el canvas real, así que el indicador de la app manda.
- **Desarrollo en Linux:** webkit2gtk necesita `WEBKIT_DISABLE_DMABUF_RENDERER=1` en esta máquina (NVIDIA + Hyprland).

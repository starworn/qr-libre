# QR Libre

Códigos QR que no caducan. Gratis, sin cuentas y sin servidores.

<!-- captura de la app: docs/screenshot.png -->

[English below](#english)

## ¿Por qué no caduca?

Un código QR es un estándar abierto: los cuadritos guardan **tu enlace mismo**, y cualquier cámara lo lee sin preguntarle a nadie. Muchos generadores "gratuitos" hacen otra cosa: crean un QR *dinámico* que apunta a un enlace de **su** servidor, y ese servidor te redirige a tu página. Cuando se acaba la prueba gratis o el servicio cierra, cortan la redirección y tu QR deja de funcionar, aunque ya lo hayas impreso.

QR Libre solo genera QR estáticos. El código funciona mientras exista tu página, y no depende de esta app ni de nadie más.

## Descargar

1. Ve a [la última versión](https://github.com/starworn/qr-libre/releases/latest) y descarga `qr-libre-vX.Y.Z-windows-x64.exe`.
2. Dale doble clic. No hay que instalar nada.

Requiere **Windows 10 u 11**. No funciona en Windows 7 u 8.

### "Windows protegió su PC"

La primera vez, Windows puede mostrar ese aviso azul. Sale porque el programa no tiene firma digital: firmarlo cuesta dinero cada año, y esto es un proyecto gratuito. Para abrirlo:

1. Haz clic en **Más información**.
2. Haz clic en **Ejecutar de todos modos**.

<!-- captura de SmartScreen: añadir tras la primera prueba en Windows -->

Si prefieres no confiar en un ejecutable, puedes revisar el código y compilarlo tú (ver abajo).

## Uso

1. Pega tu enlace.
2. Ajusta la forma, los colores y el fondo. La vista previa cambia en vivo.
3. Fíjate en el indicador bajo el QR: **✓ Se lee correctamente** quiere decir que la app lo leyó con éxito. Si dice **⚠**, baja el redondeo o sube el contraste.
4. Haz clic en **Guardar PNG** o **Guardar SVG**.

Consejos:
- Los cuadritos deben ser **más oscuros** que el fondo. Al revés (claro sobre oscuro) muchos celulares no lo leen.
- Deja margen alrededor del QR (4 es el estándar). Con menos de 2 puede fallar si lo pegas sobre una imagen.
- El **fondo transparente** sirve para pegarlo sobre fondos claros.
- El **SVG** es vectorial: se puede imprimir a cualquier tamaño sin pixelarse. Úsalo para tarjetas, stickers o lonas.

## Color e impresión

- Los PNG llevan incrustado el perfil de color **sRGB**, así que se ven igual en cualquier navegador, celular o editor.
- Con el destino **Impresión**, el PNG además guarda una resolución de **300 DPI** y la app te muestra el tamaño físico (por ejemplo, 2048 px = 17.3 cm). El SVG se guarda en milímetros.
- Los colores muy saturados (neón) se ven más apagados en papel; la app te avisa.
- **¿Por qué no hay exportación CMYK?** Convertir a CMYK bien requiere el perfil ICC de *cada* imprenta. Uno genérico suele dar peores resultados que dejar que la imprenta convierta. Mándales el PNG o el SVG en sRGB: es lo que esperan.

## Compilar desde el código

Necesitas [Node.js](https://nodejs.org) (LTS) y [Rust](https://rustup.rs), más los [requisitos de Tauri](https://tauri.app/start/prerequisites/) de tu sistema.

```bash
npm ci
npm test               # pruebas, incluida la de ida y vuelta (generar → leer)
npm run tauri dev      # abrir la app en modo desarrollo
npm run gallery        # galería de ejemplos en gallery/index.html
npx tauri build --no-bundle   # ejecutable en src-tauri/target/release/
```

En Linux con NVIDIA + Wayland, usa `./launch.sh`, que aplica `WEBKIT_DISABLE_DMABUF_RENDERER=1` para evitar un fallo de WebKitGTK.

Para publicar una versión basta con subir un tag `v*` (por ejemplo `v0.2.0`): GitHub Actions compila el `.exe` en Windows y lo adjunta al release.

---

## English

**QR codes that never expire. Free, no accounts, no servers.**

**Why it doesn't expire:** a QR code is an open standard: the pattern stores *your link itself*. Many "free" generators instead make *dynamic* codes that point to their server and redirect to you; when the trial ends, they cut the redirect and your printed code dies. QR Libre only makes static codes that work as long as your page exists.

**Download:** grab `qr-libre-vX.Y.Z-windows-x64.exe` from the [latest release](https://github.com/starworn/qr-libre/releases/latest) and double-click it. No install. Requires Windows 10 or 11. If Windows shows "Windows protected your PC" (the exe is unsigned because signing costs money every year), click **More info → Run anyway**.

**Use:** paste your link, adjust shape/colours/background, check that the indicator says **✓ Scans correctly**, then **Save PNG** or **Save SVG**. Keep modules darker than the background and leave a margin of at least 2 (4 is standard). Transparent backgrounds are for light surfaces. SVG is vector, so it prints at any size.

**Colour & print:** PNGs embed the sRGB profile. The *Print* destination also stores 300 DPI and shows the physical size; SVG is saved in millimetres. There's no CMYK export: doing it properly needs each print shop's ICC profile, so send them the sRGB file and let them convert.

**Build:** `npm ci`, `npm test`, `npm run tauri dev` (Linux NVIDIA+Wayland: `./launch.sh`), `npm run gallery`, `npx tauri build --no-bundle`. Pushing a `v*` tag builds and publishes the Windows exe via GitHub Actions.

## Licencia / License

[MIT](LICENSE)

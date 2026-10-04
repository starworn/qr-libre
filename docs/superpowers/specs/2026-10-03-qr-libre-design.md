# qr-libre — design

Date: 2026-10-03
Status: approved

## Purpose

A portable Windows executable that generates **static** QR codes. Free online generators usually produce *dynamic* QR codes that redirect through their own server and stop working once a trial ends. A static code encodes the URL directly and depends on nobody.

Published as open source (MIT) at `github.com/starworn/qr-libre` for anyone who doesn't want to pay a service for an open standard.

## Success criteria

- A non-technical user can complete the whole flow: download the `.exe` from Releases → double-click → paste a URL → adjust the look → export PNG/SVG.
- Every PNG exported with settings "in the green" scans with a phone.
- The preview is exactly what gets exported.

## Scope

### In

- **Content:** URL/text field; error-correction level L/M/Q/H (default Q).
- **Shape:**
  - Module rounding 0–100 %. Only the *outer* corners of each group are rounded (a corner is rounded when both orthogonal neighbours touching it are light), so adjacent modules merge into smooth shapes.
  - Independent rounding for the three finder patterns ("eyes"), 0–100 %.
- **Colour:**
  - Modules: solid, 2-colour linear gradient (with angle) or 2-colour radial gradient.
  - Optional separate colour for the eyes.
  - Background: solid colour or transparent.
  - Visible contrast meter.
- **Background:** quiet-zone margin 0–8 modules, default 4, warning below 2; rounded background corners.
- **Destination (select with description):**
  - *Screen / social (sRGB)* — default.
  - *Print* — additionally stores 300 DPI in the PNG, shows the physical size (e.g. "2048 px = 17.3 cm at 300 DPI") and warns about very saturated colours that dull on paper.
- **Export:** 512 / 1024 / 2048 / 4096 px; **Save PNG** (primary) and **Save SVG** (secondary).
  - PNG: always an `sRGB` chunk (plus equivalent `gAMA`/`cHRM` for readers that ignore `sRGB`); `pHYs` at 300 DPI in print mode.
  - SVG: sRGB colours (what the SVG standard defines); physical dimensions in print mode.
- **Automatic scan check:** on every change the code is rasterised, decoded with `jsQR` and compared with the text. Status under the preview: `✓ Scans correctly` / `⚠ Could not be read — reduce rounding or raise contrast`. Transparent backgrounds are checked composited on white, with the note "place it on light surfaces".
- **Legibility rules:** warn, never block. Warnings: low contrast, modules lighter than the background (inverted), margin < 2, transparent background. Exporting while the status is `⚠` asks for confirmation.
- Remember the last settings between sessions (`localStorage`); a Reset button (with confirmation) restores the default style.
- UI in Spanish and English, chosen from the system locale on first run, switchable at any time.

### Out (deliberately)

- Centre logo, per-module patterns, templates, history.
- Real CMYK export (needs each print shop's own ICC profile; a generic one causes more problems than it solves — explained in the README).
- Hosted web demo.
- Code signing of the `.exe`.
- Windows 7/8 or older (Tauri/WebView2 requires Windows 10+).

## Architecture

Tauri 2 + Vite + TypeScript, no UI framework. A single window.

### Frontend modules (`src/`)

Each has one responsibility and can be tested in isolation:

| Module | Input → output |
|---|---|
| `encode.ts` | text + ECC level → boolean matrix + eye positions (uses `qrcode-generator`) |
| `render.ts` | matrix + `Style` → SVG string. **Single source of truth**: preview, SVG and PNG all come from here |
| `raster.ts` | SVG + size → PNG (canvas) |
| `png-chunks.ts` | binary PNG chunk handling (insert, CRC); `sRGB`/`gAMA`/`cHRM`/`pHYs` |
| `verify.ts` | RGBA pixels + expected text → `{ ok, decoded }` (uses `jsQR`; composites on white when transparent) |
| `contrast.ts` | colours → WCAG contrast ratio, inversion detection, print saturation heuristic |
| `settings.ts` | `Style` type, defaults, persistence in `localStorage` |
| `i18n.ts` | ES/EN strings |
| `main.ts` | DOM wiring: controls → state → render → verification |

### Rust (`src-tauri/`)

Minimal: the official `tauri-plugin-dialog` (Save as dialog) and `tauri-plugin-fs` (write bytes) plugins. No custom commands.

### Data flow

```
controls → Style ─┐
text ─────────────→ encode → matrix → render → SVG ─→ preview
                                              ├→ raster → PNG ─→ verify → status
                                              └→ (on export) dialog → fs.writeFile
```

Verification uses a debounced raster sized to the code's density (≥ 512 px, ~5 px per module, capped at the export size) so the UI stays responsive; export uses the chosen size.

## Distribution

- **GitHub Actions:**
  - `ci.yml` — on every push/PR: `npm ci`, typecheck, `vitest`.
  - `release.yml` — on a `v*` tag: build on `windows-latest`, upload the portable `.exe` (the `target/release` binary, no installer) to a GitHub Release.
- **README (EN + ES):** what it is and why static, download, SmartScreen notice (*More info → Run anyway*), requirements (Windows 10/11), colour/print notes, how to build.
- MIT licence.

## Testing

1. **Unit (Vitest):** contrast, inversion detection, saturation heuristic, PNG chunks (CRC, chunk order, DPI value), outer-corner rounding logic, settings sanitising, export flow with injected dependencies.
2. **Automated round-trip:** a matrix of configurations (rounding 0/50/100, rounded eyes, solid/linear/radial, eye colour, transparent background, margins 2/4/8, ECC L/M/Q/H, short and long URLs, non-ASCII) → `render` → rasterise in Node (`@resvg/resvg-js`) → `jsQR` → same text. The results set the safe control limits from data rather than by eye.
3. **Export gallery (`npm run gallery`):** writes a varied set of PNG/SVG files to `gallery/` with an `index.html` contact sheet (thumbnail + config + verification result) for manual visual review and phone scanning.
4. **Final manual test:** run the `.exe` on Windows and scan an exported code with a phone.

## Risks

- **SmartScreen** scares non-technical users → README explains it clearly.
- **Rasterisation differences** between resvg (tests) and the WebView2 canvas (app) → the in-app check uses the real canvas, so the app's indicator is authoritative.
- **Linux development:** on NVIDIA + Wayland, webkit2gtk needs `WEBKIT_DISABLE_DMABUF_RENDERER=1` (`launch.sh`).

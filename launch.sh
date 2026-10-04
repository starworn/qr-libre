#!/usr/bin/env bash
# Linux dev launcher: webkit2gtk crashes on NVIDIA+Wayland without this.
cd "$(dirname "$0")"
WEBKIT_DISABLE_DMABUF_RENDERER=1 exec npm run tauri dev

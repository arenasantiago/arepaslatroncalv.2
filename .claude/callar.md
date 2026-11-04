---
description: Callar lo que Lucy está leyendo y pasar al siguiente audio de la cola
---

Ejecuta `powershell -NoProfile -ExecutionPolicy Bypass -File "$CLAUDE_PROJECT_DIR/.claude/scripts/voz.ps1" -Skip`: corta el audio que suena, lo descarta y el lector sigue con el siguiente de la cola (si no hay más, queda en silencio). No apaga la voz.

Responde **solo** con `⏭️`, sin texto: así la respuesta no entra a la cola de voz.

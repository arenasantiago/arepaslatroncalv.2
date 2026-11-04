---
description: Prender o apagar la capa de voz (Lucy lee cada respuesta completa, en cola, como claude.ai)
---

Interruptor de la capa de voz (hook `Stop` → `.claude/scripts/voz.ps1`). El archivo `.claude/voz.off` la silencia.

Argumento: `$ARGUMENTS` (`on`, `off` o vacío).

Las respuestas se leen en cola, una detrás de otra. Para saltar solo el audio actual está `/callar`.

1. `off` → crea `.claude/voz.off` (vacío) y ejecuta `voz.ps1 -Stop` (corta y vacía la cola). `on` → bórralo si existe. Vacío → invierte el estado actual.
2. Responde en una sola línea con el estado final: "🔊 Voz prendida" o "🔇 Voz apagada". Si quedó prendida, termina con `<!-- voz: Voz prendida. -->`.

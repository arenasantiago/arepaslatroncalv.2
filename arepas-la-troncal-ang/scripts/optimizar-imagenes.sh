#!/usr/bin/env bash
# Optimiza a WebP las imágenes usadas por la app. Redimensiona según el rol y
# conserva transparencia (libwebp respeta el alfa de origen). No borra los
# originales: genera <nombre>.webp junto a ellos.
set -u
cd "$(dirname "$0")/../src/assets/img" || exit 1

# formato: archivo_origen : ancho_max : calidad
JOBS="
logo-arepa.png:600:85
logo.png:800:85
fondocarbon3.png:1600:78
oficina.png:1000:80
lejos.png:1000:80
bandejas.png:1000:80
asadoarepas.png:1000:80
contodo.png:800:82
arepitaredondav2.png:800:82
arepascontodorehecha.png:800:82
arepapaquete.jpg:800:82
abuela.jpg:800:82
"

total_orig=0; total_new=0
printf "%-28s %10s %10s %8s\n" "IMAGEN" "ORIGINAL" "WEBP" "AHORRO"
printf -- "-------------------------------------------------------------\n"
for job in $JOBS; do
  [ -z "$job" ] && continue
  src="${job%%:*}"; rest="${job#*:}"; w="${rest%%:*}"; q="${rest##*:}"
  [ -f "$src" ] || { echo "FALTA: $src"; continue; }
  out="${src%.*}.webp"
  ffmpeg -hide_banner -loglevel error -y -i "$src" \
    -vf "scale='min($w,iw)':-1" -c:v libwebp -quality "$q" "$out" 2>/dev/null
  os=$(stat -c%s "$src"); ns=$(stat -c%s "$out")
  total_orig=$((total_orig+os)); total_new=$((total_new+ns))
  pct=$(( 100 - (ns*100/os) ))
  printf "%-28s %9dK %9dK %6d%%\n" "$src" $((os/1024)) $((ns/1024)) "$pct"
done
printf -- "-------------------------------------------------------------\n"
printf "%-28s %9dK %9dK %6d%%\n" "TOTAL" $((total_orig/1024)) $((total_new/1024)) $(( 100 - (total_new*100/total_orig) ))

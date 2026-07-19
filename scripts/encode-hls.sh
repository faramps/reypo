#!/usr/bin/env bash
#
# encode-hls.sh — Showreel mp4/mov masterlarını R2'ye yüklenmeye hazır bir HLS
# ağacına çevirir. HLS bir sunucu istemez: çıktılar statik dosyalardır (.m3u8
# playlist + .ts segment) ve doğrudan R2 bucket'a kopyalanır.
#
# Her master için üretilenler (aspect-agnostic — yatay 16:9 ve dikey 9:16 aynı):
#   <OUT>/hls/<ad>/master.m3u8         ADAPTIF master playlist (hls.js bunu okur)
#   <OUT>/hls/<ad>/v0|v1|v2/index.m3u8 1080p / 720p / 480p rendition'ları
#   <OUT>/hls/<ad>/v0|v1|v2/seg_*.ts   4 sn'lik segmentler
#   <OUT>/<ad>.mp4                     progressive 720p fallback (reduced-motion +
#                                      MSE/HLS desteklemeyen tarayıcı)
#   <OUT>/<ad>.jpg                     poster (kapak) — %10'undan bir kare
#
# Dosya adı = master'ın adı (uzantısız). siteConfig.ts'teki adlarla EŞLEŞMELİ:
#   kocaeli  kizilay-camlik  musiad  vinc
# ASCII kullan (Türkçe karakter yok) — URL her host'ta sağlam kalsın.
#
# Kullanım:
#   scripts/encode-hls.sh <masterlar-klasörü> [çıktı-klasörü]
#   scripts/encode-hls.sh ~/videolar/master              # OUT varsayılan: ./hls-out
#   scripts/encode-hls.sh ~/videolar/master ./hls-out
#
# Sonra R2'ye yükle (bucket kökü = OUT içeriği):
#   rclone copy ./hls-out r2:<bucket> --progress
#   # veya: npx wrangler r2 object put ... / dashboard'dan sürükle-bırak
#
set -euo pipefail

SRC_DIR="${1:?kaynak klasör gerekli: scripts/encode-hls.sh <masterlar> [çıktı]}"
OUT="${2:-./hls-out}"

command -v ffmpeg >/dev/null || { echo "ffmpeg bulunamadı"; exit 1; }

# 4 sn segment + 2 GOP; renditionlar arası keyframe hizası (temiz ABR geçişi).
SEG=4
mkdir -p "$OUT/hls"

shopt -s nullglob nocaseglob
FILES=("$SRC_DIR"/*.mp4 "$SRC_DIR"/*.mov "$SRC_DIR"/*.m4v)
# nullglob KAPAT: aksi halde ffmpeg'in "0:a:0?" gibi argümanlarındaki '?' glob
# sayılıp (eşleşme yoksa) silinir ve komut bozulur.
shopt -u nullglob nocaseglob
[ ${#FILES[@]} -gt 0 ] || { echo "Kaynakta video yok: $SRC_DIR"; exit 1; }

for src in "${FILES[@]}"; do
  base="$(basename "$src")"
  name="${base%.*}"
  echo "▶ $name"
  mkdir -p "$OUT/hls/$name/v0" "$OUT/hls/$name/v1" "$OUT/hls/$name/v2"

  # ── Adaptif HLS: 3 rendition + master.m3u8 ────────────────────────────────
  # scale=-2:min(H,ih) → asla upscale etmez, genişliği çift sayıya yuvarlar.
  ffmpeg -hide_banner -y -i "$src" \
    -filter_complex "\
[0:v]split=3[v1][v2][v3];\
[v1]scale=-2:'min(1080,ih)':flags=lanczos[v1o];\
[v2]scale=-2:'min(720,ih)':flags=lanczos[v2o];\
[v3]scale=-2:'min(480,ih)':flags=lanczos[v3o]" \
    -map "[v1o]" -map "[v2o]" -map "[v3o]" \
    -map "0:a:0?" -map "0:a:0?" -map "0:a:0?" \
    -c:v libx264 -profile:v high -preset veryfast -pix_fmt yuv420p \
    -sc_threshold 0 -g 48 -keyint_min 48 \
    -force_key_frames "expr:gte(t,n_forced*${SEG})" \
    -b:v:0 5000k -maxrate:v:0 5350k -bufsize:v:0 7500k \
    -b:v:1 2800k -maxrate:v:1 2996k -bufsize:v:1 4200k \
    -b:v:2 1200k -maxrate:v:2 1284k -bufsize:v:2 1800k \
    -c:a aac -b:a 128k -ac 2 \
    -f hls -hls_time "$SEG" -hls_playlist_type vod \
    -hls_flags independent_segments -hls_segment_type mpegts \
    -master_pl_name master.m3u8 \
    -hls_segment_filename "$OUT/hls/$name/v%v/seg_%04d.ts" \
    -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" \
    "$OUT/hls/$name/v%v/index.m3u8"

  # ── Progressive 720p mp4 fallback (faststart = anında oynatma) ────────────
  ffmpeg -hide_banner -y -i "$src" \
    -vf "scale=-2:'min(720,ih)'" \
    -c:v libx264 -profile:v high -preset veryfast -pix_fmt yuv420p \
    -b:v 2800k -maxrate 3000k -bufsize 4200k \
    -c:a aac -b:a 128k -ac 2 -movflags +faststart \
    "$OUT/$name.mp4"

  # ── Poster: %10 noktasından bir kare (kara ilk-kareden kaçınır) ───────────
  dur="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src" 2>/dev/null || echo 0)"
  ss="$(awk -v d="$dur" 'BEGIN{ t=d*0.1; if(t<0.1||t!=t) t=0.1; printf "%.2f", t }')"
  ffmpeg -hide_banner -y -ss "$ss" -i "$src" -frames:v 1 -update 1 \
    -vf "scale='min(1280,iw)':-2" -q:v 3 "$OUT/$name.jpg"
done

echo
echo "✓ Bitti → $OUT"
echo "  Yükle:  rclone copy \"$OUT\" r2:<bucket-adı> --progress"
echo "  Sonra:  media.reypo.com/hls/<ad>/master.m3u8 erişilebilir olmalı (CORS açık)."

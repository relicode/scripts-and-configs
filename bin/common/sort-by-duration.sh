#!/usr/bin/env bash
set -euo pipefail

json_output=false
filelist=""
files=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -j)
      json_output=true
      shift
      ;;
    -f)
      filelist="$2"
      shift 2
      ;;
    *)
      files+=("$1")
      shift
      ;;
  esac
done

if [[ -n "$filelist" && -f "$filelist" ]]; then
  while IFS= read -r line; do
    [[ -n "$line" ]] && files+=("$line")
  done < "$filelist"
fi

if [[ ${#files[@]} -eq 0 ]]; then
  echo "Usage: $0 [-j] [-f filelist.txt] file1.mp4 [file2.mp4 ...]" >&2
  exit 1
fi

probe_file() {
  local f="$1"
  if [[ ! -f "$f" ]]; then
    echo "warning: skipping '$f': not a file" >&2
    return 0
  fi

  local info
  if ! info=$(ffprobe -v quiet -print_format json -show_format -show_streams "$f" 2>/dev/null); then
    echo "warning: skipping '$f': ffprobe failed" >&2
    return 0
  fi

  local duration_s width height filesize
  duration_s=$(printf '%s' "$info" | jq -r '.format.duration // 0')
  filesize=$(printf '%s' "$info" | jq -r '.format.size // 0')
  width=$(printf '%s' "$info" | jq -r '[.streams[] | select(.codec_type=="video")][0].width // 0')
  height=$(printf '%s' "$info" | jq -r '[.streams[] | select(.codec_type=="video")][0].height // 0')

  printf '%s\t%s\t%s\t%s\t%s\n' "$f" "$duration_s" "$width" "$height" "$filesize"
}

total=${#files[@]}
data=""
for i in "${!files[@]}"; do
  f="${files[$i]}"
  printf '\r\033[K[%d/%d] %s' "$((i + 1))" "$total" "$f" >&2
  result=$(probe_file "$f")
  [[ -n "$result" ]] && data+="$result"$'\n'
done
printf '\r\033[K' >&2

sorted=$(echo -n "$data" | sort -t$'\t' -k2,2g -k5,5n -k1,1)

if $json_output; then
  echo "["
  first=true
  while IFS=$'\t' read -r filepath duration width height filesize; do
    [[ -z "$filepath" ]] && continue
    $first || echo ","
    first=false
    local_duration_ms=$(awk -v d="$duration" 'BEGIN {printf "%.0f", d * 1000}')
    printf '  {"filePath": %s, "duration": %s, "resolution": [%s, %s], "fileSize": %s}' \
      "$(jq -n --arg p "$filepath" '$p')" "$local_duration_ms" "$width" "$height" "$filesize"
  done <<< "$sorted"
  echo ""
  echo "]"
else
  echo "#EXTM3U"
  while IFS=$'\t' read -r filepath duration width height filesize; do
    [[ -z "$filepath" ]] && continue
    echo "$filepath"
  done <<< "$sorted"
fi

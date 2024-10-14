#!/bin/sh

print_duration () {
  DURATION="$(ffprobe -i "$1" -hide_banner -v error -show_format -show_entries format=duration -of flat | rg format.duration | rg --only-matching -e '\d+\.\d+')"
  PADDED_DURATION="$(printf '%015f' "$DURATION")"
  printf "$PADDED_DURATION"
}

print_resolution () {
  RESOLUTION="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$1")"
  PADDED_RESOLUTION="$(printf '%010s' "$RESOLUTION")"
  printf "$PADDED_RESOLUTION"
}

print_size () {
  SIZE="$(stat --format '%s' "$1")"
  PADDED_SIZE="$(printf '%010d' "$SIZE")"
  printf "$PADDED_SIZE"
}

for i in $@; do
  echo "$(print_duration "$i")\t$(print_resolution "$i")\t$(print_size "$i")\t"$i""
done


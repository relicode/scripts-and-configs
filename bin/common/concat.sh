#!/bin/sh

if [ "$#" -lt 3 ]; then
  echo 'Usage: concat.sh <output_file> <input_file_a> <input_file_b> [<input_file_x>...]'
  exit 1
fi

OUTPUT_FILE="$1"
shift

CONCAT_FILE="${CONCAT_FILE:-my-concat-file.txt}"

cat /dev/null > "$CONCAT_FILE"

if [ ! -f "$CONCAT_FILE" ]; then
  echo "Temp file $CONCAT_FILE not found or inaccessible, exiting..."
  exit 1
fi

for i in $@; do echo "file '$i'" >> "$CONCAT_FILE"; done && \
  echo "\n=======================" && \
  echo "Trying to concat files:\n$@ >>> $OUTPUT_FILE" && \
  echo "=======================\n" && \
  ffmpeg -f concat -safe 0 -i "$CONCAT_FILE" -c copy "$OUTPUT_FILE" && \
  echo "\nSUCCESS!" || "\nFAILED!"

rm -v "$CONCAT_FILE"

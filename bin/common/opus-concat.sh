#!/bin/sh

set -ex

if [ -f loop.opus ]; then rm -v loop.opus; fi

FILE_LIST=''
for i in *.opus; do
  if [ -z "$FILE_LIST" ]; then FILE_LIST="$i"
  else FILE_LIST="$FILE_LIST|$i";
  fi
done

ffmpeg -i "concat:$FILE_LIST" -c copy 00000_loop.opus

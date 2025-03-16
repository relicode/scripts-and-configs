#!/bin/sh

die () {
  echo Usage:
  echo  "  $0 <package base name> [<dirs>]"
  echo  "  $0 extract <package base name>"
  echo  "  $0 -h"
  ERROR_CODE="$1"
  if [ -z "$1" ]; then
    ERROR_CODE='1';
  fi
  exit "$ERROR_CODE"
}

if [ "$1" = '-h' ]; then die 0; fi

COMMAND=COMPRESS
if [ "$1" = "extract" ]; then
  COMMAND=EXTRACT
  shift
fi

ARCHIVE_FILE_NAME="$1"
if [ -z "$ARCHIVE_FILE_NAME" ]; then
  die 1
fi
shift

case "$COMMAND" in
  EXTRACT)
    echo extracting
    shift
    ARCHIVE_SOURCES="$@"
    cat "$ARCHIVE_FILE_NAME".tar.gz.* | tar xzvf -
  ;;
  COMPRESS)
    ARCHIVE_SOURCES="$@"
    tar cvzf - $ARCHIVE_SOURCES | split -b 200m - "$ARCHIVE_FILE_NAME.tar.gz."
  ;;
esac


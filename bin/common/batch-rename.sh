#!/bin/sh

echo

if [ "$1" = "-h" ]; then echo "Usage: rename.sh [<basename:-CWD>] [<extension>:-FILE_EXT]"; exit 0; fi

BASE="${1:-$(basename "$(pwd -P)")}"
EXT="$2"

ls -v | cat -n | while read n f; do
  FILE_NAME="$(basename "$f")"
  EXTRACTED="${FILE_NAME##*.}"
  EXTENSION="${EXT:-$EXTRACTED}"
  echo mv --strip-trailing-slashes -v -n "$f" "$BASE-$(printf "%06d.$EXTENSION" "$n")"
done

echo

read -s -n 1 -p "Are you sure? Press 'y' to continue "

echo
echo

if [ "$REPLY" = y ]; then
  ls -v | cat -n | while read n f; do
    FILE_NAME="$(basename "$f")"
    EXTRACTED="${FILE_NAME##*.}"
    EXTENSION="${EXT:-$EXTRACTED}"
    mv --strip-trailing-slashes -v -n "$f" "$BASE-$(printf "%06d.$EXTENSION" "$n")"
  done
fi

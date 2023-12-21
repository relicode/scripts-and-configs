#!/bin/sh

IS_KDE_NEON="$(lsb_release -a 2>/dev/null | grep 'KDE neon' 1>/dev/null && printf true)"

if [ "$IS_KDE_NEON" ]; then
  for CMD in refresh update; do
    sudo pkcon "$CMD" -y --autoremove
  done
else
  for CMD in update dist-upgrade autoremove autoclean; do
    sudo apt "$CMD" -y
  done
fi

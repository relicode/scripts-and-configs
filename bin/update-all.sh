#!/bin/sh

IS_KDE="$(lsb_release -a 2>/dev/null | grep 'KDE neon' 1>/dev/null && printf true)"

if [ "$IS_KDE" ]; then
  for CMD in refresh update autoremove; do
    sudo pkcon -y "$CMD"
  done
else
  for CMD in update dist-upgrade autoremove autoclean; do
    sudo apt -y "$CMD"
  done
fi

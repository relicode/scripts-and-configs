#!/bin/sh

if [ "$(id -u)" -ne 0 ]; then echo 'Must be run as root.'; exit 1; fi

for CMD in update dist-upgrade autoremove autoclean; do
  sudo apt "$CMD" -y
done

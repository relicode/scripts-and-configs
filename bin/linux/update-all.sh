#!/bin/sh

if [ "$(id -u)" -ne 0 ]; then echo 'Must be run as root.'; exit 1; fi

# Run a command as the invoking user, so per-user state isn't touched as root.
as_user() {
  if [ -n "$SUDO_USER" ]; then
    sudo -H -u "$SUDO_USER" "$@"
  else
    "$@"
  fi
}

for CMD in update dist-upgrade autoremove autoclean; do
  sudo apt "$CMD" -y
done

if [ "$FLATPAKS" = 0 ]; then
  echo 'FLATPAKS=0; skipping flatpak updates.'
elif command -v flatpak >/dev/null 2>&1; then
  echo 'user flatpaks:'
  as_user flatpak update -y --user
  as_user flatpak uninstall --unused -y --user

  echo 'system flatpaks:'
  flatpak update -y --system
  flatpak uninstall --unused -y --system
else
  echo 'flatpak is not installed; skipping flatpak updates.'
fi

#!/bin/sh

PROXY_SERVER="${1:-http=192.168.64.3:18888;https=192.168.64.3:18888}"

FLAGS="--new-window --proxy-server="$PROXY_SERVER""

shift

case "$(uname)" in
  Darwin)
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' $FLAGS $@
  ;;
  Linux)
    google-chrome $FLAGS $@
  ;;
  *)
    echo "Unknown OS $(uname))"
esac


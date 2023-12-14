#!/bin/sh

error () {
  echo "Commands: build, run"
  echo "Usage: $(basename "$0") build [<service>]"
  echo "       $(basename "$0") run <image> [<command>]"
  exit 1
}

case "$1" in
  build)
    DOCKER_BUILDKIT=0 docker compose build
    ;;
  run)
    if [ -z "$2" ]; then error; fi
    docker run --rm -it $2 $3
    ;;
  *)
    error
    ;;
esac

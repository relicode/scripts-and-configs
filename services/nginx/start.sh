#!/bin/sh

docker compose up --remove-orphans --force-recreate $@

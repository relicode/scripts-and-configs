#!/bin/sh

cat $@ | jq -C | less -R

#!/bin/sh

for cmd in update dist-upgrade autoremove autoclean
do
  apt -y "${cmd}"
done

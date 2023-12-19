#!/bin/sh

echo "One command"
time ffmpeg -v quiet -y -i mov.mov -vcodec copy -acodec copy -ss 00:00:00 -t 00:00:59 \
  -sn mov_1.mp4 -vcodec copy -acodec copy -ss 00:00:59 -t 00:02:35 -sn mov_2.mp4


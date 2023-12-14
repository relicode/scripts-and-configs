#!/bin/sh

echo Testing write speed
dd if=/dev/zero of=./test1.img bs=4G count=1 oflag=dsync status=progress || \
dd if=/dev/zero of=./test1.img bs=1G count=1 status=progress

echo Testing write latency
dd if=/dev/zero of=./test2.img bs=512 count=1000 oflag=dsync || \
dd if=/dev/zero of=./test1.img bs=1G count=1 status=progress

rm -v test1.img test2.img
echo Done!

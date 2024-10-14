#!/bin/sh

if [ "$#" -ne 1 ]; then echo "Usage: $(basename "$0") <container_id>"; exit 1; fi

docker commit "$1" user/test_image && \
docker run -it --entrypoint=/bin/sh user/test_image

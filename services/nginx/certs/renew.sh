#!/bin/sh

if [ $# -lt 1 ]; then echo "Usage: $(basename "$0") <domain> [<domain...>]"; fi

REAL="$(readlink -f "$0")"
DIR="$(dirname "$REAL")"

DOMAINS=''
for i in $@; do
  DOMAINS="$DOMAINS -d $i"
done

certbot certonly \
  --dns-ovh \
  --dns-ovh-credentials credentials-ovh.txt \
  --config-dir "$DIR/config" \
  --work-dir "$DIR/work" \
  --logs-dir "$DIR/log" \
  $DOMAINS


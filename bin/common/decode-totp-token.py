#!/usr/bin/env python3

import base64, html, json, sys

USAGE = """Usage: ./decode-totp-token.py <JSON...>

Example: ./decode-totp-token.py '{"algo":"SHA1","counter":0,"digits":6,"issuerExt":"Firefox","label":"firstname.lastname@email.com","period":30,"secret":[117,54,51],"type":"TOTP"}' '{"algo":"SHA1","counter":0,"digits":6,"issuerExt":"Firefox","label":"firstname.lastname@email.com","period":30,"secret":[51,51,51],"type":"TOTP"}'"""

def decode(s):
    # s = html.unescape(s)
    token = json.loads(s)
    secret = bytes((x + 256) & 255 for x in token["secret"])
    code = base64.b32encode(secret)
    return(code.decode().lower())

if len(sys.argv) < 2:
    print(USAGE)
    exit(1)

for a in sys.argv[1:]:
    print(decode(a))


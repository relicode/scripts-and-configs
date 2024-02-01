#!/bin/sh

command -v jq && curl -s https://mccall.kapsi.fi/ip.php | jq || curl -s https://mccall.kapsi.fi/ip.php


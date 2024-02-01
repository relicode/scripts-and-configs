#!/usr/bin/env python3

from random import choice, randint
from string import ascii_letters, digits

string_set = ascii_letters + digits

passwd = ''
for c in range(randint(16, 24)): passwd += choice(string_set)
passwd += ' '
for c in range(randint(32, 48)): passwd += choice(string_set)

print(passwd)

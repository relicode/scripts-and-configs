#!/bin/bash
# This file was originally taken from iterm2 https://github.com/gnachman/iTerm2/blob/master/tests/24-bit-color.sh
#
#   This file echoes a bunch of 24-bit color codes
#   to the terminal to demonstrate its functionality.
#   The foreground escape sequence is ^[38;2;<r>;<g>;<b>m
#   The background escape sequence is ^[48;2;<r>;<g>;<b>m
#   <r> <g> <b> range from 0 to 255 inclusive.
#   The escape sequence ^[0m returns output to default

setBackgroundColor()
{
  #printf '\x1bPtmux;\x1b\x1b[48;2;%s;%s;%sm' $1 $2 $3
  printf '\x1b[48;2;%s;%s;%sm' $1 $2 $3
}

resetOutput()
{
  echo -en "\x1b[0m\n"
}

# Gives a color $1/255 % along HSV
# Who knows what happens when $1 is outside 0-255
# Echoes "$red $green $blue" where
# $red $green and $blue are integers
# ranging between 0 and 255 inclusive
rainbowColor()
{ 
  let h=$1/43
  let f=$1-43*$h
  let t=$f*255/43
  let q=255-t

  if [ $h -eq 0 ]
  then
    echo "255 $t 0"
  elif [ $h -eq 1 ]
  then
    echo "$q 255 0"
  elif [ $h -eq 2 ]
  then
    echo "0 255 $t"
  elif [ $h -eq 3 ]
  then
    echo "0 $q 255"
  elif [ $h -eq 4 ]
  then
    echo "$t 0 255"
  elif [ $h -eq 5 ]
  then
    echo "255 0 $q"
  else
    # execution should never reach here
    echo "0 0 0"
  fi
}

echo "24 BIT"

for i in `seq 0 127`; do
  setBackgroundColor $i 0 0
  echo -en " "
done
resetOutput
for i in `seq 255 -1 128`; do
  setBackgroundColor $i 0 0
  echo -en " "
done
resetOutput

for i in `seq 0 127`; do
  setBackgroundColor 0 $i 0
  echo -n " "
done
resetOutput
for i in `seq 255 -1 128`; do
  setBackgroundColor 0 $i 0
  echo -n " "
done
resetOutput

for i in `seq 0 127`; do
  setBackgroundColor 0 0 $i
  echo -n " "
done
resetOutput
for i in `seq 255 -1 128`; do
  setBackgroundColor 0 0 $i
  echo -n " "
done
resetOutput

for i in `seq 0 127`; do
  setBackgroundColor `rainbowColor $i`
  echo -n " "
done
resetOutput
for i in `seq 255 -1 128`; do
  setBackgroundColor `rainbowColor $i`
  echo -n " "
done
resetOutput

# Based on: https://gist.github.com/XVilka/8346728 and https://unix.stackexchange.com/a/404415/395213

echo; echo TrueColor; echo

awk -v term_cols="${width:-$(tput cols || echo 80)}" -v term_lines="${height:-1}" 'BEGIN{
  s="/\\";
  total_cols=term_cols*term_lines;
  for (colnum = 0; colnum<total_cols; colnum++) {
    r = 255-(colnum*255/total_cols);
    g = (colnum*510/total_cols);
    b = (colnum*255/total_cols);
    if (g>255) g = 510-g;
    printf "\033[48;2;%d;%d;%dm", r,g,b;
    printf "\033[38;2;%d;%d;%dm", 255-r,255-g,255-b;
    printf "%s\033[0m", substr(s,colnum%2+1,1);
    if (colnum%term_cols==term_cols) printf "\n";
  }
  printf "\n";
}'


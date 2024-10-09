#!/bin/sh

SCRIPT_DIR="$(readlink -f "$(dirname "$0")")"
EXTRAS_DIR="$SCRIPT_DIR/extras"
TMUX_DIR="$SCRIPT_DIR/submodules/oh-my-tmux"
PACKAGE_MANAGER="${PACKAGE_MANAGER:-apt}"

OS_LINUX="LINUX"
OS_OSX="OSX"
ARCH_AMD="AMD"
ARCH_SILICON="SILICON"
ARCH_ARM="ARM"

OS=""
ARCH=""

case "$(uname -a)" in
  Linux*) OS="$OS_LINUX"
  ;;
  Darwin*) OS="$OS_OSX"
  ;;
esac

case "$(uname -a)" in
  *x86_64*) ARCH="$ARCH_AMD"
  ;;
  *arm64*) ARCH="$ARCH_SILICON" # M1 Macs and above
  ;;
  *aarch64*) ARCH="$ARCH_ARM"   # Raspberry Pis etc
  ;;
esac

[ -z "$OS" ] && echo "Unable to determine OS"; exit 1
[ -z "$ARCH" ] && echo "Unable to determine architecture"; exit 1

case $OS in
  $OS_LINUX) . "$EXTRAS_DIR/bash.env"
  ;;
  $OS_OSX) . "$EXTRAS_DIR/zsh.env"
  ;;
esac

init_dirs() {
  for DIRNAME in opt bin etc; do
    DIRPATH="$HOME/$DIRNAME"
    if [ ! -d "$DIRPATH" ]; then mkdir -pv "$DIRPATH"; fi
  done || exit 1
  cp -v bin/common/* "$HOME/bin"
}

install_ohmytmux () {
  ln -fs "$TMUX_DIR/.tmux.conf" "$HOME/.tmux.conf" && \
  cp -v "$TMUX_DIR/.tmux.conf.local" "$HOME/.tmux.conf.local"
}

install_nvim () {
  [ $OS = $OS_LINUX ] && [ $ARCH = $ARCH_AMD ] && (
    cd "$HOME/opt" \
      && wget https://github.com/neovim/neovim/releases/latest/download/nvim-linux64.tar.gz \
      && tar -xvvf nvim-linux64.tar.gz \
      && rm nvim-linux64.tar.gz \
      && ln -s "$HOME/opt/nvim-linux64/bin/nvim" "$HOME/bin/"
  )
}

install_nvchad () {
  "$SCRIPT_DIR/bin/common/reset-nvchad.sh"
}

update_submodules () {
  git submodule foreach "\
    echo Submodule $sm_path at commit "$(git rev-parse HEAD)"; \
    echo Rebasing to main...; \
    git checkout master; \
    git pull origin master; \
    echo DONE\!; \
    echo"
}

display_help () {
  echo
  if [ -z "$2" ]; then
    echo "Invalid command: '$1' - valid commands are:"
    echo init_dirs
    echo install_deps
    echo install_extras
    echo install_docker
    echo install_ohmytmux
    echo install_nvim
    echo compile_nvim
    echo install_nvm
    echo install_python_venv
    echo install_nvchad
    echo update_submodules
  else
    echo "$2"
  fi
  exit 1
}

if [ "$#" -lt 1 ]; then
  display_help help
fi

for COMMAND in $@; do
  case "$COMMAND" in
    init_dirs|install_deps|install_docker|install_ohmytmux|install_nvim|compile_nvim|install_extras|install_nvm|install_python_venv|install_nvchad|update_submodules)
      $COMMAND || display_help "$COMMAND" "Failed running command "$COMMAND""
      ;;
    *)
      display_help "$COMMAND"
      ;;
  esac
done

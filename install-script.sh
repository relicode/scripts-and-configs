#!/bin/sh

WORK_DIR="$(pwd -P)"
NODE_NVM_VERSION="lts/iron"
TMUX_DIR="$WORK_DIR/submodules/oh-my-tmux"
IS_KDE_NEON="$(lsb_release -a 2>/dev/null | grep 'KDE neon' 1>/dev/null && printf true)"

if [ "$IS_KDE_NEON" ]
  then
    PACKAGE_MANAGER='sudo pkcon'
  else
    command -v brew 1>/dev/null && PACKAGE_MANAGER='brew' || PACKAGE_MANAGER='sudo apt'
fi

case "$SHELL" in
  *bash)
    L_SHELL=BASH
    RC_FILE="$HOME/.bashrc"
    ALIAS_FILE="$HOME/.bash_aliases"
    ;;
  *zsh)
    L_SHELL=ZSH
    RC_FILE="$HOME/.zshrc"
    ALIAS_FILE="$HOME/.zsh_aliases"
    ;;
  *sh)
    L_SHELL=POSIX
    RC_FILE="$HOME/.profile"
    ALIAS_FILE="$RC_FILE"
    ;;
  *)
    echo "Couldn't determine shell ($SHELL)"
    exit 1
    ;;
esac

init_dirs() {
  for DIRNAME in opt bin etc; do
    DIRPATH="$HOME/$DIRNAME"
    if [ ! -d "$DIRPATH" ]; then mkdir -pv "$DIRPATH"; fi
  done || exit 1
  cp -v bin/* "$HOME/bin"
}

install_deps () {
  $PACKAGE_MANAGER install -y  build-essential curl git ldnsutils lm-sensors locales-all \
    python3-venv ripgrep sudo tmux tree unzip wget
}

install_docker () {
  $PACKAGE_MANAGER remove -y docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc
  curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh ./get-docker.sh && rm get-docker.sh
}

install_ohmytmux () {
  ln -fs "$TMUX_DIR/.tmux.conf" "$HOME/.tmux.conf" && \
  cp -v "$TMUX_DIR/.tmux.conf.local" "$HOME/.tmux.conf.local"
}

install_nvim () {
  cd "$HOME/opt"
  wget https://github.com/neovim/neovim/releases/latest/download/nvim-linux64.tar.gz
  tar -xvvf nvim-linux64.tar.gz
  rm nvim-linux64.tar.gz
  cd "$HOME/bin"
  ln -s "$HOME/opt/nvim-linux64/bin/nvim" ./nvim
  cd "$WORK_DIR"
}

install_extras () {
  cp -v "extras/."* "$HOME"
}

install_nvm () {
  if [ -z "$XDG_CONFIG_HOME" ]; then
    echo "Set XDG_CONFIG_HOME first!"
    return 1
  fi

  export NVM_DIR="$XDG_CONFIG_HOME/nvm"

  command -v bash 1>/dev/null && \
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash && \
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && \
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" && \
  nvm i "$NODE_NVM_VERSION"
}

install_python_venv () {
  if [ ! -d "$HOME/etc/python3-venv" ]; then
    command python3 -m venv -h 1>/dev/null || exit 1
    python3 -m venv "$HOME/etc/python3-venv"
  fi
}

install_nvchad () {
  rm -rf "$HOME/.config/nvim"
  rm -rf "$HOME/.local/share/nvim"
  git clone https://github.com/NvChad/NvChad "$HOME/.config/nvim" --depth 1
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
    echo install_docker
    echo install_ohmytmux
    echo install_nvim
    echo install_extras
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
    init_dirs|install_deps|install_docker|install_ohmytmux|install_nvim|install_extras|install_nvm|install_python_venv|install_nvchad|update_submodules)
      $COMMAND || display_help "$COMMAND" "Failed running command "$COMMAND""
      break
      ;;
    *)
      display_help "$COMMAND"
      ;;
  esac
done

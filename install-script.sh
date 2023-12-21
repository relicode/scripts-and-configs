#!/bin/sh

NODE_NVM_VERSION="lts/iron"
RC_FILE="$HOME/.bashrc"
WORK_DIR="$(pwd -P)"

IS_KDE_NEON="$(lsb_release -a 2>/dev/null | grep 'KDE neon' 1>/dev/null && printf true)"
if [ "$IS_KDE_NEON" ]; then PKG_CMD='sudo pkcon'; else PKG_CMD='sudo apt'; fi

create_dirs() {
  for DIRNAME in opt bin; do
    DIRPATH="$HOME/$DIRNAME"
    if [ ! -d "$DIRPATH" ]; then mkdir -pv "$DIRPATH"; fi
  done
  cp -v bin/* "$HOME/bin"
}
echo create_dirs

install_deps () {
  $PKG_CMD install -y tmux git build-essential tree ripgrep curl wget ldnsutils lm-sensors sudo locales-all python3-venv unzip
}
echo install_deps

install_docker () {
  $PKG_CMD remove -y docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc
  curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh ./get-docker.sh && rm get-docker.sh
}
echo install_docker

install_nvim () {
  cd "$HOME/opt"
  wget https://github.com/neovim/neovim/releases/latest/download/nvim-linux64.tar.gz
  tar -xvvf nvim-linux64.tar.gz
  rm nvim-linux64.tar.gz
  cd "$HOME/bin"
  ln -s "$HOME/opt/nvim-linux64/bin/nvim" ./nvim
  cd "$WORK_DIR"
}
echo install_nvim

install_ohmytmux () {
  TMUX_DIR="$WORK_DIR/submodules/oh-my-tmux"
  ln -s "$TMUX_DIR/.tmux.conf" "$HOME/.tmux.conf" && cp "$TMUX_DIR/.tmux.conf.local" -v "$HOME/.tmux.conf.local"
}
echo install_ohmytmux

update_rc_file () {
  CMD='
export XDG_CONFIG_HOME="$HOME/.config"
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/bin:$PATH"
export EDITOR="$HOME/bin/nvim"
alias vim="nvm exec $NODE_NVM_VERSION nvim"'
  eval "$CMD"
  echo "$CMD" >> "$RC_FILE"
}
echo update_rc_file

install_nvm () {
  command -v bash && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash && \
  export NVM_DIR="$XDG_CONFIG_HOME/nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
  nvm i "$NODE_NVM_VERSION"
}
echo install_nvm

install_nvchad () {
  rm -rf "$HOME/.config/nvim"
  rm -rf "$HOME/.local/share/nvim"
  git clone https://github.com/NvChad/NvChad "$HOME/.config/nvim" --depth 1 && nvim
}
echo install_nvchad

for i in $@; do "$i"; done

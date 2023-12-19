#!/bin/sh

WORK_DIR="$(dirname "$0")"
IS_KDE_NEON="$(lsb_release -a 2>/dev/null | grep 'KDE neon' 1>/dev/null && printf true)"

create_dirs() {
  for DIRNAME in etc opt bin; do
    if [ ! -d "$HOME/$DIRNAME" ]; then mkdir -v "$HOME/$DIRNAME"; fi
  done
}

install_deps () {
  if [ "$IS_KDE_NEON" ]; then
    pkcon install -y tmux git build-essential tree ripgrep curl wget ldnsutils lm-sensors sudo locales-all python3-venv unzip
  else
    apt install -y tmux git build-essential tree ripgrep curl wget ldnsutils lm-sensors sudo locales-all python3-venv unzip
  fi
}

install_docker () {
  sudo apt-get update
  sudo apt-get install ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  # Add the repository to Apt sources:
  echo \
    "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
    "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update
  sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo groupadd docker
  sudo usermod -aG docker $USER
  newgrp docker
  docker run --rm hello-world
  command -v bash && (curl https://raw.githubusercontent.com/jesseduffield/lazydocker/master/scripts/install_update_linux.sh | DIR="$HOME/bin" bash)
}

install_nvim () {
  cd "$HOME/opt"
  wget https://github.com/neovim/neovim/releases/latest/download/nvim-linux64.tar.gz
  tar -xvvf nvim-linux64.tar.gz
  rm nvim-linux64.tar.gz
  cd "$HOME/bin"
  ln -s "$HOME/opt/nvim-linux64/bin/nvim" ./nvim
  cd "$WORK_DIR"
}

install_ohmytmux () {
  TMUX_DIR="$HOME/etc/oh-my-tmux"

  git clone --depth 1 https://github.com/gpakosz/.tmux "$TMUX_DIR" && \
    cp "$TMUX_DIR/.tmux.conf.local" "$HOME/.tmux.conf.local" && \
    ln -s "$TMUX_DIR/.tmux.conf" "$HOME/.tmux.conf"
}

update_bashrc () {
  echo '
export XDG_CONFIG_HOME="$HOME/.config"
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/bin:$PATH"
export EDITOR="$HOME/bin/nvim"

alias vim="nvm exec lts/iron nvim"' > sourceme && \
  . sourceme && \
  cat sourceme >> .bashrc && \
  rm sourceme
}

install_nvm () {
  command -v bash && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash && \
  export NVM_DIR="$XDG_CONFIG_HOME/nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
  nvm i lts/iron
}

install_nvchad () {
  rm -rf "$HOME/.config/nvim"
  rm -rf "$HOME/.local/share/nvim"
  git clone https://github.com/NvChad/NvChad "$HOME/.config/nvim" --depth 1 && nvim
}


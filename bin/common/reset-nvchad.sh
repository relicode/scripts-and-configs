#!/bin/sh

NVIM_CONFIG_DIR="${XDG_CONFIG_HOME:-"$HOME/.config"}/nvim"

rm -rf "$NVIM_CONFIG_DIR"
rm -rf "${XDG_DATA_HOME:-"$HOME/.local/share"}/nvim"
rm -rf "${XDG_STATE_HOME:-"$HOME/.local/state"}/nvim"

git clone --depth 1 https://github.com/NvChad/starter "$NVIM_CONFIG_DIR"

echo "Open nvim ( nvm exec default nvim ) and run :MasonInstallAll command after lazy.nvim finishes downloading plugins."

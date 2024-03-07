if (command -v dircolors 1>/dev/null); then
  COLORS_PATH="$HOME/.dircolors"
  test -r "$COLORS_PATH" && eval "$(dircolors -b "$COLORS_PATH")" || eval "$(dircolors -b)"
  unset COLORS_PATH
fi

cdnvm() {
  if [ "$SHELL" != '/bin/bash' -o ! -d "$NVM_DIR" ]; then
    command cd "$@" || return $?
    return 0;
  fi

  command cd "$@" || return $?
  nvm_path="$(nvm_find_up .nvmrc | command tr -d '\n')"

  # Use the default nvm version if no .nvmrc file can be found
  if [[ ! $nvm_path = *[^[:space:]]* ]]; then

    declare default_version
    default_version="$(nvm version default)"

    # If there is no default version, set it to `node`. This will use the latest version on your machine
    if [ $default_version = 'N/A' ]; then
      nvm alias default node
      default_version=$(nvm version default)
    fi

    # If the current version is not the default version, set it to use the default version
    if [ "$(nvm current)" != "${default_version}" ]; then
      nvm use default
    fi
    elif [[ -s "${nvm_path}/.nvmrc" && -r "${nvm_path}/.nvmrc" ]]; then
      declare nvm_version
      nvm_version=$(<"${nvm_path}"/.nvmrc)

      declare locally_resolved_nvm_version
      # `nvm ls` will check all locally-available versions
      # If there are multiple matching versions, take the latest one
      # Remove the `->` and `*` characters and spaces
      # `locally_resolved_nvm_version` will be `N/A` if no local versions are found
      locally_resolved_nvm_version=$(nvm ls --no-colors "${nvm_version}" | command tail -1 | command tr -d '\->*' | command tr -d '[:space:]')

      # If it is not already installed, install it
      # `nvm install` will implicitly use the newly-installed version
      if [ "${locally_resolved_nvm_version}" = 'N/A' ]; then
        nvm install "${nvm_version}";
      elif [ "$(nvm current)" != "${locally_resolved_nvm_version}" ]; then
        nvm use "${nvm_version}";
      fi
  fi
}

cdnvm

alias cd='cdnvm'
alias dc='docker compose'
alias grep='grep --color=auto'
alias ls='ls --color=auto'
alias tree='tree -C'
alias vim='nvm exec default nvim'
alias yt-dlpp='yt-dlp -o '\''%(playlist)s/%(playlist_index)05d___%(title)s.%(ext)s'\'''
if [ -t 1 ]; then alias cal="ncal -b"; else alias cal="/usr/bin/cal"; fi


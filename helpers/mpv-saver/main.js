var workDir = mp.utils.getcwd()
var CONF_FILE_PATH = mp.utils.join_path(workDir, 'saved.json')
var config

try {
  config = JSON.parse(mp.utils.read_file(CONF_FILE_PATH))
} catch (e) {
  config = {}
}

function includes(arr, val) {
  for (var i = 0; i<arr.length; i++) {
    if (arr[i] === val) {
      return true
    }
  }
  return false
}

var FILE_SAVE = 'save'
var FILE_DELETE = 'delete'
var FILE_PLAYLIST = 'playlist'

function toggleFile(action) {
  var fileName = mp.get_property_osd('filename')
  var filePath = mp.get_property('path')

  if (config[filePath] === action) {
    delete config[filePath]
    mp.osd_message(fileName + ' reset')
  } else {
    config[filePath] = action
    switch (action) {
      case FILE_SAVE:
        mp.osd_message(fileName + ' marked for saving')
        break
      case FILE_DELETE:
        mp.osd_message(fileName + ' marked for deletion')
        break
      case FILE_PLAYLIST:
        mp.osd_message(fileName + ' marked for playlist')
        break
    }
  }

  mp.utils.write_file('file://' + CONF_FILE_PATH, JSON.stringify(config))
}

function save() {
  toggleFile(FILE_SAVE)
}
function del() {
  toggleFile(FILE_DELETE)
}
function playlist() {
  toggleFile(FILE_PLAYLIST)
}

var eventHandlers = {
  fileLoaded: function() {
    dump('started')
    mp.osd_message(mp.get_property_osd('filename/no-ext'))
    mp.osd_message(mp.get_property_osd('path'))
  },
}

mp.register_event('file-loaded', eventHandlers.fileLoaded)

mp.add_forced_key_binding('s', 'toggleFileForSaving', save)
mp.add_forced_key_binding('d', 'toggleFileForDeletion', del)
mp.add_forced_key_binding('a', 'toggleFileForPlaylist', playlist)


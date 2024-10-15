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

function toggleSave(shouldSave) {
  var fileName = mp.get_property_osd('filename')
  var filePath = mp.get_property('path')

  if (config[filePath] === shouldSave) {
    delete config[filePath]
    mp.osd_message(fileName + ' reset')
  } else {
    config[filePath] = shouldSave
    mp.osd_message(fileName + (shouldSave ? ' to save' : ' to del'))
  }

  mp.utils.write_file('file://' + CONF_FILE_PATH, JSON.stringify(config))
}

function save() {
  toggleSave(true)
}
function del() {
  toggleSave(false)
}

var eventHandlers = {
  fileLoaded: function() {
    dump('started')
    mp.osd_message(mp.get_property_osd('filename/no-ext'))
    mp.osd_message(mp.get_property_osd('path'))
  },
}

mp.register_event('file-loaded', eventHandlers.fileLoaded)

mp.add_forced_key_binding('s', 'toggleSaveY', save)
mp.add_forced_key_binding('d', 'toggleSaveN', del)


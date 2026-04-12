// saver.js - mpv script (MuJS / ES5)

var SAVED_PATH = mp.utils.join_path(
    mp.get_property("working-directory"),
    "saved.json"
);

var data = undefined;
var cutState = {}; // keyed by path -> { phase: 1|2, start: number }

// ASS color overlay (osd_message doesn't support colors)
var osd = mp.create_osd_overlay("ass-events");
var osdTimeout = undefined;
// ASS colors are BGR
var GREEN = "\\c&H00FF00&";
var YELLOW = "\\c&H00FFFF&";
var RED = "\\c&H0000FF&";
var WHITE = "\\c&HFFFFFF&";

function showOsd(color, label, name) {
    if (osdTimeout) {
        clearTimeout(osdTimeout);
        osdTimeout = undefined;
    }
    osd.data = "{\\an7\\fs28\\bord2}{" + color + "}" + label + "{" + WHITE + "} - " + name;
    osd.update();
    osdTimeout = setTimeout(function() {
        osd.remove();
    }, 1500);
}

function loadData() {
    try {
        var content = mp.utils.read_file(SAVED_PATH);
        if (content) {
            data = JSON.parse(content);
        }
    } catch (e) {
        data = undefined;
    }

    if (!data) {
        data = {
            toDel: [],
            toPlaylist: [[], [], [], [], [], [], [], [], [], []],
            toSave: [],
            toCut: []
        };
    }

    if (!data.toDel) data.toDel = [];
    if (!data.toPlaylist) data.toPlaylist = [[], [], [], [], [], [], [], [], [], []];
    if (!data.toSave) data.toSave = [];
    if (!data.toCut) data.toCut = [];
}

function saveData() {
    try {
        var json = JSON.stringify(data, null, 2);
        mp.utils.write_file("file://" + SAVED_PATH, json);
    } catch (e) {
        mp.msg.error("Failed to save: " + e);
    }
}

function getPath() {
    return mp.get_property("path");
}

function displayName(filename) {
    if (!filename) return "";
    if (filename.length > 64) return filename.slice(0, 64);
    return filename;
}

function findIndex(arr, value) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === value) return i;
    }
    return -1;
}

function findCutIndex(arr, path) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].path === path) return i;
    }
    return -1;
}

function formatTime(seconds) {
    if (seconds == null || isNaN(seconds)) return "??:??:??";
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor(seconds % 60);
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}

// d - toggle toDel
function toggleDel() {
    var path = getPath();
    if (!path) return;
    var name = displayName(mp.get_property("filename"));
    var idx = findIndex(data.toDel, path);
    if (idx !== -1) {
        data.toDel.splice(idx, 1);
        showOsd(RED, "UNDEL", name);
    } else {
        data.toDel.push(path);
        showOsd(GREEN, "DEL", name);
    }
    saveData();
}

// 0-9 - toggle toPlaylist[index]
function makePlaylistToggle(index) {
    return function() {
        var path = getPath();
        if (!path) return;
        var name = displayName(mp.get_property("filename"));

        while (data.toPlaylist.length <= index) {
            data.toPlaylist.push([]);
        }

        var arr = data.toPlaylist[index];
        var pos = findIndex(arr, path);
        if (pos !== -1) {
            arr.splice(pos, 1);
            showOsd(RED, "UNPLAYLIST " + index, name);
        } else {
            arr.push(path);
            showOsd(GREEN, "PLAYLIST " + index, name);
        }
        saveData();
    };
}

// s - toggle toSave
function toggleSave() {
    var path = getPath();
    if (!path) return;
    var name = displayName(mp.get_property("filename"));
    var idx = findIndex(data.toSave, path);
    if (idx !== -1) {
        data.toSave.splice(idx, 1);
        showOsd(RED, "UNSAVE", name);
    } else {
        data.toSave.push(path);
        showOsd(GREEN, "SAVE", name);
    }
    saveData();
}

// c - cycle cut: start -> end -> clear
function toggleCut() {
    var path = getPath();
    if (!path) return;
    var name = displayName(mp.get_property("filename"));
    var state = cutState[path];

    if (!state) {
        var pos = mp.get_property_number("time-pos");
        cutState[path] = { phase: 1, start: pos };
        showOsd(YELLOW, "CUT START " + pos.toFixed(1) + "s", name);
    } else if (state.phase === 1) {
        var pos = mp.get_property_number("time-pos");
        var cutStart = state.start;
        var cutEnd = pos;
        if (cutEnd < cutStart) {
            var tmp = cutStart;
            cutStart = cutEnd;
            cutEnd = tmp;
        }
        data.toCut.push({ path: path, start: cutStart, end: cutEnd });
        cutState[path] = { phase: 2 };
        showOsd(GREEN, "CUT END " + cutEnd.toFixed(1) + "s", name);
        saveData();
    } else if (state.phase === 2) {
        var idx = findCutIndex(data.toCut, path);
        if (idx !== -1) {
            data.toCut.splice(idx, 1);
        }
        cutState[path] = undefined;
        showOsd(RED, "UNCUT", name);
        saveData();
    }
}

// p - show play queue
var queueOsd = mp.create_osd_overlay("ass-events");
var queueTimeout = undefined;

function renderQueue() {
    if (queueTimeout) {
        clearTimeout(queueTimeout);
        queueTimeout = undefined;
    }
    var count = mp.get_property_number("playlist-count");
    var current = mp.get_property_number("playlist-pos");
    if (!count) return;
    var WINDOW = 10;
    var start = Math.max(0, current - WINDOW);
    var end = Math.min(count, current + WINDOW + 1);
    var lines = [];
    if (start > 0) lines.push("... (" + start + " more)");
    for (var i = start; i < end; i++) {
        var fname = mp.get_property("playlist/" + i + "/filename");
        var name = displayName(fname);
        if (i === current) {
            lines.push("{" + GREEN + "}" + name + "{" + WHITE + "}");
        } else {
            lines.push(name);
        }
    }
    if (end < count) lines.push("... (" + (count - end) + " more)");
    queueOsd.data = "{\\an7\\fs20\\bord2}{" + WHITE + "}" + lines.join("\\N");
    queueOsd.update();
    queueTimeout = setTimeout(function() {
        queueOsd.remove();
        queueTimeout = undefined;
    }, 5000);
}

function toggleQueue() {
    if (queueTimeout) {
        clearTimeout(queueTimeout);
        queueTimeout = undefined;
        queueOsd.remove();
        return;
    }
    renderQueue();
}

// Init
loadData();

// Key bindings
mp.add_forced_key_binding("d", "saver-del", toggleDel);
mp.add_forced_key_binding("s", "saver-save", toggleSave);
mp.add_forced_key_binding("c", "saver-cut", toggleCut);
mp.add_forced_key_binding("p", "saver-queue", toggleQueue);
mp.add_forced_key_binding("x", "saver-next", function() {
    mp.command("playlist-next");
    if (queueTimeout) renderQueue();
});
mp.add_forced_key_binding("z", "saver-prev", function() {
    mp.command("playlist-prev");
    if (queueTimeout) renderQueue();
});
mp.add_forced_key_binding("w", "saver-vol-down", function() { mp.command("add volume -5"); });
mp.add_forced_key_binding("e", "saver-vol-up", function() { mp.command("add volume 5"); });

mp.register_event("file-loaded", function() {
    var filename = mp.get_property("filename");
    if (!filename) return;
    var duration = mp.get_property_number("duration");
    var name = filename.length > 64 ? filename.slice(0, 64) : filename;
    if (osdTimeout) {
        clearTimeout(osdTimeout);
        osdTimeout = undefined;
    }
    osd.data = "{\\an7\\fs28\\bord2}{" + WHITE + "}" + name + " (" + formatTime(duration) + ")";
    osd.update();
    osdTimeout = setTimeout(function() { osd.remove(); }, 1500);
});

for (var i = 0; i <= 9; i++) {
    mp.add_forced_key_binding(i.toString(), "saver-playlist-" + i, makePlaylistToggle(i));
}

mp.msg.info("saver.js loaded, path: " + SAVED_PATH);

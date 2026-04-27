#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { readFile, writeFile, mkdir, rename, unlink, access, copyFile } from 'node:fs/promises';
import { resolve, basename, dirname, extname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const { values: flags, positionals } = parseArgs({
  options: {
    cut:      { type: 'boolean', short: 'c' },
    del:      { type: 'boolean', short: 'd' },
    playlist: { type: 'boolean', short: 'p' },
    save:     { type: 'boolean', short: 's' },
    help:     { type: 'boolean', short: 'h' },
  },
  allowPositionals: true,
  strict: true,
});

if (flags.help) {
  console.log(`Usage: sort.mjs [-c] [-d] [-p] [-s] [saved.json path]

  -c  Process cuts only
  -d  Process deletions only
  -p  Process playlists only
  -s  Process saves only

If no flags given, all sections run. Path defaults to ./saved.json`);
  process.exit(0);
}

const runAll = !flags.cut && !flags.del && !flags.playlist && !flags.save;
const savedPath = resolve(positionals[0] || 'saved.json');
const baseDir = dirname(savedPath);

const rl = createInterface({ input: stdin, output: stdout });

// ANSI helpers
const c = (code, s) => `\x1b[${code}m${s}\x1b[0m`;
const bold    = (s) => c(1, s);
const dim     = (s) => c(2, s);
const red     = (s) => c(31, s);
const green   = (s) => c(32, s);
const yellow  = (s) => c(33, s);
const cyan    = (s) => c(36, s);

const ask = async (prompt, fallback) => {
  const def = fallback ? ` [${fallback}]` : '';
  const answer = (await rl.question(prompt + def + ': ')).trim();
  return answer || fallback || '';
};

const confirm = async (prompt) => {
  const answer = await ask(prompt + ' (y/n)', 'n');
  return answer.toLowerCase() === 'y';
};

const exists = async (p) => {
  try { await access(p); return true; } catch { return false; }
};

const ensureDir = async (dir) => {
  if (!(await exists(dir))) await mkdir(dir, { recursive: true });
};

const resolvePath = (rel) => resolve(baseDir, rel);

// ── Save section ──────────────────────────────────────────────

const processSave = async (data) => {
  if (!data.toSave?.length) {
    console.log(dim('\n[save] Nothing to save.'));
    return;
  }

  console.log(bold(cyan('\n── Move toSave files to temp dir ──')));
  for (const f of data.toSave) console.log(`  ${f}`);

  if (!(await confirm('Proceed?'))) return;

  const dirName = await ask('Directory name', 'temp');
  const destDir = resolve(baseDir, dirName);
  await ensureDir(destDir);

  for (const f of data.toSave) {
    const src = resolvePath(f);
    const dest = join(destDir, basename(f));
    if (!(await exists(src))) {
      console.log(yellow(`  SKIP (not found): ${f}`));
      continue;
    }
    if (await exists(dest)) {
      if (!(await confirm(`  Overwrite ${dest}?`))) {
        console.log(yellow(`  SKIP: ${f}`));
        continue;
      }
    }
    try {
      await rename(src, dest);
    } catch (err) {
      if (err.code === 'EXDEV') {
        await copyFile(src, dest);
        await unlink(src);
      } else {
        throw err;
      }
    }
    console.log(green(`  MOVED: ${f} -> ${dirName}/${basename(f)}`));
  }
  data.toSave = [];
};

// ── Delete section ────────────────────────────────────────────

const processDel = async (data) => {
  if (!data.toDel?.length) {
    console.log(dim('\n[del] Nothing to delete.'));
    return;
  }

  console.log(bold(red('\n── Delete toDel files ──')));
  for (const f of data.toDel) console.log(`  ${f}`);

  if (!(await confirm('Proceed?'))) return;

  for (const f of data.toDel) {
    const src = resolvePath(f);
    if (!(await exists(src))) {
      console.log(yellow(`  SKIP (not found): ${f}`));
      continue;
    }
    await unlink(src);
    console.log(red(`  DELETED: ${f}`));
  }
  data.toDel = [];
};

// ── Playlist section ──────────────────────────────────────────

const processPlaylist = async (data) => {
  if (!data.toPlaylist?.length) {
    console.log(dim('\n[playlist] No playlists.'));
    return;
  }

  const nonEmpty = data.toPlaylist
    .map((files, i) => ({ i, files }))
    .filter(({ files }) => files.length > 0);

  if (!nonEmpty.length) {
    console.log(dim('\n[playlist] All playlists empty.'));
    return;
  }

  for (const { i, files } of nonEmpty) {
    console.log(bold(cyan(`\n── Playlist ${i} ──`)));
    for (const f of files) console.log(`  ${f}`);

    if (!(await confirm('Create/update this playlist?'))) continue;

    const raw = await ask('Playlist filename', `playlist_${i}.m3u`);
    const name = raw.endsWith('.m3u') ? raw : raw + '.m3u';
    const dest = resolve(baseDir, name);

    let existing = '';
    if (await exists(dest)) {
      existing = await readFile(dest, 'utf8');
      console.log(yellow(`  (appending to existing ${name})`));
    }

    const existingLines = new Set(existing.split('\n').map(l => l.trim()).filter(Boolean));
    const toAdd = files.filter(f => !existingLines.has(f));

    if (!toAdd.length) {
      console.log(dim('  All files already in playlist.'));
      continue;
    }

    const content = existing.trimEnd() + (existing ? '\n' : '') + toAdd.join('\n') + '\n';
    await writeFile(dest, content, 'utf8');
    console.log(green(`  WROTE: ${name} (${toAdd.length} added)`));
  }

  data.toPlaylist = data.toPlaylist.map(() => []);
};

// ── Cut section ───────────────────────────────────────────────

const processCut = async (data) => {
  if (!data.toCut?.length) {
    console.log(dim('\n[cut] Nothing to cut.'));
    return;
  }

  console.log(bold(cyan('\n── Cut files ──')));
  for (const cut of data.toCut)
    console.log(`  ${cut.path}  ${dim(`[${cut.start}s - ${cut.end}s]`)}`);

  if (!(await confirm('Proceed?'))) return;

  const cutDir = resolve(baseDir, 'cuts');
  await ensureDir(cutDir);

  for (const cut of data.toCut) {
    const src = resolvePath(cut.path);
    if (!(await exists(src))) {
      console.log(yellow(`  SKIP (not found): ${cut.path}`));
      continue;
    }
    const ext = extname(cut.path);
    const base = basename(cut.path, ext);
    const dest = join(cutDir, `${base}_cut${ext}`);

    if (await exists(dest)) {
      if (!(await confirm(`  Overwrite ${dest}?`))) {
        console.log(yellow(`  SKIP: ${cut.path}`));
        continue;
      }
    }

    const duration = Math.abs(cut.end - cut.start);
    if (duration === 0) {
      console.log(yellow(`  SKIP (zero duration): ${cut.path}`));
      continue;
    }
    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-ss', String(Math.min(cut.start, cut.end)),
        '-i', src,
        '-t', String(duration),
        '-c', 'copy',
        dest,
      ]);
      console.log(green(`  CUT: ${cut.path} -> cuts/${basename(dest)}`));
    } catch (err) {
      console.error(red(`  FFMPEG ERROR on ${cut.path}: ${err.stderr || err.message}`));
    }
  }
  data.toCut = [];
};

// ── Main ──────────────────────────────────────────────────────

const main = async () => {
  if (!(await exists(savedPath))) {
    console.error(`File not found: ${savedPath}`);
    process.exit(1);
  }

  const raw = await readFile(savedPath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error(`Invalid JSON in ${savedPath}`);
    process.exit(1);
  }

  const snapshot = JSON.stringify(data);

  if (runAll || flags.cut)      await processCut(data);
  if (runAll || flags.save)     await processSave(data);
  if (runAll || flags.del)      await processDel(data);
  if (runAll || flags.playlist) await processPlaylist(data);

  const changed = JSON.stringify(data) !== snapshot;
  if (!changed) {
    console.log(dim('\nNo changes made.'));
    rl.close();
    return;
  }

  const isEmpty = !data.toDel?.length
    && !data.toSave?.length
    && !data.toCut?.length
    && (!data.toPlaylist || data.toPlaylist.every(p => !p.length));

  if (isEmpty) {
    await unlink(savedPath);
    console.log(dim('\nsaved.json empty — removed.'));
  } else {
    await writeFile(savedPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(green('\nsaved.json updated.'));
  }
  rl.close();
};

main().catch(err => {
  console.error(err);
  rl.close();
  process.exit(1);
});

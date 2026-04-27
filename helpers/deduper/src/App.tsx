import { Box, Text, useApp, useInput } from 'ink'
import React, { useEffect, useMemo, useState } from 'react'

import { findDuplicates, removeFile, type FcloneGroup } from './fclones'
import { formatBytes, pickKeeper } from './priority'

export type AppProps = {
  dirs: string[]
  passthrough: string[]
}

type Phase = 'loading' | 'browse' | 'confirming' | 'deleting' | 'done' | 'error'

type Selection = Record<number, Set<number>>

const initialSelection = (groups: FcloneGroup[], dirs: string[]): Selection => {
  const sel: Selection = {}
  groups.forEach((group, gi) => {
    const keeper = pickKeeper(group.files, dirs)
    sel[gi] = new Set(group.files.map((_, i) => i).filter((i) => i !== keeper))
  })
  return sel
}

const App = ({ dirs, passthrough }: AppProps) => {
  const { exit } = useApp()
  const [phase, setPhase] = useState<Phase>('loading')
  const [groups, setGroups] = useState<FcloneGroup[]>([])
  const [selection, setSelection] = useState<Selection>({})
  const [groupIdx, setGroupIdx] = useState(0)
  const [fileIdx, setFileIdx] = useState(0)
  const [error, setError] = useState<string>('')
  const [deletedCount, setDeletedCount] = useState(0)
  const [deletedBytes, setDeletedBytes] = useState(0)
  const [failures, setFailures] = useState<string[]>([])

  useEffect(() => {
    const run = async () => {
      try {
        const report = await findDuplicates(dirs, passthrough)
        setGroups(report.groups)
        setSelection(initialSelection(report.groups, dirs))
        setPhase(report.groups.length === 0 ? 'done' : 'browse')
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setPhase('error')
      }
    }
    void run()
  }, [dirs, passthrough])

  const stats = useMemo(() => {
    const totalGroups = groups.length
    const totalDupes = groups.reduce((acc, g) => acc + g.files.length - 1, 0)
    const wasted = groups.reduce((acc, g) => acc + g.file_len * (g.files.length - 1), 0)
    let willDelete = 0
    let willFree = 0
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      const set = selection[gi]
      if (!g || !set) continue
      willDelete += set.size
      willFree += g.file_len * set.size
    }
    return { totalGroups, totalDupes, wasted, willDelete, willFree }
  }, [groups, selection])

  const currentGroup = groups[groupIdx]

  useInput((input, key) => {
    if (phase === 'browse') {
      if (!currentGroup) return
      if (input === 'q' || key.escape) {
        exit()
        return
      }
      if (key.upArrow) {
        if (fileIdx > 0) {
          setFileIdx(fileIdx - 1)
        } else if (groupIdx > 0) {
          const prev = groups[groupIdx - 1]
          setGroupIdx(groupIdx - 1)
          setFileIdx(prev ? Math.max(0, prev.files.length - 1) : 0)
        }
        return
      }
      if (key.downArrow) {
        if (fileIdx < currentGroup.files.length - 1) {
          setFileIdx(fileIdx + 1)
        } else if (groupIdx < groups.length - 1) {
          setGroupIdx(groupIdx + 1)
          setFileIdx(0)
        }
        return
      }
      if (key.leftArrow || key.pageUp) {
        if (groupIdx > 0) {
          setGroupIdx(groupIdx - 1)
          setFileIdx(0)
        }
        return
      }
      if (key.rightArrow || key.pageDown) {
        if (groupIdx < groups.length - 1) {
          setGroupIdx(groupIdx + 1)
          setFileIdx(0)
        }
        return
      }
      if (input === ' ') {
        const set = new Set(selection[groupIdx] ?? [])
        if (set.has(fileIdx)) set.delete(fileIdx)
        else set.add(fileIdx)
        setSelection({ ...selection, [groupIdx]: set })
        return
      }
      if (input === 'a') {
        const keeper = pickKeeper(currentGroup.files, dirs)
        const set = new Set(currentGroup.files.map((_, i) => i).filter((i) => i !== keeper))
        setSelection({ ...selection, [groupIdx]: set })
        return
      }
      if (input === 'A') {
        setSelection(initialSelection(groups, dirs))
        return
      }
      if (input === 'n') {
        setSelection({ ...selection, [groupIdx]: new Set() })
        return
      }
      if (input === 'N') {
        const cleared: Selection = {}
        for (let i = 0; i < groups.length; i++) cleared[i] = new Set()
        setSelection(cleared)
        return
      }
      if (input === 'd' || key.return) {
        if (stats.willDelete > 0) setPhase('confirming')
        return
      }
    } else if (phase === 'confirming') {
      if (input === 'y' || input === 'Y') {
        setPhase('deleting')
        const run = async () => {
          let count = 0
          let bytes = 0
          const errs: string[] = []
          for (const [giStr, set] of Object.entries(selection)) {
            const gi = Number(giStr)
            const g = groups[gi]
            if (!g) continue
            for (const fi of set) {
              const path = g.files[fi]
              if (!path) continue
              try {
                await removeFile(path)
                count++
                bytes += g.file_len
                setDeletedCount(count)
                setDeletedBytes(bytes)
              } catch (e) {
                errs.push(`${path}: ${e instanceof Error ? e.message : String(e)}`)
              }
            }
          }
          setFailures(errs)
          setPhase('done')
        }
        void run()
        return
      }
      if (input === 'n' || input === 'N' || key.escape) {
        setPhase('browse')
        return
      }
    } else if (phase === 'error') {
      if (input === 'q' || key.return || key.escape) exit()
    }
  })

  useEffect(() => {
    if (phase === 'done') exit()
  }, [phase, exit])

  if (phase === 'loading') {
    return (
      <Box>
        <Text color="cyan">Scanning {dirs.length} dir(s) with fclones…</Text>
      </Box>
    )
  }

  if (phase === 'error') {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text dimColor>Press q to exit.</Text>
      </Box>
    )
  }

  if (phase === 'done') {
    return (
      <Box flexDirection="column">
        {groups.length === 0 ? (
          <Text color="green">No duplicates found.</Text>
        ) : (
          <>
            <Text color="green">Done.</Text>
            <Text>
              Removed {deletedCount} file(s), freed {formatBytes(deletedBytes)}.
            </Text>
            {failures.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Text color="red">{failures.length} failure(s):</Text>
                {failures.slice(0, 5).map((f, i) => (
                  <Text key={i} color="red" dimColor>
                    {f}
                  </Text>
                ))}
                {failures.length > 5 && <Text dimColor>… and {failures.length - 5} more</Text>}
              </Box>
            )}
          </>
        )}
      </Box>
    )
  }

  if (phase === 'deleting') {
    return (
      <Box flexDirection="column">
        <Text color="yellow">
          Deleting… {deletedCount}/{stats.willDelete} ({formatBytes(deletedBytes)})
        </Text>
      </Box>
    )
  }

  if (phase === 'confirming') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
        <Text color="yellow">
          Delete {stats.willDelete} file(s), freeing {formatBytes(stats.willFree)}?
        </Text>
        <Text dimColor>y = confirm · n/Esc = cancel</Text>
      </Box>
    )
  }

  if (!currentGroup) return null
  const sel = selection[groupIdx] ?? new Set<number>()
  const keeper = pickKeeper(currentGroup.files, dirs)

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column">
        <Text bold color="cyan">
          deduper
        </Text>
        <Text>
          {stats.totalGroups} group(s), {stats.totalDupes} extra file(s), {formatBytes(stats.wasted)} wasted
        </Text>
        <Text dimColor>
          Marked: {stats.willDelete} file(s) → {formatBytes(stats.willFree)} freeable
        </Text>
        <Text dimColor>Priority: {dirs.join(' > ')}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text>
          <Text color="magenta">
            [{groupIdx + 1}/{groups.length}]
          </Text>{' '}
          <Text bold>{formatBytes(currentGroup.file_len)}</Text>{' '}
          <Text dimColor>· {currentGroup.files.length} copies</Text>{' '}
          <Text dimColor>· {currentGroup.file_hash.slice(0, 12)}</Text>
        </Text>
        {currentGroup.files.map((path, i) => {
          const marked = sel.has(i)
          const isPriority = i === keeper
          const cursor = i === fileIdx ? '>' : ' '
          const box = marked ? '[x]' : '[ ]'
          const tag = marked ? 'DROP ' : isPriority ? 'KEEP*' : 'KEEP '
          const color = marked ? 'red' : isPriority ? 'green' : undefined
          return (
            <Text key={i} color={color}>
              {cursor} {box} <Text dimColor>{tag}</Text> {path}
            </Text>
          )
        })}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>↑↓ move · ←→ group · space toggle · a auto-mark · n clear · A/N all-groups</Text>
        <Text dimColor>d/⏎ delete marked · q quit</Text>
      </Box>
    </Box>
  )
}

export default App

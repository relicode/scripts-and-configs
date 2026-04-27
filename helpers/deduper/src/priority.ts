export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(2)} ${units[i]}`
}

export const matchesDir = (filePath: string, dir: string): boolean => {
  const normFile = filePath.replace(/\/+$/, '')
  const normDir = dir.replace(/\/+$/, '')
  return normFile === normDir || normFile.startsWith(normDir + '/')
}

export const priorityScore = (filePath: string, dirs: string[]): number => {
  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i]
    if (dir !== undefined && matchesDir(filePath, dir)) return i
  }
  return dirs.length
}

export const pickKeeper = (files: string[], dirs: string[]): number => {
  let bestIdx = 0
  let bestScore = Number.POSITIVE_INFINITY
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (f === undefined) continue
    const s = priorityScore(f, dirs)
    if (s < bestScore) {
      bestScore = s
      bestIdx = i
    }
  }
  return bestIdx
}

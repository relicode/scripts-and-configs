import { $ } from 'bun'

export type FcloneGroup = {
  file_len: number
  file_hash: string
  files: string[]
}

export type FcloneStats = {
  group_count: number
  total_file_count: number
  total_file_size: number
  redundant_file_count: number
  redundant_file_size: number
  missing_file_count: number
  missing_file_size: number
}

export type FcloneReport = {
  header: { stats: FcloneStats; [k: string]: unknown }
  groups: FcloneGroup[]
}

export const findDuplicates = async (dirs: string[], passthrough: string[] = []): Promise<FcloneReport> => {
  const result = await $`fclones group --format json ${dirs} ${passthrough}`.nothrow().quiet()
  if (result.exitCode !== 0) {
    throw new Error(`fclones exited ${result.exitCode}: ${result.stderr.toString().trim()}`)
  }
  const text = result.stdout.toString().trim()
  if (!text) {
    return {
      header: {
        stats: {
          group_count: 0,
          total_file_count: 0,
          total_file_size: 0,
          redundant_file_count: 0,
          redundant_file_size: 0,
          missing_file_count: 0,
          missing_file_size: 0,
        },
      },
      groups: [],
    }
  }
  return JSON.parse(text) as FcloneReport
}

export const removeFile = async (path: string): Promise<void> => {
  const result = await $`rm ${path}`.nothrow().quiet()
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString().trim() || `rm exited ${result.exitCode}`)
  }
}

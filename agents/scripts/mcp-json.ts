// Reads .mcp.json files, and edits a project's for install.ts. An edit touches only the mcpServers
// entries that change, so other servers, key order, spacing and line endings stay as they are.

type Member = { key: string; start: number; valueStart: number; valueEnd: number }

// An object's braces and members, as offsets into the text.
type ObjectSpan = { open: number; close: number; members: Member[] }

// The file's own conventions, for the entries an edit writes.
type FileLayout = { eol: string; unit: string; isCompact: boolean }

// How an object holds its members: lead and trail are the whitespace inside its braces.
type ObjectLayout = { isExpanded: boolean; indent: string; separator: string; lead: string; trail: string }

// Replaces start to end with text; an insertion has start equal to end.
type Edit = { start: number; end: number; text: string }

// Servers by name: a definition adds or replaces one, undefined removes it.
export type ServerChanges = ReadonlyMap<string, unknown>

const SERVERS_KEY = 'mcpServers'

const WHITESPACE = new Set([' ', '\t', '\n', '\r'])
const VALUE_ENDS = new Set([',', '}', ']', ...WHITESPACE])
const QUOTE = '"'
const BACKSLASH = '\\'
const OPENERS = new Set(['{', '['])
const CLOSERS = new Set(['}', ']'])
const CRLF = '\r\n'
const LF = '\n'
const DEFAULT_INDENT = '  '
const COMPACT_SEPARATOR = ', '
const LEADING_INDENT_PATTERN = /^[ \t]*/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseJson = (text: string): { value: unknown } | undefined => {
  try {
    return { value: JSON.parse(text) }
  } catch {
    return undefined
  }
}

const skipWhitespace = (text: string, start: number) => {
  let index = start
  while (WHITESPACE.has(text.charAt(index))) index++
  return index
}

// From an opening quote to just past the closing one.
const skipString = (text: string, start: number) => {
  let index = start + 1
  while (text.charAt(index) !== QUOTE) index += text.charAt(index) === BACKSLASH ? 2 : 1
  return index + 1
}

const skipContainer = (text: string, start: number) => {
  let depth = 0
  let index = start
  do {
    const char = text.charAt(index)
    if (char === QUOTE) {
      index = skipString(text, index)
      continue
    }
    if (OPENERS.has(char)) depth++
    if (CLOSERS.has(char)) depth--
    index++
  } while (depth > 0)
  return index
}

// From the first character of a value to just past its last. The text has parsed as JSON already.
const skipValue = (text: string, start: number) => {
  const first = text.charAt(start)
  if (first === QUOTE) return skipString(text, start)
  if (OPENERS.has(first)) return skipContainer(text, start)
  let index = start
  while (index < text.length && !VALUE_ENDS.has(text.charAt(index))) index++
  return index
}

const scanObject = (text: string, open: number): ObjectSpan => {
  const members: Member[] = []
  let index = skipWhitespace(text, open + 1)
  while (text.charAt(index) === QUOTE) {
    const keyEnd = skipString(text, index)
    const valueStart = skipWhitespace(text, skipWhitespace(text, keyEnd) + 1)
    const valueEnd = skipValue(text, valueStart)
    members.push({ key: String(JSON.parse(text.slice(index, keyEnd))), start: index, valueStart, valueEnd })
    index = skipWhitespace(text, valueEnd)
    if (text.charAt(index) === ',') index = skipWhitespace(text, index + 1)
  }
  return { open, close: index, members }
}

const scanRoot = (text: string) => scanObject(text, skipWhitespace(text, 0))

const findServersSpan = (text: string, root: ObjectSpan) => {
  const member = root.members.find(({ key }) => key === SERVERS_KEY)
  return member === undefined ? undefined : scanObject(text, member.valueStart)
}

const hasDuplicateKeys = ({ members }: ObjectSpan) => new Set(members.map(({ key }) => key)).size < members.length

// The servers in .mcp.json, or why the installer can't merge into it. JSON.parse keeps the last of
// two equal keys, so a duplicate mcpServers or server name would leave the edit guessing.
export const parseMcpJson = (text: string): { servers?: Record<string, unknown>; problem?: string } => {
  const parsed = parseJson(text)
  if (parsed === undefined) return { problem: "isn't valid JSON" }
  if (!isRecord(parsed.value)) return { problem: "isn't a JSON object" }
  const servers = Object.hasOwn(parsed.value, SERVERS_KEY) ? parsed.value[SERVERS_KEY] : {}
  if (!isRecord(servers)) return { problem: `has an ${SERVERS_KEY} that isn't an object` }
  const duplicateProblem = { problem: `has a key twice, at its top level or in ${SERVERS_KEY}` }
  // Checked first, since with two mcpServers keys the first one may not be an object to scan.
  const root = scanRoot(text)
  if (hasDuplicateKeys(root)) return duplicateProblem
  const serversSpan = findServersSpan(text, root)
  return serversSpan !== undefined && hasDuplicateKeys(serversSpan) ? duplicateProblem : { servers }
}

const findLineIndent = (text: string, position: number) => {
  const lineStart = text.lastIndexOf(LF, position - 1) + 1
  return text.slice(lineStart, position).match(LEADING_INDENT_PATTERN)?.[0] ?? ''
}

// An empty file or object has no conventions to keep, so it gets two-space indentation.
const findFileLayout = (text: string, root: ObjectSpan): FileLayout => {
  const first = root.members[0]
  const isCompact = first !== undefined && !text.slice(root.open, first.start).includes(LF)
  const unit = first === undefined || isCompact ? '' : findLineIndent(text, first.start)
  return { eol: text.includes(CRLF) ? CRLF : LF, unit: unit === '' ? DEFAULT_INDENT : unit, isCompact }
}

const findObjectLayout = (text: string, span: ObjectSpan, file: FileLayout): ObjectLayout => {
  const [first, second] = span.members
  const last = span.members.at(-1)
  if (first === undefined || last === undefined) {
    const outer = findLineIndent(text, span.open)
    const indent = `${outer}${file.unit}`
    const isExpanded = !file.isCompact
    const separator = isExpanded ? `,${file.eol}${indent}` : COMPACT_SEPARATOR
    return isExpanded
      ? { isExpanded, indent, separator, lead: `${file.eol}${indent}`, trail: `${file.eol}${outer}` }
      : { isExpanded, indent, separator, lead: '', trail: '' }
  }
  const isExpanded = text.slice(span.open, first.start).includes(LF)
  const indent = findLineIndent(text, first.start)
  const defaultSeparator = isExpanded ? `,${file.eol}${indent}` : COMPACT_SEPARATOR
  return {
    isExpanded,
    indent,
    separator: second === undefined ? defaultSeparator : text.slice(first.valueEnd, second.start),
    lead: text.slice(span.open + 1, first.start),
    trail: text.slice(last.valueEnd, span.close),
  }
}

const formatValue = (value: unknown, isExpanded: boolean, indent: string, file: FileLayout) =>
  isExpanded
    ? JSON.stringify(value, undefined, file.unit).replaceAll(LF, `${file.eol}${indent}`)
    : JSON.stringify(value)

const formatMember = (key: string, value: unknown, isExpanded: boolean, indent: string, file: FileLayout) =>
  `${JSON.stringify(key)}: ${formatValue(value, isExpanded, indent, file)}`

const isRemoved = ({ key }: Member, changes: ServerChanges) => changes.has(key) && changes.get(key) === undefined

// Edits don't overlap; an insertion sorts before a removal that starts where it does.
const applyEdits = (text: string, edits: readonly Edit[]) => {
  const sorted = edits.toSorted((first, second) => first.start - second.start || first.end - second.end)
  const resumeAt = [0, ...sorted.map(({ end }) => end)]
  const pieces = sorted.map((edit, index) => `${text.slice(resumeAt[index], edit.start)}${edit.text}`)
  return `${pieces.join('')}${text.slice(resumeAt.at(-1))}`
}

// A replaced value keeps the old one's shape: on several lines if it had them, else on one.
const replaceValues = (text: string, kept: readonly Member[], changes: ServerChanges, file: FileLayout) =>
  kept.flatMap((member): Edit[] => {
    const value = changes.get(member.key)
    if (value === undefined) return []
    const wasExpanded = text.slice(member.valueStart, member.valueEnd).includes(LF)
    const replacement = formatValue(value, wasExpanded, findLineIndent(text, member.start), file)
    return [{ start: member.valueStart, end: member.valueEnd, text: replacement }]
  })

// A run of removed members goes with the separator after it, or at the end of the object with the
// one before it. Some member is always kept here, so one of the two exists.
const removeRuns = (members: readonly Member[], changes: ServerChanges) =>
  members.flatMap((member, index): Edit[] => {
    const previous = members[index - 1]
    if (!isRemoved(member, changes) || (previous !== undefined && isRemoved(previous, changes))) return []
    const next = members.slice(index + 1).find((other) => !isRemoved(other, changes))
    if (next !== undefined) return [{ start: member.start, end: next.start, text: '' }]
    const last = members.at(-1)
    return previous === undefined || last === undefined
      ? []
      : [{ start: previous.valueEnd, end: last.valueEnd, text: '' }]
  })

// New members go after the last kept one, spaced like the members before it and shaped like its value:
// on several lines, or on one as in a file that keeps each server on a line of its own.
const insertMembers = (
  text: string,
  span: ObjectSpan,
  kept: readonly Member[],
  added: readonly [string, unknown][],
  file: FileLayout
) => {
  const anchor = kept.at(-1)
  if (anchor === undefined || added.length === 0) return []
  const index = span.members.indexOf(anchor)
  const [before, after] = index > 0 ? [span.members[index - 1], anchor] : [span.members[0], span.members[1]]
  const indent = findLineIndent(text, anchor.start)
  const isObjectExpanded = text.slice(span.open, span.members[0]?.start).includes(LF)
  const defaultSeparator = isObjectExpanded ? `,${file.eol}${indent}` : COMPACT_SEPARATOR
  const separator = before && after ? text.slice(before.valueEnd, after.start) : defaultSeparator
  const isExpanded = text.slice(anchor.valueStart, anchor.valueEnd).includes(LF)
  const inserted = added.map(([key, value]) => `${separator}${formatMember(key, value, isExpanded, indent, file)}`)
  return [{ start: anchor.valueEnd, end: anchor.valueEnd, text: inserted.join('') }]
}

// With nothing kept there's no spacing between members to keep, only the whitespace inside the braces.
const rebuildObject = (text: string, span: ObjectSpan, added: readonly [string, unknown][], file: FileLayout) => {
  if (added.length === 0) return { start: span.open, end: span.close + 1, text: '{}' }
  const layout = findObjectLayout(text, span, file)
  const members = added.map(([key, value]) => formatMember(key, value, layout.isExpanded, layout.indent, file))
  return {
    start: span.open,
    end: span.close + 1,
    text: `{${layout.lead}${members.join(layout.separator)}${layout.trail}}`,
  }
}

// Kept members stay byte for byte: only changed values, removed members and new ones are touched.
const editObject = (text: string, span: ObjectSpan, changes: ServerChanges, file: FileLayout): Edit[] => {
  const keys = new Set(span.members.map(({ key }) => key))
  const kept = span.members.filter((member) => !isRemoved(member, changes))
  const added = [...changes].filter(([key, value]) => value !== undefined && !keys.has(key))
  if (kept.length === 0) return [rebuildObject(text, span, added, file)]
  return [
    ...replaceValues(text, kept, changes, file),
    ...removeRuns(span.members, changes),
    ...insertMembers(text, span, kept, added, file),
  ]
}

// The new text for a .mcp.json that parseMcpJson accepted, or for a new one when text is undefined.
export const editMcpJson = (text: string | undefined, changes: ServerChanges) => {
  const added = Object.fromEntries([...changes].filter(([, server]) => server !== undefined))
  if (text === undefined) return `${JSON.stringify({ [SERVERS_KEY]: added }, undefined, DEFAULT_INDENT)}${LF}`
  const root = scanRoot(text)
  const file = findFileLayout(text, root)
  const servers = findServersSpan(text, root)
  if (servers !== undefined) return applyEdits(text, editObject(text, servers, changes, file))
  if (Object.keys(added).length === 0) return text
  return applyEdits(text, editObject(text, root, new Map([[SERVERS_KEY, added]]), file))
}

export const progressBar = (done: number, total: number, width = 16): string => {
  const filled = total === 0 ? 0 : Math.round((width * done) / total)

  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

// Relative age in the shortest unit that reads naturally.
export const ago = (fromMs: number, nowMs: number): string => {
  const seconds = Math.max(0, Math.round((nowMs - fromMs) / 1000))

  if (seconds < 60) {
    return 'now'
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)

  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`
}

// Task and question texts are single lines everywhere: pasted newlines would break rows.
export const oneLine = (text: string, max = 200): string => {
  const flat = text.replace(/\s+/g, ' ').trim()

  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

export const rule = (columns: number): string => '─'.repeat(Math.max(8, Math.min(columns - 4, 64)))

// A long task becomes a short title plus the full text as its detail, so rows stay one line.
export const brief = (text: string, max = 70): { text: string; detail?: string } => {
  const flat = text.replace(/\s+/g, ' ').trim()

  if (flat.length <= max) {
    return { text: flat }
  }

  const cut = flat.slice(0, max)
  const at = cut.lastIndexOf(' ')

  return { text: `${(at > max / 2 ? cut.slice(0, at) : cut).replace(/[,;:\s]+$/, '')}…`, detail: flat }
}

// The last folder of a path: the project's name.
export const baseName = (path: string): string => path.split('/').filter(Boolean).pop() ?? path

// A text in quotes, cut for a one-line report.
export const quoted = (text: string): string => `"${text.length > 80 ? `${text.slice(0, 79)}…` : text}"`

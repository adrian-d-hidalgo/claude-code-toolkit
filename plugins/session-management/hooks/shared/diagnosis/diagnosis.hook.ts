// One thing a doctor looked at and the problems it found there (none: the check passed).
export type Check = { label: string; lines: string[] }

// What a doctor reports: a line per problem, the checks that were made, and the data with the safe
// repairs applied.
export type Diagnosis<T> = { lines: string[]; fixed: T[]; vague?: string[]; checks: Check[] }

export const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`

// The report body: a header, a summary line, then one line per check, `✓` when it passed and a `✗`
// line per problem otherwise. `extra` problems (found outside the diagnosis) come first.
export const formatChecks = (header: string, summary: string, checks: readonly Check[], extra: readonly string[] = []): string[] => {
  const problems = checks.flatMap(check => check.lines)
  const body = [...extra.map(line => `✗ ${line}`), ...checks.flatMap(check => (check.lines.length === 0 ? [`✓ ${check.label}`] : check.lines.map(line => `✗ ${line}`)))]

  return [header, summary, ...body, ...(problems.length === 0 && extra.length === 0 ? ['Everything checks out.'] : [])]
}

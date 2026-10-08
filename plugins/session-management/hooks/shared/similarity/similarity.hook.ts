const STOP = new Set([
  'the', 'and', 'for', 'you', 'your', 'are', 'was', 'with', 'that', 'this', 'which', 'what', 'would', 'should', 'could', 'want', 'like', 'how', 'any', 'can', 'will', 'shall', 'does', 'did', 'have', 'has',
  'que', 'los', 'las', 'del', 'una', 'uno', 'por', 'para', 'con', 'como', 'cual', 'cuales', 'quieres', 'prefieres', 'debemos', 'deberia', 'hacemos', 'tienes', 'puedes', 'sera', 'nos', 'les', 'sus', 'mas', 'muy', 'esto', 'eso', 'esta', 'este', 'ese',
])

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(word => word.length >= 3)

// Crude stems (first five letters) fold plural and verb endings in both languages.
// A question made only of filler words ("¿Cuál prefieres?") keeps them.
const tokens = (text: string): Set<string> => {
  const all = words(text)
  const content = all.filter(word => !STOP.has(word))

  return new Set((content.length > 0 ? content : all).map(word => word.slice(0, 5)))
}

// Two questions are the same when their content words overlap: near-identical sets for
// short ones, strong containment for longer ones. Different wording is the point.
export const sameQuestion = (a: string, b: string): boolean => {
  const first = tokens(a)
  const second = tokens(b)
  const shared = [...first].filter(word => second.has(word)).length
  const smaller = Math.min(first.size, second.size)

  if (smaller === 0) {
    return a.trim().toLowerCase() === b.trim().toLowerCase()
  }

  const jaccard = shared / (first.size + second.size - shared)

  if (smaller < 3) {
    return jaccard >= 0.8 || (shared === smaller && smaller >= 2 && jaccard >= 0.6)
  }

  return shared / smaller >= 0.7 && jaccard >= 0.4
}

// Two tasks are the same when they say the same thing in nearly the same words. Stricter than
// sameQuestion on purpose: a wrongly dropped task is lost work, while a repeat that slips through
// is left to the model's verdict. Equal content words, one extra word on one side, or (for long
// texts only) one differing word on each side.
export const sameTask = (a: string, b: string): boolean => {
  const first = tokens(a)
  const second = tokens(b)

  if (first.size === 0 || second.size === 0) {
    return a.trim().toLowerCase() === b.trim().toLowerCase()
  }

  const shared = [...first].filter(word => second.has(word)).length
  const onlyFirst = first.size - shared
  const onlySecond = second.size - shared
  const smaller = Math.min(first.size, second.size)

  if (onlyFirst === 0 && onlySecond === 0) {
    return true
  }

  if ((onlyFirst === 0 || onlySecond === 0) && onlyFirst + onlySecond <= 1) {
    return smaller >= 2
  }

  return smaller >= 6 && onlyFirst <= 1 && onlySecond <= 1
}

// A new group repeats a known one when at least half of its questions do.
export const sameGroup = (incoming: readonly string[], known: readonly string[]): boolean =>
  incoming.length > 0 &&
  incoming.filter(text => known.some(other => sameQuestion(text, other))).length * 2 >= incoming.length

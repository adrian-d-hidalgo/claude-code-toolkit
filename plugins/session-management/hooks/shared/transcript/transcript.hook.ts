// A message of the conversation as the scans read it.
export type ScanMessage = {
  role: 'user' | 'assistant'
  text: string
  toolUses: ReadonlyArray<{ tool: string; input: Record<string, unknown>; result?: unknown }>
}

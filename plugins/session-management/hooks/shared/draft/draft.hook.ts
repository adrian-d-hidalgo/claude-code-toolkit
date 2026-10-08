// The engine's text field is one row: a long or multi-line text is cut at its end. While typing, the
// pane also draws the whole text under the field, but only when the field alone would hide part of it.
export const needsPreview = (text: string, columns: number): boolean => text.includes('\n') || text.length > Math.max(10, columns - 14)

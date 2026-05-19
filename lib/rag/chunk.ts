/**
 * Splits a markdown document into overlapping chunks of ~500 chars.
 * Preserves paragraph boundaries where possible.
 */
export function chunkText(
  text: string,
  maxChunkChars = 500,
  overlapChars = 80,
): string[] {
  // Split on double newlines (paragraph boundaries)
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;

    if (candidate.length <= maxChunkChars) {
      current = candidate;
    } else {
      // Flush current chunk if it has content
      if (current.trim()) {
        chunks.push(current.trim());
        // Carry over the tail for overlap
        const tail = current.slice(-overlapChars);
        current = `${tail}\n\n${para}`;
      } else {
        // Single paragraph larger than chunk limit — split by sentence
        const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para];
        for (const sentence of sentences) {
          const sc = current ? `${current} ${sentence}` : sentence;
          if (sc.length <= maxChunkChars) {
            current = sc;
          } else {
            if (current.trim()) chunks.push(current.trim());
            current = sentence;
          }
        }
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

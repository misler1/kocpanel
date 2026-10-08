export function chunkArray<T>(items: T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function fetchChunkedByIds<T>(
  ids: string[],
  fetchChunk: (chunk: string[]) => PromiseLike<{ data: T[] | null; error?: unknown }>,
  size = 100
): Promise<T[]> {
  const rows: T[] = [];
  for (const chunk of chunkArray(ids, size)) {
    const { data, error } = await fetchChunk(chunk);
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  return rows;
}

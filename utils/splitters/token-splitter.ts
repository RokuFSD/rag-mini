import { TokenTextSplitter } from "llamaindex";

/**
 * Creates a TokenTextSplitter instance with the specified chunk size and overlap.
 *
 * @param chunkSize - The maximum number of tokens per chunk.
 * @param chunkOverlap - The number of tokens to overlap between chunks.
 * @returns A configured TokenTextSplitter instance.
 */
export function getTokenSplitter(
  chunkSize: number,
  chunkOverlap: number,
): TokenTextSplitter {
  return new TokenTextSplitter({
    chunkSize,
    chunkOverlap,
  });
}

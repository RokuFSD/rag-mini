import { TokenTextSplitter } from "llamaindex";

export function getTokenSplitter(
  chunkSize: number,
  chunkOverlap: number,
): TokenTextSplitter {
  return new TokenTextSplitter({
    chunkSize,
    chunkOverlap,
  });
}

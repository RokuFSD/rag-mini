import type { Metadata, BaseNode } from "@llamaindex/core/schema";

export interface Embedding {
  id: string;
  text: string;
  embedding: number[];
  metadata: BaseNode<Metadata>["metadata"];
}

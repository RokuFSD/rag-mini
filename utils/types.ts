import type { BaseNode, Metadata } from "../lib/llamaindex";

export interface Embedding {
  id: string;
  text: string;
  embedding: number[];
  metadata: BaseNode<Metadata>["metadata"];
}

import type { Embedding } from "../../utils/types";
import { storeEmbeddings } from "../db/db";
import type { DocsLoader } from "../../utils/docs-loader/interface";
import {
  MarkdownNodeParser,
  type Metadata,
  type TextNode,
} from "../../lib/llamaindex";
import { splitMd } from "../../utils/splitters/md-splitter";

const OLLAMA_API = "http://localhost:11434/api/embeddings";

export async function embed(text: string) {
  const res = await fetch(OLLAMA_API, {
    method: "POST",
    body: JSON.stringify({
      model: "bge-m3",
      prompt: text,
    }),
  });
  const data = await res.json();

  return data.embedding as number[];
}

export async function embedNodes(
  nodes: TextNode<Metadata>[],
): Promise<Embedding[]> {
  const BATCH_SIZE = 8;
  const embeddings: number[][] = [];

  for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
    const batch = nodes.slice(i, i + BATCH_SIZE);
    const batchTexts = batch.map((node) => node.text);
    const batchEmbeddings = batchTexts.map((text) => embed(text));
    const results = await Promise.all(batchEmbeddings);
    embeddings.push(...results);
  }

  return nodes.map((node, i) => ({
    id: node.id_,
    text: node.text,
    embedding: embeddings[i],
    metadata: node.metadata,
  }));
}

export async function ingestDocuments(
  collectionName: string,
  loader: DocsLoader,
) {
  const ids = await loader.getDocsFiles();
  const parser = new MarkdownNodeParser();
  const nodesList = await Promise.all(
    ids.map(async (id) => {
      const fileContent = await loader.getDocsContent(id);
      return splitMd(parser, fileContent);
    }),
  );
  const embeddings = await embedNodes(nodesList.flat());
  await storeEmbeddings(embeddings, collectionName);
}

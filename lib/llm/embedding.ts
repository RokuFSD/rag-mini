import type { TextNode, Metadata } from "@llamaindex/core/schema";
import type { Embedding } from "../../utils/types";
import { getDocsFiles, getFileContent } from "../../utils/docs-loader";
import { MarkdownNodeParser } from "@llamaindex/core/node-parser";
import { Document } from "@llamaindex/core/schema";
import { storeEmbeddings } from "../db/db";

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
  const requests = nodes.map(async (node, i) => {
    const embedding = await embed(node.text);
    console.log(`Embedding n${i + 1} ready, length:`, embedding.length);
    return {
      id: node.id_,
      text: node.text,
      embedding,
      metadata: node.metadata,
    };
  });

  console.log("Total embeddings to process:", requests.length);

  const embeddings = await Promise.all(requests);
  return embeddings;
}

export async function ingestDocuments(collectionName: string) {
  const files = await getDocsFiles();
  const parser = new MarkdownNodeParser();
  const nodesList = await Promise.all(
    files.map(async (file) => {
      const fileContent = await getFileContent(file);
      const document = new Document({ text: fileContent });
      return parser.getNodesFromDocuments([document]);
    }),
  );
  const embeddings = await embedNodes(nodesList.flat());
  await storeEmbeddings(embeddings, collectionName);
}

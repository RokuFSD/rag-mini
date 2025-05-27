import { Settings } from "llamaindex";
import { NotionDocsLoader } from "../utils/docs-loader/notion-loader";
import { Client } from "@notionhq/client";
import { OllamaEmbedding } from "@llamaindex/ollama";

import { QdrantVectorStore } from "@llamaindex/qdrant";
import {
  IngestionPipeline,
  MarkdownNodeParser,
  TitleExtractor,
} from "llamaindex";

// import { getTokenSplitter } from "../utils/splitters/token-splitter";
import { client } from "../lib/db/client";

const notionClient = new Client({
  auth: process.env.NOTION_TOKEN,
});

const collectionName = "notion_docs_bge--recursive" as const;
// const collectionName = "notion_docs_bge--md" as const;
const docsLoader = new NotionDocsLoader(notionClient);

const embedModel = new OllamaEmbedding({
  model: "bge-m3",
});

const vectorStore = new QdrantVectorStore({
  client,
  collectionName,
  embeddingModel: embedModel,
});

const pipeline = new IngestionPipeline({
  reader: docsLoader.getReader(),
  transformations: [
    // getTokenSplitter(512, 50),
    new MarkdownNodeParser(),
    new TitleExtractor(),
    embedModel,
  ],
  vectorStore,
});

async function main() {
  const docsId = await docsLoader.getDocsFiles();
  const files = await Promise.all(
    docsId.map((id) => docsLoader.getDocsContent(id)),
  );
  const docs = files.flat();

  await pipeline.run({
    documents: docs,
  });
  process.exit(0);
}

main();

import { Settings, VectorStoreIndex } from "llamaindex";
import { NotionDocsLoader } from "../utils/docs-loader/notion-loader";
import { Client } from "@notionhq/client";
import { OllamaEmbedding, ollama } from "@llamaindex/ollama";

import { QdrantVectorStore } from "@llamaindex/qdrant";
// import {
//   IngestionPipeline,
//   MarkdownNodeParser,
//   TitleExtractor,
// } from "llamaindex";

// import { getTokenSplitter } from "../utils/splitters/token-splitter";
import { client } from "../lib/db/client";
import { storageContextFromDefaults } from "llamaindex/storage";

const notionClient = new Client({
  auth: process.env.NOTION_TOKEN,
});

const collectionName = "notion_docs_bge--recursive" as const;
// const collectionName = "notion_docs_bge--md" as const;
const docsLoader = new NotionDocsLoader(notionClient);

const embedModel = new OllamaEmbedding({
  model: "bge-m3",
});

Settings.embedModel = embedModel;
Settings.llm = ollama({
  model: "deepseek-r1:1.5b",
  options: {
    temperature: 0.1,
  },
});

const vectorStore = new QdrantVectorStore({
  client,
  collectionName,
  embeddingModel: embedModel,
});

// const pipeline = new IngestionPipeline({
//   transformations: [
//     // getTokenSplitter(512, 50),
//     new MarkdownNodeParser(),
//     new TitleExtractor(),
//     embedModel,
//   ],
//   vectorStore,
// });

async function main() {
  const docsId = await docsLoader.getDocsFiles();
  const files = await Promise.all(
    docsId.map((id) => docsLoader.getDocsContent(id)),
  );
  const docs = files.flat();
  const storageContext = await storageContextFromDefaults({
    vectorStore,
  });

  console.log("being stored?");
  await VectorStoreIndex.fromDocuments(docs, {
    storageContext,
  });
  console.log("finished?");

  process.exit(0);
}

main();

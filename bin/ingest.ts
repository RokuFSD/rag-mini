import { ingestDocuments } from "../lib/llm/embedding";
import { NotionDocsLoader } from "../utils/docs-loader/notion-loader";
import { Client } from "@notionhq/client";

const client = new Client({
  auth: process.env.NOTION_TOKEN,
});

const collectionName = "notion_docs_bge" as const;
const docsLoader = new NotionDocsLoader(client);

async function main() {
  await ingestDocuments(collectionName, docsLoader);
  process.exit(0);
}

main();

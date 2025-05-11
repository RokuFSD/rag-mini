#!/usr/bin/env node
import { ingestDocuments } from "./lib/llm/embedding";
import { query } from "./lib/llm/query";
import readline from "node:readline";

const command = process.argv[2];
const collectionName = "notion_docs_bge" as const;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  if (command === "ingest") {
    await ingestDocuments(collectionName);
    process.exit(0);
  } else if (command === "query") {
    rl.question("Prompt: ", async (text) => {
      await query(text, collectionName);
      process.exit(0);
    });
  }
}

main();
